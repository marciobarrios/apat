# Resumable implementation plan

Last reconciled: **November 4, 2026 (Europe/Madrid)**. This is the current handoff. Read README, this plan and [ACQUISITION.md](ACQUISITION.md) first. Required stack: Next.js/React/TypeScript, Drizzle/Postgres, Tailwind/shadcn Base UI, pnpm, Oxlint/Oxfmt. Preserve feature branches and unrelated work.

## Current direction

The user requested **Mamitsu** for Instagram and YouTube imports, alongside manual entry. This replaces the earlier proposed direct-source/Gemini route for the first usable import slice. Keep historical source adapters/research; do not provision a browser worker, storage, gateway or another model route as part of this integration. [MAMITSU.md](MAMITSU.md) defines the current contract, credit accounting, runtime limits and exact preview activation steps.

**Intended flow:** invited verified account → canonical video URL → reserve conservative credits/deduplicate → persisted receipt → one Mamitsu request → validated draft → human review/edits → private recipe save with original evidence retained.

## Verified repository/service state

- PR #2 is merged; remote main and this feature's starting point are `890c1e2`. The current worktree is `t3/mamitsu-recipe-import`. Older handoff paths/branch states are historical.
- Existing Vercel project `apat` has a ready production deployment. Initial inspection found no preview variables; Neon later auto-created branch-scoped database variables. The approved activation now configures this PR branch only, with a restricted application connection and isolated Auth/cookie/origin/credit settings. Only `feat/neon-private-library` is disabled in `vercel.json`.
- The November 4 Mamitsu Usage inspection was read-only and used the user's explicitly signed-in T3 browser. Existing requests/schemas informed the adapter; they are not live tests of this implementation.
- Historical production setup and one-account local manual-storage evidence are in [NEON-PRODUCTION-STATUS.md](NEON-PRODUCTION-STATUS.md). Production setup was not repeated. The approved current work applied migration `0002` and restricted role grants only to the verified isolated preview branch; its Auth origin was already trusted.

## Completed implementation

- [x] Existing verified-session, explicit invitation, account-scope, exact-origin CSRF, bounded payload and owner-scoped manual recipe list/create/read/edit/export foundation.
- [x] Backward-compatible recipe/evidence schema: original phrases, unknown amounts/time/yield, ranges, language and deterministic scaling. Optional import attribution adds provider/creator/extraction/schema reference.
- [x] Mamitsu REST adapter with a versioned supported JSON Schema, strict local validation, source binding, fixed endpoint, bounded response/deadline and sanitized failures. No SDK/retry/media-storage dependencies added.
- [x] Drizzle migration `0002` and PostgreSQL import services: atomic admission/credit reservations, duplicate-source/key handling, concurrency/attempt limits, queued claim/cancellation, conservative uncertain outcomes, owner reads, review saves and separate original versus edited recipe content.
- [x] Instagram Reel/YouTube import UI, restored receipts, pending/review/failure states, source attribution, review/edit/save, unknown-serving handling and manual entry retained. `/sample` remains an authored browser-only fixture, never an import result.
- [x] Authored provider, PGlite and desktop/mobile browser coverage. These are code-contract checks, not provider accuracy or Neon/Vercel integration evidence. See [VERIFICATION.md](VERIFICATION.md) for the final run.

## Next action: finish approved preview activation and verify

1. The user approved preview-only setup and up to 33 existing Mamitsu credits. Actual Postgres settings confirm isolated preview branch `br-summer-shadow-ba3j33yn`; migration `0002` and a restricted runtime role are applied and verified. Auth/origin/cookie/credit variables are configured only for this feature branch. The exact origin was already trusted in the snapshot. See MAMITSU.md for the live setup evidence.
2. Real preview Google login/session restoration and authenticated account/recipe/import reads are now verified after adding the exact preview callback to the existing custom Google OAuth client. Finish the secure existing-Mamitsu-key handoff; imports remain disabled until then. The app must use `APAT_DATABASE_URL`: Neon regenerates its default owner URL on redeploy. Regression tests enforce the override and owner-role refusal.
3. Install the key, enable and redeploy the preview, then verify one Reel and one YouTube video within the 33-credit ceiling, provider usage, restored receipts and review/save/export. Keep model accuracy/failure observations separate from authored fixtures. No production promotion or merge follows automatically.

## Remaining product acceptance

- Next.js `after` dispatch is a bounded preview implementation, **not a durable retrying worker**. Persisted receipts protect against duplicate paid calls. Unclaimed interruption expires safely; claimed interruption becomes a held unknown outcome requiring operator reconciliation. Add approved durable orchestration/recovery before claiming the full leave/restart/resume story is reliable. Do not introduce retries around an ambiguous provider charge.
- Actual credit settlement is conservative because Mamitsu's documented response lacks a charge amount. Reconciliation/admin tools, retention/account-erasure automation and a representative multilingual accuracy/runtime evaluation remain beta work.
- Confirm two-real-account isolation, actual revocation/sign-out failures, cross-device, physical iOS/Safari, keyboard/screen-reader behavior and creator evidence. PGlite and mobile Chromium mocks do not prove these live outcomes.
- Verify managed Auth patch level and re-audit pre-existing transitive advisories before beta release; current reachability assessment is in MAMITSU.md.
- Agree invitations, provider terms/region/retention and operating limits before inviting others. Then collections, favorites, search/filters and iOS capture credentials can follow the working import slice. No social feed, meal planner, nutritional inference or AI-generated imported-dish photography is in this scope.

## Historical acquisition evidence

[ACQUISITION.md](ACQUISITION.md) records six local anonymous-browser Instagram acquisitions. These showed caption/playable-media feasibility on one Mac, not production reliability or model extraction accuracy. The old admission experiment remains separate from the live Mamitsu service. Keep creator captions/media and signed URLs under ignored `research/`/`artifacts/`; never commit or log them.

## Required checks

`pnpm lint`; `pnpm format:check`; `pnpm typecheck`; `pnpm test`; `pnpm build`; `pnpm test:browser`.

Browser tests use the built server and authored fixtures without paid services. PGlite verifies local PostgreSQL behavior, not Neon integration. Builds/startup/CI never migrate or provision services. No paid inference, credentials, external migrations, grants, provisioning or production deployment without explicit approval.
