import { readFile, writeFile, mkdir } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { isPermittedMediaReference } from "../src/server/sources/instagram";
import { isPublicAddress } from "../src/server/sources/public-html";
import { researchTarget } from "./research-target";
import { validateMp4Response } from "../src/server/sources/mp4";
const run = promisify(execFile);
const target = researchTarget();
const candidates = z
  .array(z.object({ url: z.url(), mime: z.string(), status: z.number() }))
  .parse(JSON.parse(await readFile(`${target.directory}/browser-media-candidates.json`, "utf8")));
const paths = new Set<string>();
await mkdir(`${target.directory}/media`, { recursive: true });
const results = [];
for (const item of candidates) {
  const url = new URL(item.url);
  if (paths.has(url.pathname) || paths.size >= 3 || !isPermittedMediaReference(url.href)) continue;
  paths.add(url.pathname);
  // These are HTTP byte-range selectors, not authentication. Preserve every signed parameter.
  url.searchParams.delete("bytestart");
  url.searchParams.delete("byteend");
  try {
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true }),
      new Promise<never>((_resolve, reject) => {
        dnsTimer = setTimeout(() => reject(new Error("dns_timeout")), 5000);
      }),
    ]).finally(() => clearTimeout(dnsTimer));
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new Error("unsafe_destination");
    const address = addresses[0];
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const req = request(
        url,
        {
          agent: false,
          family: address.family,
          headers: { "User-Agent": "apat-research/0.1", "Accept-Encoding": "identity" },
          lookup: (_host, _options, cb) => cb(null, address.address, address.family),
        },
        (res) => {
          try {
            validateMp4Response(res.statusCode, res.headers["content-type"]);
          } catch (error) {
            res.destroy();
            reject(error);
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 20_000_000) {
              res.destroy();
              reject(new Error("too_large"));
            } else chunks.push(chunk);
          });
          res.on("error", () => reject(new Error("download_failed")));
          res.on("end", () => resolve(Buffer.concat(chunks)));
        },
      );
      const timer = setTimeout(() => req.destroy(new Error("timeout")), 15000);
      req.on("close", () => clearTimeout(timer));
      req.on("error", () => reject(new Error("download_failed")));
      req.end();
    });
    if (bytes.subarray(4, 8).toString() !== "ftyp") throw new Error("invalid_mp4_signature");
    const file = `${target.directory}/media/observed-${paths.size}.mp4`;
    await writeFile(file, bytes, { mode: 0o600 });
    const { stdout } = await run(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=codec_type,codec_name,width,height,sample_rate,channels",
        "-of",
        "json",
        file,
      ],
      { timeout: 10000, maxBuffer: 65536 },
    );
    const metadata = z
      .object({
        streams: z.array(
          z.object({
            codec_type: z.string(),
            codec_name: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
            sample_rate: z.string().optional(),
            channels: z.number().optional(),
          }),
        ),
        format: z.object({ duration: z.string() }),
      })
      .parse(JSON.parse(stdout));
    // Decode every frame/sample; metadata alone does not prove a playable file.
    await run("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-f", "null", "-"], {
      timeout: 60000,
      maxBuffer: 65536,
    });
    if (metadata.streams.some((stream) => stream.codec_type === "video")) {
      await run(
        "ffmpeg",
        [
          "-v",
          "error",
          "-y",
          "-ss",
          "2",
          "-i",
          file,
          "-frames:v",
          "1",
          `${target.directory}/media/frame-${paths.size}.jpg`,
        ],
        {
          timeout: 10000,
          maxBuffer: 65536,
        },
      );
    }
    results.push({ fileNumber: paths.size, bytes: bytes.length, decoded: true, ...metadata });
  } catch (error) {
    const safeCodes = [
      "dns_timeout",
      "unsafe_destination",
      "unsupported_response",
      "too_large",
      "invalid_mp4_signature",
      "download_failed",
    ];
    results.push({
      fileNumber: paths.size,
      error:
        error instanceof Error && safeCodes.includes(error.message)
          ? error.message
          : "media_not_verified",
    });
  }
}
const report = {
  shortcode: target.shortcode,
  checkedAt: new Date().toISOString(),
  results,
  note: "Public CDN references observed through ordinary logged-out page rendering. No cookies or private API calls. Byte-range selectors removed; all signed parameters preserved. Track metadata is not semantic recipe extraction or narration verification.",
};
await writeFile(`${target.directory}/media-inspection.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
