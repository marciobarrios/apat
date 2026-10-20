# Verification — 2026-10-20

## Local checks

- Pinned pnpm installation completed. esbuild platform setup explicitly allowed; no project secrets required.
- Oxlint with selected vendored anti-slop rules: passed without warnings.
- Oxfmt check: passed.
- TypeScript 7: passed.
- Vitest: **57 passed**, 3 files. Covers URL/redirect/DNS-range rejection, denied responses, bounded parser, caption/media evidence separation, invalid schema/ranges, unknown quantities, scaling, state transitions, and local Postgres tests for migration, atomic import/outbox creation, repeat idempotency, budget contention, concurrency, invitation denial, ownership and optimistic edits.
- Production Next.js build: passed; two static routes (`/`, `/_not-found`). Initial sandbox attempt failed because Turbopack needed a local worker port; rerun with that permission succeeded, without a code workaround.
- Playwright: **12 passed**, 6 scenarios each at desktop and iPhone-sized Chromium viewport. Review/save/reload/export, invalid edits/cancel, repeated capture with no external calls, scaling/cooking controls, keyboard/overflow and absent live import endpoint. Screenshots visually reviewed at both sizes. This is not physical iOS or Safari verification.
- Live acquisition: public HTML caption verified; fresh logged-out browser exposed public CDN tracks; local full media decoding succeeded. See ACQUISITION.md. No inference was performed.

## Evidence boundaries

PGlite executes real embedded PostgreSQL locally; it does not establish Neon session/RLS, remote concurrency or deployed runtime behavior. The fixture UI is not connected to this database experiment. There is no real login or private account API yet. Import admission is an experiment and lacks the production settlement/reconciliation/kill-switch layers described in PLAN.md; no paid worker uses it.

Google OAuth, beta invites in the hosted app, production Drizzle connection/migrations, direct private uploads, object download ownership, real cleanup retries, model extraction, durable worker restart/reconciliation, capture-token revocation, live cancellation, Vercel previews, paid cost accuracy and physical iOS remain **unverified/unimplemented**. No claim of complete MVP or production readiness is made.
