import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
// Isolated, non-persistent browser: no user profile, cookies, login or challenge solving.
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const observations = [];
  const candidates = [];
  page.on("response", (response) => {
    const type = response.headers()["content-type"] ?? "";
    if (type.startsWith("video/") || type.startsWith("audio/"))
      candidates.push({ url: response.url(), mime: type, status: response.status() });
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.resourceType() === "media") {
      observations.push({ kind: "media_request", host: new URL(request.url()).hostname });
      await route.abort();
      return;
    }
    await route.continue();
  });
  const response = await page.goto("https://www.instagram.com/reel/DWJJrpcCLLP/", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(2500);
  const refs = await page
    .locator("video")
    .evaluateAll((nodes) =>
      nodes
        .map((v) => v.currentSrc || v.src || v.querySelector("source[src]")?.getAttribute("src"))
        .filter(Boolean),
    );
  await mkdir("research", { recursive: true });
  await writeFile("research/browser-media-refs.json", JSON.stringify(refs), { mode: 0o600 });
  const result = await page.evaluate(() => ({
    title: document.title,
    videoElements: document.querySelectorAll("video").length,
    videoReferences: [...document.querySelectorAll("video")].filter(
      (v) => v.currentSrc || v.src || v.querySelector("source[src]"),
    ).length,
    loginFields: document.querySelectorAll('input[name="password"]').length,
  }));
  await writeFile("research/browser-media-candidates.json", JSON.stringify(candidates), {
    mode: 0o600,
  });
  const report = {
    mediaResponses: candidates.map((c) => ({
      mime: c.mime,
      status: c.status,
      host: new URL(c.url).hostname,
    })),
    checkedAt: new Date().toISOString(),
    httpStatus: response?.status(),
    ...result,
    mediaRequests: observations.length,
    referenceProtocols: refs.map((ref) => new URL(ref).protocol),
    referenceHosts: refs.map((ref) => new URL(ref).hostname),
    completeVideoDownloaded: false,
    videoVerified: false,
    audioVerified: false,
    note: "Read-only public browser observation. Media-element requests were blocked, but ordinary page XHRs returned MP4 segments. No complete file was assembled by this observation script; no consent/login challenge was bypassed.",
  };
  await mkdir("research", { recursive: true });
  await writeFile("research/browser-acquisition.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch {
  console.log(
    JSON.stringify({ result: "browser_unavailable", videoVerified: false, audioVerified: false }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
