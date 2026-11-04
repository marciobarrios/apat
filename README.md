# apat

A private recipe notebook built around saved Instagram recipes. **Google login and private manual recipe storage in Neon are verified locally on this branch. Instagram/Gemini imports are the next unfinished milestone. The public Vercel site has not been updated.**

To resume work, read [the current implementation plan](docs/PLAN.md). It records what is done, what is missing and the next steps in order; no separate milestone briefing is needed.

## Run locally

Node 24 or 26, pnpm 12.4.2:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:3026. Without configuration, the account library explains that secure setup is pending. `/sample` offers the authored browser-only review/edit/scaling/export/cooking demo. With approved branch-specific configuration and membership, the private library uses server-verified Neon Auth and Drizzle/Postgres. See [setup and approval gates](docs/NEON-SETUP.md); no credentials are needed for the local fixture/test suite.

## What we learned

All six supplied Instagram Reels yielded caption text from direct public HTML. Clean logged-out Chromium sessions then revealed separate public CDN video/audio; local bounded downloads and FFmpeg produced decodable audiovisual MP4s. The examples span English, Spanish and Catalan. **Six samples on a Mac do not establish production reliability or model extraction accuracy.** See [the acquisition evidence](docs/ACQUISITION.md).

## Code and verification

- `src/server/sources`: bounded, DNS-pinned public HTML extraction; no auth cookies or private endpoints.
- `src/lib/recipe.ts`: schema with original phrases, null quantities and evidence.
- `src/server/db`: connected owner-scoped Drizzle recipe services plus separate local import-admission groundwork.
- `src/components`: private manual library and a separate authored sample/review/cooking demo; Tailwind 4 and shadcn/Base UI.
- `scripts`: deliberate local acquisition experiments; not exposed as web APIs.
- `drizzle`: reviewed migrations validated locally and applied to the explicitly approved Neon branch. No startup/build/CI migration.
- `research/`: ignored evidence, source handoff and temporary acquisition outputs. Never upload creator media or signed URLs.

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

See [implementation plan](docs/PLAN.md), [decisions/alternatives](docs/DECISIONS.md), and [verification](docs/VERIFICATION.md). Real one-account local Google/Neon persistence is verified; storage/model/worker, two-real-account, cross-device and physical-iOS checks remain pending. Existing Vercel production is deployed. Vercel previews for every PR are pre-approved; production deployments still require explicit approval. No service configuration is written by builds/tests.
