import { z } from "zod";
import { Recipe } from "./recipe";

export function canonicalizeRecipeSource(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    throw new Error("unsupported_url");
  const host = url.hostname.toLowerCase();
  if (["instagram.com", "www.instagram.com", "m.instagram.com"].includes(host)) {
    const match = /^\/(?:reel|reels|tv)\/([A-Za-z0-9_-]{5,64})\/?$/.exec(url.pathname);
    if (match)
      return {
        provider: "instagram" as const,
        url: `https://www.instagram.com/reel/${match[1]}/`,
        credits: 5,
      };
  }
  if (
    ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(host)
  ) {
    const id = host.endsWith("youtu.be")
      ? url.pathname.slice(1)
      : url.pathname === "/watch"
        ? url.searchParams.get("v")
        : /^\/shorts\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
      return {
        provider: "youtube" as const,
        url: `https://www.youtube.com/watch?v=${id}`,
        credits: 28,
      };
  }
  throw new Error("unsupported_url");
}

export const StartImport = z.object({ key: z.uuid(), url: z.string().max(2048) }).strict();
export const SaveImport = z.object({ recipe: Recipe }).strict();
export const ImportRecord = z.object({
  id: z.uuid(),
  sourceUrl: z.url(),
  state: z.enum([
    "queued",
    "extracting",
    "needs_review",
    "saved",
    "failed",
    "outcome_unknown",
    "cancelled",
  ]),
  draft: Recipe.nullable(),
  recipeId: z.string().nullable(),
  errorCode: z.string().nullable(),
  extractionId: z.string().nullable(),
  retryable: z.boolean().default(false),
});
export type ImportRecordData = z.infer<typeof ImportRecord>;
export const ImportList = z.object({
  configured: z.boolean(),
  imports: z.array(ImportRecord),
  nextCursor: z.string().nullable(),
});
