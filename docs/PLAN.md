# Resumable implementation plan

Authority: `recipe-app-research.pdf`, Library `libfile_5d7fee3223d481918ee14157439bf735`, version 4, 23 pages, read in full. Last six pages define the delivery gates. Drizzle is required.

## Current delivery

- Private repo and isolated feature worktree, pinned Next 16 / React 19 / TypeScript 7 / Tailwind 4 / Base UI shadcn / pnpm / Oxlint-Oxfmt.
- Safe public Instagram caption adapter and repeatable local browser/media experiments; sample success described precisely in ACQUISITION.md.
- Runtime-validated recipe/evidence contract, unknown quantities, deterministic ingredient scaling and state-transition rules.
- Preliminary Drizzle schema plus local PostgreSQL/PGlite migration/admission/ownership experiment. This is not a production persistence layer. It reserves user/global budget and writes dispatch intent transactionally, tests duplicate/race handling, and preserves original evidence on edits. Numerical limits in the experiment are test policy only, not approved beta limits.
- Local fixture review/cooking/export UI. No login, import worker, model call, external storage or production API is connected. Browser persistence is for demonstration only, not a secure account library.

## Next gate: acquisition

1. Obtain 30–50 permitted public examples, including caption-poor, overlay-heavy, silent and narrated clips. Build human evidence answers.
2. Agree intended worker and authorized preview experiment. Test direct HTML and rendered public media separately. Do not assume the browser/FFmpeg path fits the default Vercel function.
3. Approve numerical inference budget and a current model route. Compare real extraction accuracy/cost before adding a paid provider. Keep paid calls off until then.

## Phase 1: secure vertical slice (pending)

- Read-only connection found existing Neon `apat` in Frankfurt (`sparkling-base-11618556`); no duplicate was created. Vercel search returned no project. Do not infer service activation, plan, or spare quota from these reads.
- Approval needed before creating/pulling persistent credentials, creating a dev branch, configuring Neon Auth/Google OAuth/private storage, applying external migrations, or deploying a Vercel preview. Existing account resources must be reconciled.
- Choose primary UI language and recipe translation policy; do not infer bilingual requirements from unrelated projects.
- Confirm beta invitations, region/retention, monthly/per-user spend, duration/size/concurrency and source-content policy. Current proposed stack remains Neon Auth/Postgres/Object Storage, Vercel hosting + AI SDK + one orchestration layer. R2, Supabase and OpenRouter alternatives remain in DECISIONS.md.
- Implement real server-auth identity and invitation enforcement, CSRF protection and owner-scoped recipe/import/media APIs. Do not expose the local database experiment as-is.
- Add production Drizzle adapter, unique attempts/ledger settlements, outbox reconciliation, transactional conditional transitions and cancellation. Ambiguous paid calls hold reservations until reconciliation; no blind retries. Define release/settlement policy, attempt limits and feature kill-switch before executing paid work.
- Add private direct uploads, signature/duration validation, explicit cleanup with reconciliation; do not rely on Neon's unenforced lifecycle expiration. Record branch/history deletion caveats.
- Add typed AI extraction behind a pinned adapter only after route/budget approval. Prompts treat source content as untrusted, tools disabled, original evidence separate from user edits. Jev optional and nonblocking.

## Phase 2: organizer

Authenticated library, collections, favorites, search, source attribution, field-level editing, export, cooking view and revocable hashed capture-only Shortcut credentials. User upload/text recovery must be a working route, not a disguised substitute for the Instagram-first goal.

## Release gate

Real Google login/invite denial; deployed source acquisition; two-user read/write/cancel/export/signed-object isolation; concurrent quota/idempotency tests; dispatch/restart/cancel/ambiguous-charge recovery; retry/cleanup failures; real model evaluation; Safari and physical iOS Shortcut; preview isolation; approved terms/retention and budget. Local tests and mock-free PGlite experiments do not prove any of these external integrations. No automatic merge or deployment.
