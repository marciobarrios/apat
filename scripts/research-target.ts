import { canonicalizeInstagram } from "../src/server/sources/instagram";

export function researchTarget(input = process.argv[2]) {
  if (!input) throw new Error("A public Instagram Reel URL is required.");
  const canonicalUrl = canonicalizeInstagram(input);
  const shortcode = new URL(canonicalUrl).pathname.split("/")[2];
  return { canonicalUrl, shortcode, directory: `research/reels/${shortcode}` };
}
