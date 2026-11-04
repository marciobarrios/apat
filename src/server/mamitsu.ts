import { z } from "zod";
import { ExtractedRecipe, mamitsuPrompt, mamitsuRecipeSchema, toRecipe } from "./mamitsu-contract";
import { canonicalizeRecipeSource } from "../lib/import-contract";
import { AccessError } from "./errors";

const Policy = z.object({
  MAMITSU_IMPORTS_ENABLED: z.literal("true"),
  MAMITSU_API_KEY: z.string().min(1),
  MAMITSU_TOTAL_CREDITS: z.coerce.number().int().min(1).max(100000),
  MAMITSU_OWNER_CREDITS: z.coerce.number().int().min(1).max(100000),
});
export function readImportPolicy(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const parsed = Policy.safeParse(env);
  if (!parsed.success) throw new AccessError("imports_not_configured", 503);
  return {
    apiKey: parsed.data.MAMITSU_API_KEY,
    totalCredits: parsed.data.MAMITSU_TOTAL_CREDITS,
    ownerCredits: parsed.data.MAMITSU_OWNER_CREDITS,
  };
}
export type ImportPolicy = ReturnType<typeof readImportPolicy>;
export class MamitsuFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly free: boolean,
    public readonly extractionId: string | null = null,
  ) {
    super(code);
  }
}
const freeErrors = new Set([
  "unauthorized",
  "insufficient_credits",
  "account_not_enabled",
  "invalid_request",
  "invalid_schema",
  "payload_too_large",
  "unsupported_url",
  "url_source_inaccessible",
  "url_source_over_limit",
  "url_source_rate_limited",
  "url_video_too_large",
  "url_video_too_long",
]);
const ErrorEnvelope = z.object({
  extraction_id: z.string().max(100).optional(),
  error: z.object({ code: z.string() }),
});
const SuccessEnvelope = z.object({
  extraction_id: z.string().min(1).max(100),
  data: ExtractedRecipe,
  source: z.object({ provider: z.enum(["instagram", "youtube"]), url: z.string() }),
});

export async function extractWithMamitsu(
  sourceUrl: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
) {
  const source = canonicalizeRecipeSource(sourceUrl);
  let extractionId: string | null = null;
  try {
    // Exactly one provider attempt. No SDK, gateway or transport retries.
    const response = await fetcher("https://usemamitsu.com/api/v1/extract", {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(95000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: source.url, prompt: mamitsuPrompt, schema: mamitsuRecipeSchema }),
    });
    const trace = z.string().min(1).max(100).safeParse(response.headers.get("x-extraction-id"));
    if (trace.success) extractionId = trace.data;
    const reader = response.body?.getReader();
    if (!reader) throw new MamitsuFailure("outcome_unknown", false, extractionId);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512 * 1024) {
          await reader.cancel();
          throw new MamitsuFailure("invalid_extraction", false, extractionId);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!response.ok) {
      const error = ErrorEnvelope.safeParse(body);
      if (!error.success) throw new MamitsuFailure("outcome_unknown", false, extractionId);
      const code = error.data.error.code;
      throw new MamitsuFailure(
        freeErrors.has(code) || ["invalid_extraction", "extraction_failed"].includes(code)
          ? code
          : "outcome_unknown",
        freeErrors.has(code),
        error.data.extraction_id ?? extractionId,
      );
    }
    const parsed = SuccessEnvelope.safeParse(body);
    if (!parsed.success) throw new MamitsuFailure("invalid_extraction", false, extractionId);
    const result = parsed.data;
    extractionId = result.extraction_id;
    if (
      result.source.provider !== source.provider ||
      canonicalizeRecipeSource(result.source.url).url !== source.url
    )
      throw new MamitsuFailure("invalid_extraction", false, result.extraction_id);
    if (!result.data.ingredients.length || !result.data.steps.length)
      throw new MamitsuFailure("not_a_recipe", false, result.extraction_id);
    const recipe = toRecipe(result.data, source.url, source.provider, result.extraction_id);
    if (Buffer.byteLength(JSON.stringify(recipe)) > 200 * 1024)
      throw new MamitsuFailure("invalid_extraction", false, result.extraction_id);
    return { recipe, extractionId: result.extraction_id };
  } catch (error) {
    if (error instanceof MamitsuFailure) throw error;
    // Do not leak provider errors, source contents, URLs or credentials into logs.
    throw new MamitsuFailure("outcome_unknown", false, extractionId);
  }
}
