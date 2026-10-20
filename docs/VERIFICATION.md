# Verification — 2026-10-20

## Local checks

- Pinned pnpm installation completed. esbuild platform setup explicitly allowed; no project secrets required.
- Oxlint with selected vendored anti-slop rules: passed without warnings.
- Oxfmt check: passed.
- TypeScript 7: passed.
- Vitest: **97 passed**, 5 files. Covers URL/redirect/DNS-range rejection, denied responses, bounded parser, caption/media evidence separation, audio/video MP4 content types and rejected responses, padded JSON-LD placeholders, English/Spanish/Catalan text preservation and login metadata, invalid schema/ranges, unknown quantities, scaling, state transitions, and local Postgres tests for migration, atomic import/outbox creation, repeat idempotency, budget contention, concurrency, invitation denial, ownership and optimistic edits.
- Vendored anti-slop: **all 24 test files passed**, including the CLI regression. `pnpm test` runs Vitest followed by `pnpm test:lint-rules`, so the existing CI test step covers both. The separate runner preserves upstream test files and uses Oxlint RuleTester's standalone assertion runner in isolated Node processes; failures propagate as a nonzero exit.
- Production Next.js build: passed; two static routes (`/`, `/_not-found`). Initial sandbox attempt failed because Turbopack needed a local worker port; rerun with that permission succeeded, without a code workaround.
- Playwright: **12 passed**, 6 scenarios each at desktop and iPhone-sized Chromium viewport. Review/save/reload/export, invalid edits/cancel, repeated capture with no external calls, scaling/cooking controls, keyboard/overflow and absent live import endpoint. Screenshots visually reviewed at both sizes. This is not physical iOS or Safari verification.
- Live acquisition: all six supplied Reels acquired locally. For the five additional examples, direct and rendered captions matched; 15 downloaded tracks and five muxed audiovisual files decoded fully. Representative frames were visually reviewed, then temporary media removed. See ACQUISITION.md for per-Reel evidence and limits. No inference was performed.

## Evidence boundaries

PGlite executes real embedded PostgreSQL locally; it does not establish Neon session/RLS, remote concurrency or deployed runtime behavior. The fixture UI is not connected to this database experiment. There is no real login or private account API yet. Import admission is an experiment and lacks the production settlement/reconciliation/kill-switch layers described in PLAN.md; no paid worker uses it.

Google OAuth, beta invites in the hosted app, production Drizzle connection/migrations, direct private uploads, object download ownership, real cleanup retries, model extraction, durable worker restart/reconciliation, capture-token revocation, live cancellation, Vercel previews, paid cost accuracy and physical iOS remain **unverified/unimplemented**. No claim of complete MVP or production readiness is made.

## Private recipe foundation — local milestone

See [NEON-SETUP.md](NEON-SETUP.md) for the exact external state and setup approvals.

- Lint without warnings; Oxfmt check; TypeScript; local Next production build: pass.
- Vitest: **107 tests pass**, including shared private API/Drizzle services on PGlite. A runtime role with read-only membership access can save/edit; membership writes and unrelated import reads are denied. All 24 vendored lint suites pass.
- Playwright: **30 checks pass**, at desktop and iPhone-sized Chromium viewports. Sample review plus mocked account creation/reload/edit/export, cancelled/failed/repeated saves, optimistic conflict handling, Google sign-in errors, invite denial, account-switch clearing and retryable sign-out. Mock account screenshots visually reviewed; no real Google or Neon persistence test is claimed.
- No external migrations, credentials, OAuth/access changes, production writes, merge or deployment. Missing configuration fails closed in the built app. This is the local account/recipe foundation, not the complete import vertical slice.

## Approved production setup checkpoint — October 21, 2026

Remote Neon checks confirm both Drizzle journal hashes, restricted NOLOGIN app/schema roles, denied app membership writes/recipe deletes/Auth and import reads/DDL, and zero app/Auth rows. Pooling is enabled. Credential activation, real Google login, enrollment and authenticated persistence remain pending the [secure local handoff](NEON-PRODUCTION-STATUS.md).

The local setup command was exercised in a disposable directory with a mocked pg client and a pseudo-terminal: success preserves development configuration, cancellation stops without activation, provider errors do not echo the supplied fixture password, changed role state refuses credential reset, and non-TTY execution refuses before creating staged configuration. Generated files have mode 0600; the owner password is absent from persisted files/output. This is local handoff verification, not real Neon authentication.

Fresh local checks at this checkpoint: lint, format, TypeScript, 107 Vitest tests, all 24 lint-rule suites and all 30 desktop/mobile mocked-account browser checks passed. The default Turbopack build could not bind its local worker port in this execution environment (EPERM), including the escalated attempt. `next build --webpack` passed and supplied the build for these browser checks. CI retains the default Turbopack command; no builder configuration was changed.

## Live credential/HTTP checkpoint — October 21, 2026

The user completed the secure local activation helper. Both production roles now have LOGIN. Protected active configuration targets the exact production endpoints/roles with verify-full TLS; file mode is 0600. The real local node-postgres app connection succeeds. App reads see zero memberships/recipes; actual forbidden membership UPDATE and Auth reads return SQLSTATE 42501 with rollback, and recipe DELETE/public CREATE privileges are false. No test data was written.

The built local server returns home 200; anonymous account/list/write and spoofed-owner requests 401; foreign-origin writes 403; private responses are private/no-store. Both CI runs on 3455e6f succeeded. Real Google sign-in, explicit account enrollment and authenticated save/reload remain pending. Browser control timed out three times (including a lookup to avoid duplicate tabs), so the user was given the local URL to sign in manually; no OAuth failure or success is inferred from those tool timeouts.
