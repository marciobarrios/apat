import { mkdir, writeFile } from "node:fs/promises";
import { fetchInstagramEvidence } from "../src/server/sources/public-html";
import { AcquisitionError } from "../src/server/sources/instagram";
import { researchTarget } from "./research-target";
const input = process.argv[2];
if (!input)
  throw new Error("Usage: pnpm experiment:instagram https://www.instagram.com/reel/SHORTCODE/");
const started = Date.now();
try {
  const target = researchTarget(input);
  const evidence = await fetchInstagramEvidence(input);
  await mkdir(target.directory, { recursive: true });
  await writeFile(`${target.directory}/caption-evidence.json`, JSON.stringify(evidence, null, 2), {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      result: "caption_acquired",
      shortcode: target.shortcode,
      captionCharacters: evidence.caption.length,
      mediaReferenceCount: evidence.mediaReferences.length,
      videoVerified: false,
      audioVerified: false,
      elapsedMs: Date.now() - started,
      checkedAt: evidence.acquiredAt,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      result: "failed",
      code: error instanceof AcquisitionError ? error.code : "internal_error",
      elapsedMs: Date.now() - started,
    }),
  );
  process.exitCode = 1;
}
