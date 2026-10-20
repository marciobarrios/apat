import { lookup } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";
import { AcquisitionError, canonicalizeInstagram, parseInstagramHtml } from "./instagram";

export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  const parsed = ipaddr.process(address);
  return parsed.range() === "unicast";
}
export function checkedRedirect(location: string, current: string, canonical: string): string {
  try {
    const next = canonicalizeInstagram(new URL(location, current).href);
    if (next !== canonical) throw new AcquisitionError("unsafe_destination");
    return next;
  } catch {
    throw new AcquisitionError("unsafe_destination");
  }
}
export function validateHtmlResponse(
  status: number,
  contentType: string | undefined,
  encoding: string | undefined,
): void {
  if ([401, 403, 429].includes(status)) throw new AcquisitionError("access_denied");
  if (status !== 200) throw new AcquisitionError("unavailable");
  if (!contentType?.toLowerCase().startsWith("text/html") || (encoding && encoding !== "identity"))
    throw new AcquisitionError("unsupported_response");
}
export async function fetchInstagramEvidence(input: string) {
  const canonical = canonicalizeInstagram(input);
  const deadline = Date.now() + 15000;
  let current = canonical;
  for (let redirects = 0; redirects <= 2; redirects++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new AcquisitionError("timeout");
    const url = new URL(current);
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_, reject) => {
        const t = setTimeout(() => reject(new AcquisitionError("timeout")), remaining);
        t.unref();
      }),
    ]);
    if (!addresses.length || addresses.some((item) => !isPublicAddress(item.address)))
      throw new AcquisitionError("unsafe_destination");
    const address = addresses[0];
    const result = await new Promise<{ status: number; location?: string; html: string }>(
      (resolve, reject) => {
        const req = request(
          url,
          {
            method: "GET",
            agent: false,
            family: address.family,
            headers: {
              "User-Agent": "apat-research/0.1 (public recipe acquisition experiment)",
              Accept: "text/html",
              "Accept-Encoding": "identity",
            },
            lookup: (_host, _options, callback) => callback(null, address.address, address.family),
          },
          (res) => {
            const status = res.statusCode ?? 0;
            if ([301, 302, 303, 307, 308].includes(status)) {
              res.destroy();
              resolve({ status, location: res.headers.location, html: "" });
              return;
            }
            try {
              validateHtmlResponse(
                status,
                res.headers["content-type"],
                res.headers["content-encoding"],
              );
            } catch (error) {
              res.destroy();
              reject(error);
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => {
              size += chunk.length;
              if (size > 2_000_000) {
                res.destroy();
                reject(new AcquisitionError("too_large"));
              } else chunks.push(chunk);
            });
            res.on("end", () => resolve({ status, html: Buffer.concat(chunks).toString("utf8") }));
            res.on("error", () => reject(new AcquisitionError("network_error")));
          },
        );
        const timer = setTimeout(
          () => req.destroy(new AcquisitionError("timeout")),
          Math.max(1, deadline - Date.now()),
        );
        req.on("close", () => clearTimeout(timer));
        req.on("error", (error) =>
          reject(error instanceof AcquisitionError ? error : new AcquisitionError("network_error")),
        );
        req.end();
      },
    );
    if (result.status === 200) return parseInstagramHtml(result.html, canonical);
    if (!result.location || redirects === 2) throw new AcquisitionError("unavailable");
    current = checkedRedirect(result.location, current, canonical);
  }
  throw new AcquisitionError("unavailable");
}
