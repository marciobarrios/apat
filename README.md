# apat

A private recipe notebook built around saved Instagram recipes. **This branch is a phase-0 acquisition experiment and local review prototype, not a live recipe-import service.**

## Run locally

Node 24 or 26, pnpm 12.4.2:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:3026. Review/edit the authored sample, change servings, export JSON, or use the cooking view. Draft changes stay in this browser. No Google login, model, real import, Neon connection or account isolation is connected to this UI. No environment variables are required.

## What we learned

The supplied Instagram Reel yielded caption text from direct public HTML. A clean logged-out Chromium session then revealed separate public CDN video/audio; local bounded downloads and FFmpeg produced a decodable audiovisual MP4. **One sample on a Mac is not proof of production reliability.** See [the acquisition evidence](docs/ACQUISITION.md).

## Code and verification

- `src/server/sources`: bounded, DNS-pinned public HTML extraction; no auth cookies or private endpoints.
- `src/lib/recipe.ts`: schema with original phrases, null quantities and evidence.
- `src/server/db`: mandatory Drizzle schema and local Postgres admission/ownership experiment.
- `src/components`: shadcn/Base UI review prototype; Tailwind 4.
- `scripts`: deliberate local acquisition experiments; not exposed as web APIs.
- `drizzle`: generated migration, applied only to disposable local PGlite in tests.
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

See [implementation plan](docs/PLAN.md), [decisions/alternatives](docs/DECISIONS.md), and [verification](docs/VERIFICATION.md). Real Google/Neon/storage/model/runtime/iOS checks remain gated. Nothing deploys automatically; no Vercel project is linked.
