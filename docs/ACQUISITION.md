# Instagram acquisition experiment — 2026-10-20 UTC

Sample: the user-supplied public Reel `DWJJrpcCLLP` (ChefBosquet). One unique sample, not a reliability benchmark. All observations ran on Marcio's Mac. Vercel/cloud acquisition and model extraction have **not** been tested.

## Results

1. Plain unauthenticated HTTP request: 200, 623,219 HTML bytes in the initial curl observation. The typed adapter then extracted 684 caption characters in 1,626 ms and again in 1,463 ms. No supported video URL appeared in OG/VideoObject metadata. The caption is not described as a visually verified recipe.
2. Fresh non-persistent Chromium context, no personal browser profile/login/cookies: the rendered page created a `blob:` video element. A blob URL is not a downloadable remote file.
3. Normal page rendering made public CDN requests returning `video/mp4` via XHR. The browser script records these in ignored local research. It does **not** call an internal GraphQL/private API directly, solve a challenge, harvest sessions or attempt access evasion. Initial resource-type blocking prevented `media` requests but did not prevent MP4 XHRs; the report explicitly distinguishes this.
4. A bounded local inspection used those public CDN references without cookies. Standard `bytestart`/`byteend` range selectors were removed to retrieve the complete corresponding files; every signed parameter was preserved. At most three files, each capped at 20 MB/15 seconds, with HTTPS host allowlisting, DNS checks/pinning and MP4 signature validation. Results:

| File |     Bytes | Stream                     |    Duration |
| ---- | --------: | -------------------------- | ----------: |
| 1    | 4,428,884 | H.264 video, 720×1280      | 13.033333 s |
| 2    |   102,453 | AAC audio, 44.1 kHz stereo | 13.048163 s |
| 3    |   946,939 | H.264 video, 360×640       | 13.033333 s |

5. FFmpeg stream-copy mux of files 1 and 2: 4,535,956 bytes, 13.033333 seconds, H.264 + AAC. Full decoding to a null output completed without errors. Audio was non-silent (mean −16.9 dB, max −0.7 dB). A frame at 5 seconds showed chocolate being added to batter. This verifies playable audiovisual media, **not** narration accuracy, ingredient completeness or model understanding.

No paid vendor, model inference or external storage was used. Raw captions, signed CDN references, media and screenshots are excluded from Git. Temporary downloaded media was removed after inspection. The report intentionally omits signed URLs.

## Architectural consequence

Direct ingestion is possible for this particular sample, but the initial HTML alone did not supply the video. The successful route required rendering JavaScript and combining separate audio/video. Do not promise a cheap generic fetch in a Vercel request handler. Next proof: representative public corpus and the intended deployed runtime, with an explicitly approved test environment/budget. Options: caption-first fast path; browser-capable worker for approved accessible cases; user-authorized upload; optional vendor only if approved. Compare one worker (e.g. Trigger.dev/container) with Vercel Workflow before adding infrastructure. No provider commitment is made here.

## Reproduce (local, deliberate experiments only)

- `pnpm experiment:instagram 'https://www.instagram.com/reel/DWJJrpcCLLP/'`
- `node scripts/instagram-browser-experiment.mjs` (requires installed Playwright Chromium; fresh anonymous context)
- `pnpm exec tsx scripts/inspect-observed-media.ts` (requires fresh observed references and local `ffprobe`)

The media inspection script is a local research utility, not an upload/download API and not ready for arbitrary user traffic. References expire. Lack of a caption/ref, a login wall, 403 or 429 ends the relevant attempt; no bypass or paid fallback.

## Still unverified

30–50 representative Reels; account/region variation; deleted/private fixtures in the actual network path; CDN expiry recovery; full-route deadlines on media-inspection DNS lookup; corpus hit rate; semantic audio/video extraction; Gemini/Gateway parity; inference cost/accuracy; Vercel runtime acquisition; upload/storage authorization; physical iOS Shortcut flow. Do not treat this single successful Reel as the go/no-go gate passing for the public product.
