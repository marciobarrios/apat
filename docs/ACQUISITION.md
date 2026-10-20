# Instagram acquisition experiment — 2026-10-20 UTC

Samples: six user-supplied public Reels, including original `DWJJrpcCLLP` (ChefBosquet) and the five below. This is a small convenience sample, not a reliability benchmark. All observations ran on Marcio's Mac. Vercel/cloud acquisition and model extraction have **not** been tested.

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

## Five additional Reels: English, Spanish and Catalan

Observed 2026-10-20, 08:03–08:06 UTC. Each source used direct public HTML followed by a fresh logged-out Chromium context. All returned HTTP 200, one video element and no password field. Direct and rendered captions matched exactly; there were no supported video references in any initial HTML response.

| Reel          | Caption language | Caption length¹ | Video duration | Video + audio        |
| ------------- | ---------------- | --------------: | -------------: | -------------------- |
| `Dd4nCZIuzME` | Spanish          |             425 |        42.13 s | Acquired and decoded |
| `DTGaTvADNRm` | Spanish          |             874 |        25.80 s | Acquired and decoded |
| `Dc8_GajC1hL` | English          |           1,736 |        92.73 s | Acquired and decoded |
| `DdmUMmAoClp` | Spanish          |           1,194 |        61.40 s | Acquired and decoded |
| `DeMjB0GIFcV` | Catalan          |             734 |        25.83 s | Acquired and decoded |

¹ JavaScript string length (UTF-16 code units), not Unicode graphemes. Language labels describe the observed corpus; no production language detector is implemented.

Each browser observation received 13 media responses. A maximum of three distinct media paths per Reel was downloaded: H.264 video in 720×1280 and 360×640, plus a separate AAC audio track. **Every one of these 15 files decoded completely** with FFmpeg. The 720p video and audio were also muxed into five MP4s; all five combined files decoded successfully, ranging from 4.44 to 13.87 MB. Representative frames from each Reel were visually inspected. Track timing was consistent; this does not verify narration accuracy, audio synchronization perceptually, or ingredient completeness.

This supports the feasibility of direct acquisition on this Mac across the supplied examples, without paid scrapers or login. It does not establish a general success rate, cloud reliability or AI recipe accuracy. The browser remains necessary in every tested case. The inspection's three-asset cap can miss a needed track on a different page, so a production worker must identify the active Reel's tracks rather than assume response order. Representative-frame inspection is a research check, not an automated source/track identity guarantee.

### Multilingual contract

- Support English (`en`), Spanish (`es`) and Catalan (`ca`) sources. Preserve the original caption, its line breaks, accent marks, Catalan `l·l`/apostrophes and evidence excerpts.
- Preserve source-language recipe text by default. UI locale and optional translation are separate choices; do not silently translate evidence.
- Normalization must understand decimal commas and points, Unicode fractions, local measures and unquantified ingredients. The structured contract can represent these, but **the automatic normalizer/model is not connected yet**.
- Keep absent quantities, serving counts and times unknown. “To taste”, “al gusto” and “al gust” must not become invented amounts.
- Evaluate narrated audio, visual overlays, caption-only cases, mixed languages and conflicting evidence before claiming model support. Add real expected answers and compare against the approved model route.

`tests/multilingual.test.ts` adds 20 authored regression cases for lossless extraction/schema round-tripping/scaling, shared-link tracking removal, whitespace metadata and multilingual login pages. These tests use human-defined structured values; they do not simulate a successful LLM response or prove automatic semantic extraction.

## Architectural consequence

Direct ingestion is possible for these samples, but the initial HTML alone did not supply the video. The successful route required rendering JavaScript and combining separate audio/video. Do not promise a cheap generic fetch in a Vercel request handler. Next proof: representative public corpus and the intended deployed runtime, with an explicitly approved test environment/budget. Options: caption-first fast path; browser-capable worker for approved accessible cases; user-authorized upload; optional vendor only if approved. Compare one worker (e.g. Trigger.dev/container) with Vercel Workflow before adding infrastructure. No provider commitment is made here.

## Reproduce (local, deliberate experiments only)

- `pnpm experiment:instagram 'https://www.instagram.com/reel/DWJJrpcCLLP/'`
- `pnpm experiment:instagram:browser 'https://www.instagram.com/reel/SHORTCODE/'` (requires installed Playwright Chromium; fresh anonymous context)
- `pnpm experiment:instagram:media 'https://www.instagram.com/reel/SHORTCODE/'` (requires fresh observed references and local `ffprobe`/`ffmpeg`; bounds downloads, probes and fully decodes individual tracks)

Outputs now live under ignored `research/reels/SHORTCODE/`; captions and signed CDN references are written with restrictive file permissions. Temporary tracks and frames are research-only and should be removed after inspection. The five-file mux check was a separate local FFmpeg experiment, not an implemented production ingestion step.

The media inspection script is a local research utility, not an upload/download API and not ready for arbitrary user traffic. References expire. Lack of a caption/ref, a login wall, 403 or 429 ends the relevant attempt; no bypass or paid fallback.

## Still unverified

30–50 representative Reels; account/region variation; deleted/private fixtures in the actual network path; CDN expiry recovery; corpus hit rate; semantic audio/video extraction; Gemini/Gateway parity; inference cost/accuracy; Vercel runtime acquisition; upload/storage authorization; physical iOS Shortcut flow. Media-inspection DNS is now bounded to five seconds, downloads to 15 seconds per file and decode to 60 seconds per file; a production worker still needs an overall job deadline. Do not treat these six successful examples as the go/no-go gate passing for the public product.
