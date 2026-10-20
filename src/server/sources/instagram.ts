import { load } from "cheerio";
import { z } from "zod";

export class AcquisitionError extends Error {
  constructor(
    public readonly code:
      | "invalid_url"
      | "access_denied"
      | "unavailable"
      | "unexpected_html"
      | "too_large"
      | "timeout"
      | "unsafe_destination"
      | "network_error"
      | "unsupported_response",
  ) {
    super(code);
  }
}
export function canonicalizeInstagram(input: string): string {
  if (input.length > 2048) throw new AcquisitionError("invalid_url");
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new AcquisitionError("invalid_url");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !["instagram.com", "www.instagram.com"].includes(url.hostname)
  )
    throw new AcquisitionError("invalid_url");
  const match = /^\/(?:reel|reels|p)\/([A-Za-z0-9_-]{5,64})\/?$/.exec(url.pathname);
  if (!match) throw new AcquisitionError("invalid_url");
  return `https://www.instagram.com/reel/${match[1]}/`;
}
export interface SourceEvidence {
  canonicalUrl: string;
  acquiredAt: string;
  method: "public_html";
  caption: string;
  mediaReferences: string[];
  modalities: "text"[];
  warnings: string[];
}
const VideoMetadata = z.object({
  "@type": z.literal("VideoObject"),
  description: z.string().max(20000).optional(),
  contentUrl: z.url().optional(),
});
export function isPermittedMediaReference(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["cdninstagram.com", "fbcdn.net"].some((domain) => url.hostname.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}
export function parseInstagramHtml(
  html: string,
  source: string,
  acquiredAt = new Date().toISOString(),
): SourceEvidence {
  if (Buffer.byteLength(html) > 2_000_000) throw new AcquisitionError("too_large");
  const canonicalUrl = canonicalizeInstagram(source);
  const $ = load(html);
  let caption = $("meta[property='og:description']").attr("content")?.trim() ?? "";
  const refs = new Set<string>();
  $(
    "meta[property='og:video'],meta[property='og:video:url'],meta[property='og:video:secure_url']",
  ).each((_, node) => {
    const value = $(node).attr("content");
    if (value && isPermittedMediaReference(value)) refs.add(value);
  });
  $("script[type='application/ld+json']")
    .slice(0, 20)
    .each((_, node) => {
      const raw = $(node).text();
      if (raw.length > 100000) return;
      try {
        const parsed = VideoMetadata.safeParse(JSON.parse(raw));
        if (parsed.success) {
          if (!caption) caption = parsed.data.description ?? "";
          if (parsed.data.contentUrl && isPermittedMediaReference(parsed.data.contentUrl))
            refs.add(parsed.data.contentUrl);
        }
      } catch {
        /* Invalid external metadata is ignored; no script is executed. */
      }
    });
  if (!caption || caption.length > 20000 || /^(login|log in|sign up|instagram)$/i.test(caption)) {
    if (
      $("input[name='password']").length ||
      /accounts\/login/.test($("form").attr("action") ?? "")
    )
      throw new AcquisitionError("access_denied");
    throw new AcquisitionError("unexpected_html");
  }
  return {
    canonicalUrl,
    acquiredAt,
    method: "public_html",
    caption,
    mediaReferences: [...refs],
    modalities: ["text"],
    warnings: [
      "Caption evidence only. Video and audio have not been retrieved or verified.",
      ...(refs.size
        ? ["Media references are unverified and may expire."]
        : ["No supported video reference was present in this HTML."]),
    ],
  };
}
