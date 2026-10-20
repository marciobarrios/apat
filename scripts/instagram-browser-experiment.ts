import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { AcquisitionError, parseInstagramHtml } from "../src/server/sources/instagram";
import { researchTarget } from "./research-target";

const target = researchTarget();
await mkdir(target.directory, { recursive: true });
// Invalidate previous references before attempting a fresh observation.
await writeFile(`${target.directory}/browser-media-candidates.json`, "[]", { mode: 0o600 });
// Fresh, non-persistent browser: never use a personal profile, login or challenge solving.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const candidates: { url: string; mime: string; status: number }[] = [];
  let mediaRequests = 0;
  page.on("response", (response) => {
    const type = response.headers()["content-type"] ?? "";
    if (type.startsWith("video/") || type.startsWith("audio/"))
      candidates.push({ url: response.url(), mime: type, status: response.status() });
  });
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() === "media") {
      mediaRequests++;
      await route.abort();
      return;
    }
    await route.continue();
  });
  const response = await page.goto(target.canonicalUrl, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(5000);
  let captionCharacters = 0;
  let captionResult = "unavailable";
  try {
    const evidence = parseInstagramHtml(await page.content(), target.canonicalUrl);
    captionCharacters = evidence.caption.length;
    captionResult = "acquired";
    await writeFile(
      `${target.directory}/rendered-caption-evidence.json`,
      JSON.stringify(evidence, null, 2),
      { mode: 0o600 },
    );
  } catch (error) {
    captionResult = error instanceof AcquisitionError ? error.code : "parse_failed";
  }
  const result = await page.evaluate(() => ({
    videoElements: document.querySelectorAll("video").length,
    loginFields: document.querySelectorAll('input[name="password"]').length,
  }));
  await writeFile(`${target.directory}/browser-media-candidates.json`, JSON.stringify(candidates), {
    mode: 0o600,
  });
  const report = {
    shortcode: target.shortcode,
    checkedAt: new Date().toISOString(),
    httpStatus: response?.status(),
    ...result,
    captionCharacters,
    captionResult,
    mediaRequests,
    mediaResponses: candidates.length,
    completeVideoDownloaded: false,
    videoVerified: false,
    audioVerified: false,
    note: "Ordinary logged-out rendering only. Media-element requests blocked; XHR media segments may be returned. No login/challenge bypass, private API replay, or semantic extraction.",
  };
  await writeFile(`${target.directory}/browser-acquisition.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch {
  const report = {
    shortcode: target.shortcode,
    result: "browser_unavailable",
    videoVerified: false,
    audioVerified: false,
  };
  await writeFile(`${target.directory}/browser-acquisition.json`, JSON.stringify(report));
  console.log(JSON.stringify(report));
  process.exitCode = 1;
} finally {
  await browser.close();
}
