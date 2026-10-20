import { ZodError } from "zod";
import { AccessError } from "./errors";

export function privateJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof AccessError) return privateJson({ error: error.code }, error.status);
  if (error instanceof ZodError) return privateJson({ error: "invalid_input" }, 400);
  return privateJson({ error: "service_unavailable" }, 503);
}
export function assertSameOrigin(request: Request, origin: string) {
  const site = request.headers.get("sec-fetch-site");
  if (
    request.headers.get("origin") !== origin ||
    (site && site !== "same-origin" && site !== "none")
  ) {
    throw new AccessError("origin_denied", 403);
  }
}
export async function readJson(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new AccessError("json_required", 415);
  }
  const max = 256 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError("invalid_input", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new AccessError("body_too_large", 413);
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body;
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError("invalid_input", 400);
  } finally {
    reader.releaseLock();
  }
}
