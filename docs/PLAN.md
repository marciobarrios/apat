# Resumable implementation plan

Last reconciled: **October 21, 2026 (Europe/Madrid)**. This is the current handoff for continuing Àpat. Read the completed work and next steps here before interpreting older research or chronological verification entries.

Authority: `recipe-app-research.pdf`, Library `libfile_5d7fee3223d481918ee14157439bf735`, version 4, 23 pages. Sections 17–22 define the staged delivery gates; sections 1–16 are dated research. Drizzle is required. Current implementation evidence takes precedence over the report's old “not implemented” statements; verify current official SDK/model documentation before choosing a new route.

## How to resume

When asked to continue from this plan, **start the unfinished Instagram acquisition and Gemini extraction milestone below**. The user does not need to name a milestone or repeat the conversation. First:

1. Read `AGENTS.md`, this file, [DECISIONS.md](DECISIONS.md), [ACQUISITION.md](ACQUISITION.md), and the latest checkpoint in [NEON-PRODUCTION-STATUS.md](NEON-PRODUCTION-STATUS.md) / [VERIFICATION.md](VERIFICATION.md).
2. Inspect current Git status, worktrees, remote main, PR #2 and deployment/configuration metadata. Preserve local work; use an isolated branch/worktree. Reuse the completed foundation rather than starting again from an older main checkout. The repository is `/Users/marcio/Developer/apat`; the current foundation worktree is `/Users/marcio/Documents/Codex/2026-10-20/task-2/apat` on `feat/neon-private-library`. Reconcile these paths rather than assuming they remain available.
3. Start with acquisition fixtures/corpus planning and a typed Gemini adapter/evaluation harness without paid calls. Continue independent code/tests while a specific external action or decision awaits approval. Ask only for information or authorization needed by the affected step, not which milestone to choose.
4. Update this plan's completed/missing work and evidence after each milestone. Keep one clear next action; do not append contradictory current-status summaries.

This plan records the work and its order. It does not grant new credentials, spending, infrastructure, migrations, access changes, merging or production deployment permission. Vercel PR preview deployments are pre-approved under AGENTS.md.

## Product goal and intended flow

Àpat is an **Instagram-first private recipe notebook**, initially for an invited family/friends beta. The intended flow is:

**Reel link → authorize/deduplicate/reserve budget → acquire caption + usable video/audio → Gemini extracts a structured draft → validate evidence and unknowns → user reviews/edits → save privately in Neon.**

The job must continue after the page/share sheet closes. Preserve source language, attribution, original evidence and user edits. Upload/pasted-text recovery can supplement Instagram; it must not silently replace the Instagram goal. No social feed, nutrition coaching, meal planner, chatbot or autonomous extraction agent is in this scope.

## Last verified repository and service state

These are checkpoints to reconcile, not assumptions about a future session:

| Area               | Verified state                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository         | [PR #2](https://github.com/marciobarrios/apat/pull/2) is open and unmerged. The current PR head is authoritative; both CI runs passed for the earlier OAuth checkpoint `6a333e8b05409f33a395e685ec2249046006cb40`. An account-scope review fix and its newer checks are recorded in VERIFICATION.md; inspect current CI before merging. Remote main was still `c6a3e733372b6e3b52133679092d28e739198502`. This plan update is on the same feature branch. |
| Neon               | Existing `apat`, project `sparkling-base-11618556`, Frankfurt; active local integration uses `production` / `br-misty-paper-bacbzyhs`, with the user's explicit approval. Both Drizzle migrations, pooling and restricted app/schema roles are configured. Do not create another project or repeat setup.                                                                                                                                                 |
| Local app          | `http://127.0.0.1:3026`; real Google sign-in, explicit enrollment and one-account cloud save/reload/edit/export verified. Local server availability and browser sessions are temporary; check before opening.                                                                                                                                                                                                                                             |
| Vercel             | Existing `apat` production deployment still serves the earlier UI. No deployment or Vercel configuration was performed in this milestone; its env list was empty when inspected. The earlier branch deployment blocks were removed with explicit approval on November 4; PR previews are pre-approved. Recheck hosted configuration before future setup.                                                                                                  |
| Development branch | `dev-neon-private-library` / `br-patient-dew-bamsovs7` is preserved separately. Fresh Auth provisioning failed after approved empty-schema cleanup. Expiry was October 27, 2026, 12:41 Europe/Madrid. Do not retry provisioning, delete it or reuse its credentials as a shortcut.                                                                                                                                                                        |

Protected local files already hold the approved app/Auth configuration, with mode 0600. Do not print, commit, paste into chat, rotate or recreate their values. See the setup status for safe inspection and outcome reconciliation.

## Completed foundation

- [x] Pinned Next.js / React / TypeScript / Tailwind / shadcn with Base UI / pnpm / Oxlint-Oxfmt stack, required Drizzle schema/query/migration layer, CI and isolated worktrees.
- [x] Recipe/evidence runtime contracts, original-versus-edited content, explicit unknown values, deterministic ingredient scaling and cooking view. EN/ES/CA authored contract fixtures preserve language and missing facts; they do not demonstrate model understanding.
- [x] Bounded public Instagram caption/source adapter plus deliberate anonymous browser/media research on **six supplied Reels**. Captions and decodable audiovisual media were acquired locally; this is a small feasibility sample, not a cloud reliability benchmark. See [ACQUISITION.md](ACQUISITION.md).
- [x] Preliminary import admission/budget/outbox/state-transition groundwork and local PostgreSQL/PGlite race/ownership tests. This experiment is **not connected to a live import endpoint, worker or paid provider**; its numbers are test policy, not approved beta limits.
- [x] Real Google/Neon Auth, stable verified identity, server-controlled subject-based membership and a restricted server-only Drizzle/Postgres connection.
- [x] Private recipe list/read/create/edit/export APIs: owner and active membership checks, exact-origin CSRF checks, bounded validated payloads, pagination, idempotent create keys, optimistic versions, private/no-store responses and sanitized errors. Initial account/list loading shares one server identity; later UI operations reject a changed account before reading/writing under it.
- [x] Real local OAuth callback/session exchange, including the home-page verifier routing fix. The signed-in invitation gate denied access before enrollment of the single approved verified account.
- [x] Real manual recipe creation, full reload/session restoration, edit cancellation, saved edits and JSON export. One labeled authored connection-test recipe remains in that account; version 2 and unchanged original evidence were checked in Neon.
- [x] Lint/format/types, 109 unit/PGlite tests, 24 lint-rule suites and 36 desktop/mobile browser checks. Ordinary browser tests use mocks/authored callback fixtures. Separate live browser/Neon evidence establishes the one-account flow above. The older OAuth checkpoint passed both CI runs; recheck the current PR head after the account-scope fix.

**Usable now:** the configured local private notebook accepts manual recipes and stores them in Neon. `/sample` is a browser-only authored demo. Its Instagram demo form explicitly makes no request and is not evidence of a working importer. The November 4 notebook redesign removes the stale “Google not connected” banner and preserves the separate private-library and authored-sample flows.

## Phase 1: secure vertical slice (pending)

The identity/manual-library foundation is complete at the evidence level above. The **next product milestone is real Instagram acquisition plus Gemini extraction**, followed by the durable authenticated import flow. Work in this order; keep external actions behind their specific approvals.

### 1. Prove acquisition in the intended runtime — next

- [ ] Audit existing source adapters/scripts and define the evidence handoff: canonical source ID/URL, caption, acquired modalities, provenance, timestamps, warnings, typed failure and private object references where applicable. Preserve current DNS/redirect/byte/time/MIME/duration bounds.
- [ ] Prepare a permitted corpus toward 30–50 representative Reels and human ingredient/step evidence answers. Cover complete/incomplete captions, overlays, narration, genuinely silent clips, EN/ES/CA, missing/expired media, removed/private/login-gated sources and malicious/oversized inputs. Keep creator media, captions and signed URLs outside Git/logs; request additional authorized examples if needed.
- [ ] Verify acquisition from the intended worker/runtime under an approved experiment. The local success required rendered JavaScript and separate video/audio tracks; a Vercel HTTP fetch alone has not been proven. Compare one suitable worker with the proposed Vercel Workflow route before provisioning anything.
- [ ] Record caption/audio/video success separately, usable playback, expected narration, failures and latency. No private endpoints, personal browser cookies, login-wall bypass or paid fallback without approval.

**Exit evidence:** a dated corpus/runtime report with explicit failures and bounds. Six local successes or HTTP 200 must not become a general reliability claim. If acquisition fails, bring concrete evidence and options to the user while continuing unaffected code/tests; preserve the Instagram-first goal.

### 2. Implement and evaluate Gemini extraction

- [ ] Prepare a typed extraction interface, versioned prompt/schema, deterministic validation, human answer keys and a repeatable evaluation harness. Unit fixtures/mock provider results are labeled tests, never a successful live import.
- [ ] Verify current official Gemini model/media support and AI SDK provider APIs. Gemini is the intended model family. Select and pin the exact model and route after comparing direct Google with Vercel AI Gateway for the required video/audio/file inputs; routing parity and credentials are not assumed. Research model IDs/prices are dated, not current commitments.
- [ ] Obtain the specific route, secure credential setup and numerical trial budget before live/paid calls. Prepare all independent implementation and a concrete bounded trial proposal first; do not ask the user to paste keys into chat.
- [ ] Run the approved comparison on real permitted evidence. Start with caption plus audiovisual content in one multimodal call when supported. Add a stronger-model/targeted-frame retry only when measured evidence justifies it; avoid mandatory transcription/OCR/extraction/verification calls for every Reel.
- [ ] Measure ingredient/quantity/step accuracy, conflicting/missing evidence, language preservation, schema rejection, latency and actual cost per useful recipe. Preserve unknown quantities/yield/time and original text. Treat source content as untrusted data, disable tools, and keep model suggestions distinct from source facts.

**Exit evidence:** a real measured model/route decision, approved limits, representative outputs against human answers and explicit unsupported cases. No claim of Gemini extraction from schema round-trips or mocked responses.

### 3. Connect the secure, durable import flow

- [ ] Review/extend Drizzle admission groundwork for production: owner-only import/status/cancel APIs, entitlement checks, canonical URL/idempotency, per-user/global attempt/concurrency limits, reservations, unique attempt/settlement records and transactional dispatch/outbox reconciliation. Review new migrations and obtain approval before external application.
- [ ] Add the approved private media path, signed upload/download authorization, MIME/signature/size/duration verification, bounded worker handoff and explicit expiry/cleanup reconciliation. Store object keys, not signed URLs. Neon Object Storage is proposed, not configured; validate its current deletion/lifecycle/branch-retention behavior before relying on it.
- [ ] Use one durable orchestration layer. Return an import receipt promptly; persist progress/draft in Postgres so navigation or worker restart does not lose it. Recheck entitlement/cancellation before each paid stage.
- [ ] Implement conditional lifecycle transitions: `queued → acquiring → extracting → validating → needs_review → ready`, plus `failed`, `cancelled` and a reconcilable `paid_outcome_unknown` hold. Coordinate SDK/gateway/worker retries; do not repeat an ambiguous charge or release its reservation blindly. Cleanup failures have separate retry state and do not erase a saved recipe.
- [ ] Wire the authenticated Instagram UI to actual admission/status/review/save only after the prerequisite gates pass. The sample now labels its nonfunctional import form explicitly; never show the fixed chickpea sample as an extracted result.
- [ ] Preserve imported evidence/draft separately from edits; a re-import proposes a new version. Draft editing makes no model call. Optional categorization failure cannot block saving a recipe.

**Exit user story:** an invited user signs in, submits a Reel, leaves the page, returns to real progress, reviews an extracted draft and saves it privately. Duplicate shares, dispatch failure, worker restart, cancellation, timeout/unknown paid outcome and cleanup failure have tested recovery paths.

### 4. Complete hosted beta setup and release verification

- [ ] Approve and configure owned production Google OAuth and exact trusted origins; shared development Google OAuth is only the current local test setup.
- [ ] Approve scoped Vercel secrets/configuration and production deployment, then verify browser → API → worker/storage/model → Neon in that exact environment. Existing main/Vercel deployment is not the connected local feature branch. Verify preview data/auth/media isolation before using a preview.
- [ ] With specifically approved test identities, exercise two-real-account recipe/import/cancel/export/media denial, uninvited/revoked membership, real sign-out/session revocation and auth failure/cancel/retry. PGlite ownership checks and mocked UI checks remain separate evidence.
- [ ] Test cross-device access, mobile Safari/physical iOS, keyboard/focus/screen-reader labels, source attribution and actual import error/partial states.
- [ ] Confirm beta invitations, provider terms/region/retention, primary UI language versus source translation policy, monthly/per-user budget and duration/size/concurrency/attempt limits. Add the agreed feature/spend kill switches before inviting others. No proposed numerical target is automatically approved.

No merge, auto-merge, paid plan change or production deployment follows automatically from finishing code or this plan.

## Phase 2: organizer and capture

Recipe editing, deterministic serving scaling, basic cooking/checklist view and JSON export already exist. Remaining organizer work follows the working Instagram vertical slice:

- [ ] Collections, favorites, Postgres search/filters, creator/source attribution and clear inbox/review/failed/partial states.
- [ ] iOS Shortcut capture using revocable per-device capture-only credentials hashed at rest; immediate receipt, owner/rate/budget enforcement, minimal response, no embedded Google/database/model secrets. Verify on a physical device.
- [ ] Markdown export and any agreed display-language/translation policy, preserving original evidence.
- [ ] Optional Jev taxonomy only after measuring value against tags from the existing extraction call. Keep deterministic numerical filters out of model classification. Public sharing, households and broader product expansion remain deferred.

## Verification and approval discipline

Run the checks required by `AGENTS.md` for code changes: lint, format, types, unit/integration tests, build and applicable browser flows. CI uses fixtures/mocked paid services and the default build. The local execution sandbox sometimes blocks Turbopack worker ports; the verified webpack fallback is documented, without changing the application's configured builder. Documentation-only edits need format/link/status review rather than new application tests.

Label evidence as authored fixture, mocked HTTP/provider, local PGlite, real local Neon/Google, intended-worker experiment, deployed flow or physical device. A green build or a signed-in screenshot does not establish a real import. Record cost and unsupported cases only when measured.

Completed approvals covered the recorded Neon setup and the one approved account; do not request them again for already completed actions. New credentials/access scope, additional identities, external migrations, private storage/worker setup, paid inference/vendors, preview/production service configuration or production deployment require the appropriate explicit approval at the affected step. Ordinary Vercel PR preview deployments are already approved and must not prompt for permission again. Before requesting it, prepare the exact action, destination, budget/limits and reviewable code. Check uncertain outcomes before retrying; never bypass a denied action through different secret transport or scope.
