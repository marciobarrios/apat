# Verification history — October 20–21, 2026

This is a chronological evidence log. Earlier “not connected”/“pending” statements describe their original checkpoints; the final real-OAuth checkpoint records the latest verification. Use [PLAN.md](PLAN.md) for the consolidated current state and remaining work.

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

## Real OAuth and authenticated recipe checkpoint — October 21, 2026

The user's completed Google login revealed a missed home-page verifier callback. The proxy now forwards only home requests bearing that query to the protected same-origin `/library` callback, avoiding the SDK login-page skip. The current verifier was consumed by reloading, the URL was cleaned, and the real signed-in invitation gate denied access before explicit approved enrollment.

After guarded enrollment, the live browser saved one labeled authored recipe through the real API and Neon connection. Full reload restored session and recipe. Edit/cancel preserved the prior data; a real saved edit advanced version to 2 while the database original-evidence hash remained unchanged. The Export button downloaded matching version-2 JSON. No second account or Vercel deployment was used.

After the fix, lint/format/types, 107 unit/PGlite tests and 24 lint-rule suites pass. The webpack build passes. The existing 30 mocked browser checks passed in the full run; the two new callback routing checks then passed on desktop/mobile after resolving relative Location headers in the test. These two checks deliberately have no challenge cookie and use an authored expired verifier; the real OAuth claim comes from the distinct live test above. Cross-user service denial remains PGlite evidence; two-real-account OAuth, real revocation/sign-out/error flows, physical iOS and cross-device use are not yet verified.

## Account-scope review fix — October 21, 2026

[Review finding r4324563588](https://github.com/marciobarrios/apat/pull/2#discussion_r4324563588) correctly identified a race between separate account and recipe-list requests. The initial GET `/api/recipes` now returns account plus list using one verified identity resolution. Subsequent UI recipe reads/writes/pagination/export and account rechecks assert the displayed account via `X-Apat-Expected-Account`; the server rejects a mismatch with private/no-store 409 before creating the service or executing a recipe operation. The header never supplies identity or ownership. Accepting a new snapshot invalidates earlier in-flight work; account-change reset also clears pagination and pending creation keys.

109 unit/PGlite tests and all 24 lint-rule suites pass. New handler regressions verify a single identity resolution even if a subsequent resolution would return another subject, stale-context denial for every operation without a wrong-account write, and continued cross-owner denial even with a matching expected header. All 36 desktop/mobile browser checks pass, including coherent single-response loading and a simulated account switch without a focus event that rejects the stale form before writing. Lint/format/types and the local webpack build pass. The real approved one-account notebook still loads its saved fixture after rebuilding; no second Google identity or new production row was used for these regressions. Two-real-account live verification remains pending.

## Recipe notebook redesign — November 4, 2026

The welcome screen, private recipe index, manual creation, authored sample, review editor, and cooking view now share a paper notebook design inspired by the supplied physical recipe journal. Desktop recipe pages pair ingredients and preparation across a burgundy binding; mobile uses stacked pages. Geist Sans and Geist Serif Regular (`geist` 1.9.0) and Caveat (`@fontsource/caveat` 5.3.0) are served locally. Font selection follows [Vercel’s Geist documentation](https://vercel.com/font). Decorative kitchen sketches are inline SVG, not images of an imported dish.

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:browser` pass: 109 unit/PGlite tests, 24 lint-rule suites, and 36 desktop/mobile Chromium checks. The default Turbopack production build supplied the browser test server.
- Additional local checks exercised welcome, sample, cooking, and editing at 320, 768, 1024, and 1440 CSS pixels without horizontal overflow. The mocked manual-creation form also fits 320 pixels. Loaded font faces, the keyboard skip link, reduced-motion behavior, and absence of page runtime errors were checked. Welcome, recipe, narrow mobile, mocked index, and mocked creation screenshots were visually inspected; artifacts remain ignored.
- Sample capture feedback now appears alongside the demo form. Sample edits/scaling/export, unknown facts, original evidence, account isolation, and save/error recovery remain covered by the existing suite. The outdated sample login banner was removed; imports remain explicitly unavailable.

Browser account data was mocked; no live Google login, Neon integration, actual Instagram import, paid inference, external migration, service configuration, or deployment was performed. PGlite remains evidence of local PostgreSQL behavior only. This is a UI checkpoint, not completion of the import milestone or physical-device verification.

## Mamitsu import implementation — November 4, 2026

User-requested Mamitsu integration adds Instagram Reel and YouTube import receipts, validated recipe drafts, review/edit/save and source attribution beside manual entry. Drizzle migration `0002_wonderful_slayback.sql` adds `recipe_imports`; it has only been applied to local PGlite databases. No external migration/grant, new credential, provider extraction, Vercel environment mutation, provisioning or production deployment was performed during implementation.

Verified locally:

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:browser` pass. Final totals: 131 unit/PGlite tests, 24 vendored lint-rule suites and 54 desktop/mobile Chromium browser checks against the built server.
- Authored Mamitsu envelopes verify the restricted schema's keywords/size/depth, original-language/unknown-fact preservation, runtime validation, canonical source binding, request/response bounds, sanitized errors, charged/free/ambiguous classifications and one transport attempt.
- Real Drizzle SQL on local PostgreSQL/PGlite verifies competing admissions, global/owner conservative credit holds, intent/source deduplication, claim/cancel races, paid-unknown preservation, free retries, attempt limits, owner/membership denial, revocation before dispatch and after submission, newest-first pagination, restricted runtime grants and transactional reviewed saves with separate original/edited content. This is not Neon integration evidence.
- Authored browser/API fixtures verify both source forms, unchanged and corrected draft saves, evidence preservation, ingredient/step additions, ranges/unknown-serving behavior, reload/pending restoration, lost-response idempotency, stale-account denial, an older list-response race and no paid retry/cancellation for unknown outcomes. No paid provider, real login, Neon, Vercel or physical iOS test is claimed.
- A deliberate credit-classification mutation made the Mamitsu failure test fail; the original source was restored before the passing checks.
- Read-only Mamitsu Usage/schema inspection used the user's signed-in T3 browser. Only schema structure/status/credit metadata was inspected for implementation; creator captions/media were not copied into source, fixtures, commits or logs.
- Read-only Vercel configuration inspection found existing production app/Auth variables and no preview variables. Normal Git preview creation is allowed for this feature branch; the old foundation branch remains disabled. No Vercel settings/secrets were changed.
- `pnpm audit --prod` is **not clean**: pre-existing transitive Better Auth, Zod, esbuild and deepmerge advisories remain. No dependencies changed. Reachability, the unverified managed Auth patch level, and the November 11 review date are documented in [MAMITSU.md](MAMITSU.md).

Remaining gates and limitations: approve the exact preview database/Auth data boundary, migration/grants, scoped secrets/origins and credit limits; then perform explicitly approved real Reel/YouTube trials and compare provider usage. Next.js `after` is bounded dispatch, not a durable retrying worker. An interrupted claimed request becomes a held unknown outcome requiring operator reconciliation, never an automatic paid replay. This PR does not satisfy the full acquisition/evaluation/hosted-beta acceptance gate. See [MAMITSU.md](MAMITSU.md) and [PLAN.md](PLAN.md).

## Approved isolated preview activation — November 4, 2026

The user approved preview setup and a trial budget of up to 33 existing Mamitsu credits. Verified Neon branch `br-summer-shadow-ba3j33yn` and endpoint `ep-rapid-surf-bay49p21` using actual Postgres settings. Applied migration `0002` to that isolated branch after journal checks, created the restricted preview runtime role, and verified its pooled connection plus actual access denials. Production and the other feature branch were not changed. The snapshot contains two recipes and the existing approved account's active membership.

Configured branch-only origin/Auth/cookie/credit variables. Branch Auth `/ok` returns 200; the exact stable preview origin is already trusted in the copied configuration and Google is configured. No Auth-schema or production trusted-origin write was needed. Discovered that Neon regenerates its integration-managed owner `DATABASE_URL` on redeploy; added a sensitive `APAT_DATABASE_URL` override and owner-role refusal with regression coverage. All six required checks pass: 133 unit/PGlite tests, 24 lint-rule suites and 54 authored desktop/mobile browser checks. These remain separate from the real SQL checks above.

Live Vercel Google login and Mamitsu extraction remain pending the requested browser sign-in and private API-key handoff. Imports remain disabled; no paid call was made. The first key handoff card timed out without a key. Vercel's login protection remains enabled and no access bypass was created. Full setup/recovery details are in MAMITSU.md.

## Real preview Google callback repair — November 4, 2026

The user's browser screenshot showed Google `Error 400: redirect_uri_mismatch` for the isolated preview Neon callback. The branch's custom Google OAuth client was copied from production but its authorized redirect list contained only the production Neon callback. In existing Google Cloud project `apat-512723`, added only `https://ep-rapid-surf-bay49p21.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth/callback/google` to that existing client's authorized redirects, saved, and reopened settings to verify persistence. Existing redirect entries and OAuth credentials were retained; no production Neon configuration or managed Auth tables were changed.

The subsequent real Google sign-in completed in the protected Vercel Preview and opened the approved account's private `/library`. Full navigation restored the session. Real browser reads of `/api/account`, `/api/recipes` and `/api/imports` each returned 200 with `Cache-Control: private, no-store`; two pre-existing snapshot recipes and zero imports were returned. This verifies the hosted login/read path, not a paid import or a second-account isolation test. Mamitsu remains disabled while its private existing-key handoff is pending; zero credits used.

## Import setup feedback and key activation — November 4, 2026

The user's screenshot showed an enabled import button returning to idle with a setup-required notice below the form. Live Vercel metadata confirmed the preview had no Mamitsu API key; that rejected submission did not reach the provider. The import list now exposes only a configuration boolean alongside owner-scoped receipts. The UI checks availability before enabling import/retry, explains unavailable setup beside the controls and disables further attempts if configuration disappears after load. Existing receipts and reviewed saves remain available.

All six required checks pass: 134 unit/PGlite tests, 24 lint-rule suites, build/lint/format/type checks and 58 desktop/mobile authored browser checks. New checks cover disabled setup, initial configuration loading, configuration removed after loading, secret-free availability and reading existing receipts while disabled. These fixtures make no paid calls.

The key arrived through a private handoff and was stored as a sensitive Vercel variable on this PR branch. Imports were enabled with the existing approved 33-credit ceiling. At the user's explicit request, the same key was separately stored for Production; no production activation or deployment was performed. Preview deployment `a4db914` is ready and its real authenticated import API returns `configured: true`. Mamitsu's balance was 495 credits immediately before the first live trial.

The subsequent real trials both succeeded: the screenshot's Reel produced a Spanish draft (4 ingredients / 8 steps), and the prepared YouTube recipe produced an English draft (5 ingredients / 6 steps, unknown servings retained). Both were opened in review and saved through the browser, restored after full navigation, and exported with 200/private-no-store responses. Comparisons verified original draft content, unchanged edits, source URL and extraction reference preservation without printing recipe content. Actual Neon reads confirm both saved rows and linked recipes.

Mamitsu Usage confirms successful extraction references `ext_dc089397-37b8-486e-adb6-ba156942d381` (1 credit) and `ext_9837dba6-af63-4437-914e-72591d5bddbd` (2 credits). Balance 495 → 492; period spend 5 → 8. No retry was issued. Matched the two exact saved receipts and verified provider charges before settling conservative holds to 1/2 under the admission lock; original reservations and the 33-credit ceiling remain intact. A guarded transaction attempted before the second save completed was explicitly rolled back; subsequent reads established both saved rows before settlement. See MAMITSU.md for limitations.

## Saved import display — November 4, 2026

Saved import receipts no longer repeat recipes above the notebook list. This is a display filter; no receipt, saved recipe or credit record is deleted. Older-page navigation remains available even if a page contains only saved receipts. Existing authored Instagram/YouTube browser flows now assert that a saved recipe remains accessible after reload while the redundant Imports heading and saved status are absent. All six required checks pass: 134 unit/PGlite tests, 24 lint-rule suites and 58 authored desktop/mobile browser checks. No additional paid request or external database change was made for this adjustment.
