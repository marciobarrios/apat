# apat

A private recipe notebook for manual recipes and saved Instagram/YouTube videos. **This branch adds a Mamitsu import → review → private save flow. The isolated Vercel Preview is active: real Instagram and YouTube imports, private saves, reload and export are verified. Authored fixtures and PostgreSQL/PGlite tests cover additional cases; provider accuracy and full beta acceptance remain separate gates.** See [Mamitsu setup and evidence boundaries](docs/MAMITSU.md).

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
- `src/server/db`: owner-scoped Drizzle recipe/import services with credit reservations and separate historical admission experiments.
- `src/components`: private library, video import/review flow and a separate authored sample/cooking demo; Tailwind 4 and shadcn/Base UI.
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

See [implementation plan](docs/PLAN.md), [decisions/alternatives](docs/DECISIONS.md), and [verification](docs/VERIFICATION.md). Historical one-account local Google/Neon persistence is verified. Real hosted preview Google login and one Mamitsu import per provider are verified. Two-real-account, cross-device, physical-iOS and broader extraction-accuracy checks remain pending. Production is deployed. Only the old `feat/neon-private-library` branch disables automatic preview deployment; this PR uses the normal Git preview path. No service configuration or migrations are written by builds/tests.
