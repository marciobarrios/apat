import { describe, expect, it } from "vitest";
import {
  canonicalizeInstagram,
  parseInstagramHtml,
  isPermittedMediaReference,
} from "../src/server/sources/instagram";
import {
  isPublicAddress,
  checkedRedirect,
  validateHtmlResponse,
} from "../src/server/sources/public-html";
const url = "https://www.instagram.com/reel/DWJJrpcCLLP/";
describe("public source boundary", () => {
  it("removes tracking data and canonicalizes public permalink", () =>
    expect(
      canonicalizeInstagram("https://instagram.com/p/DWJJrpcCLLP/?secret=tracking#fragment"),
    ).toBe(url));
  it.each([
    "http://instagram.com/reel/DWJJrpcCLLP/",
    "https://instagram.com.evil.test/reel/DWJJrpcCLLP/",
    "https://evil.test@www.instagram.com/reel/DWJJrpcCLLP/",
    "https://www.instagram.com:8443/reel/DWJJrpcCLLP/",
    "https://www.instagram.com/accounts/login/",
    "https://127.0.0.1/reel/DWJJrpcCLLP/",
    "https://www.instagram.com/reel/DWJJrpcCLLP/%2f..",
    "https://www.instagram.com/reel/a/",
  ])("rejects unsafe source %s", (input) => expect(() => canonicalizeInstagram(input)).toThrow());
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "172.16.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "0.0.0.0",
    "224.0.0.1",
    "100.64.0.1",
    "192.0.2.1",
  ])("rejects non-public DNS answer %s", (address) => expect(isPublicAddress(address)).toBe(false));
  it("accepts public DNS addresses", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("extracts escaped caption without claiming video understanding", () => {
    const evidence = parseInstagramHtml(
      '<meta property="og:description" content="Soup &amp; bread. Salt to taste.">',
      url,
    );
    expect(evidence.caption).toBe("Soup & bread. Salt to taste.");
    expect(evidence.modalities).toEqual(["text"]);
    expect(evidence.mediaReferences).toEqual([]);
  });
  it("does not equate a media URL with acquired audio/video", () => {
    const evidence = parseInstagramHtml(
      '<meta property="og:description" content="Recipe"><meta property="og:video" content="https://video.cdninstagram.com/example.mp4?expires=1">',
      url,
    );
    expect(evidence.mediaReferences).toHaveLength(1);
    expect(evidence.modalities).toEqual(["text"]);
    expect(evidence.warnings.join()).toContain("unverified");
  });
  it("supports bounded VideoObject metadata", () =>
    expect(
      parseInstagramHtml(
        '<script type="application/ld+json">{"@type":"VideoObject","description":"Recipe","contentUrl":"https://a.fbcdn.net/file.mp4"}</script>',
        url,
      ).mediaReferences,
    ).toHaveLength(1));
  it.each(["   ", " Instagram ", "\n Log in \t"])(
    "rejects padded or empty JSON-LD placeholder %j",
    (description) =>
      expect(() =>
        parseInstagramHtml(
          `<script type="application/ld+json">${JSON.stringify({ "@type": "VideoObject", description })}</script>`,
          url,
        ),
      ).toThrow("unexpected_html"),
  );
  it("trims JSON-LD caption boundaries while preserving meaningful whitespace", () =>
    expect(
      parseInstagramHtml(
        '<script type="application/ld+json">{"@type":"VideoObject","description":"  Soup\\nSalt to taste.  "}</script>',
        url,
      ).caption,
    ).toBe("Soup\nSalt to taste."));
  it("tolerates broken JSON with valid caption", () =>
    expect(
      parseInstagramHtml(
        '<meta property="og:description" content="Recipe"><script type="application/ld+json">not json</script>',
        url,
      ).caption,
    ).toBe("Recipe"));
  it("fails a changed page rather than inventing evidence", () =>
    expect(() => parseInstagramHtml("<h1>Something changed</h1>", url)).toThrow("unexpected_html"));
  it("stops on a login wall", () =>
    expect(() =>
      parseInstagramHtml('<form action="/accounts/login/"><input name="password"></form>', url),
    ).toThrow("access_denied"));
  it("bounds parsing work", () =>
    expect(() => parseInstagramHtml("x".repeat(2_000_001), url)).toThrow("too_large"));
  it.each([
    "https://localhost/video.mp4",
    "http://a.fbcdn.net/video.mp4",
    "https://a.fbcdn.net.evil.test/video.mp4",
    "https://user:pass@a.fbcdn.net/video.mp4",
    "javascript:alert(1)",
  ])("rejects unsafe media reference %s", (value) =>
    expect(isPermittedMediaReference(value)).toBe(false),
  );
});

it.each([
  "https://127.0.0.1/",
  "http://www.instagram.com/reel/DWJJrpcCLLP/",
  "/accounts/login/",
  "https://www.instagram.com/reel/ANOTHER/",
  "https://evil.test/",
])("blocks redirect %s", (location) =>
  expect(() => checkedRedirect(location, url, url)).toThrow("unsafe_destination"),
);
it("accepts only same-reel tracking redirects", () =>
  expect(checkedRedirect("?tracking=removed", url, url)).toBe(url));
it.each([401, 403, 429])("does not bypass HTTP %s", (status) =>
  expect(() => validateHtmlResponse(status, "text/html", undefined)).toThrow("access_denied"),
);
it("rejects missing and compressed/non-HTML bodies", () => {
  expect(() => validateHtmlResponse(404, "text/html", undefined)).toThrow("unavailable");
  expect(() => validateHtmlResponse(200, "application/json", undefined)).toThrow(
    "unsupported_response",
  );
  expect(() => validateHtmlResponse(200, "text/html", "gzip")).toThrow("unsupported_response");
  expect(() => validateHtmlResponse(200, undefined, undefined)).toThrow("unsupported_response");
  expect(() => validateHtmlResponse(200, "text/html; charset=utf-8", "identity")).not.toThrow();
});
