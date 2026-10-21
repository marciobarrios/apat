# Private recipe foundation and setup gates

This milestone implements the account and recipe foundation from [PLAN.md, Phase 1](PLAN.md#phase-1-secure-vertical-slice-pending). The user has now approved reuse of the existing production database branch for local integration testing. Its app migrations and restricted roles are installed; secure local credential activation, real Google sign-in/enrollment and one-account save/reload/edit/export are verified locally; two-real-account and cross-device verification remain pending. See [production setup status](NEON-PRODUCTION-STATUS.md) and the preserved [development setup history](NEON-DEV-STATUS.md). AI extraction, Instagram ingestion, storage, paid processing, merging and deployment are outside this milestone.

## Reconciled state before approved setup — October 20, 2026

- Local `main` and GitHub `main`: `c6a3e733372b6e3b52133679092d28e739198502`, checked before implementation. Existing main checkout was clean; the earlier acquisition worktree was preserved.
- Neon: reused metadata for project `apat`, `sparkling-base-11618556`, AWS Frankfurt (`aws-eu-central-1`). Only branch found: `production`, `br-misty-paper-bacbzyhs`.
- Managed Better Auth is already enabled on that branch. The redacted configuration reports Google shared development OAuth, email/password disabled, no trusted application origins, localhost permitted. This is configuration evidence, not a successful login test.
- Vercel: existing project `apat`, `prj_SuUclQl0K73R1ur4GiSGbKkKNpsF`, has a READY production deployment. Metadata lists `apat-self.vercel.app`. Its environment-variable list is empty. No values were decrypted or pulled.
- This section records the pre-setup baseline. Subsequent approved development work is recorded in NEON-DEV-STATUS.md; approved production migrations, role grants and pooling are recorded in NEON-PRODUCTION-STATUS.md. Production reconciliation used read-only catalog/count SQL before those approved changes.

## Implemented boundary

The initial library response bundles account and recipes from one verified server identity. Subsequent UI reads/writes/export include an expected-account assertion; a mismatch rejects the request before any recipe operation. This assertion can only reject stale context, never choose an owner. New snapshots and detected account changes invalidate in-flight operations and clear stale creation keys.

`@neondatabase/auth` provides the same-origin auth proxy and Google client. The SDK middleware handles OAuth verifier exchange on `/library`. Every private API independently checks the server session with cookie-cache bypass, requires a verified identity, and derives the owner from its stable Neon subject. `memberships.id` is that subject; `active = 1` is a separate, server-controlled entitlement. Login does not grant membership, and no HTTP endpoint can enroll a user.

The app uses Drizzle with node-postgres and Vercel pool lifecycle support. Privileged clients are server-only. Recipe list/get/create/update/export queries enforce owner and active membership. A per-owner creation key and content hash make retries idempotent; conditional version updates reject stale edits. Original evidence stays immutable when the edited recipe changes. List pagination is bounded to 20 recipes. Cookie mutations require the configured exact origin; bodies and response data are runtime validated, JSON writes are bounded to 256 KiB, and private responses use `private, no-store`. Error bodies omit database/provider diagnostics.

The home page is an account library. Invited users can manually add recipes, preserve their written evidence and unknown amounts, edit, reload and export. `/sample` retains the authored browser-only demonstration; its localStorage content is never silently migrated to an account. Cloud recipes are not written to localStorage. The UI retains failed drafts for retry and clears displayed private data when an account change is detected.

`drizzle/0001_sleepy_justice.sql` adds creation key/hash/timestamp, owner indexes and a positive-version constraint. It is additive; no auth-managed tables are altered. Both migrations were validated in disposable PGlite tests; their subsequently approved remote execution is recorded in the setup status documents. The earlier import/budget/admission experiment stays disconnected from HTTP.

## Approval A: isolated Neon development setup

**Approved and partially completed.** See [current setup status](NEON-DEV-STATUS.md) for the actual branch, real migrations, restricted roles and remaining blockers. The originally proposed destination was: a new `dev-neon-private-library` branch inside existing project `sparkling-base-11618556`, Frankfurt. Do not create another project or use the production connection.

Before execution, obtain approval for these concrete actions:

1. Create a schema-only development branch, with no production recipe/auth rows copied. Prefer seven-day expiry, 0.25 CU compute maximum and five-minute suspension where supported by the account. Reconcile actual plan/branch limits first; do not upgrade or substitute a data-copying branch if unavailable. The current MCP create tool only supports copying parent data, so it is not suitable for this schema-only action. Use an approved supported CLI/Console/API path; the Neon CLI is not installed in the current environment.
2. Enable or reconcile Managed Better Auth **on the new branch only**, with Google shared development OAuth, email/password disabled and only the exact local origin `http://127.0.0.1:3026`. Verify it has a different Auth endpoint and empty user/session state. This is an auth/access change even though production already has Auth.
3. Create an application Postgres role scoped to this development database. Grant only schema usage, membership SELECT, and recipe SELECT/INSERT/UPDATE. Do not give it membership management, migration ownership, auth schema access or import/budget access. Use a separate migration role. Acquire the branch's pooled app URL and direct migration URL through a secure local mechanism, without printing values or pasting them into chat.
4. Generate a development-only cookie secret and store server config in ignored `.env.local` in this isolated worktree, with restrictive permissions. Names are in `.env.example`: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `APP_ORIGIN`. Use the new branch's endpoints only. Keep app and migration credentials separate; the app never reads the unpooled URL. No persistent secrets have been created yet.
5. Inspect the new branch's migration state, then apply the reviewed Drizzle migrations **only there**. If its schema already contains tables without the matching migration journal, stop and reconcile rather than pushing/resetting schema. Never run a migration during install, build, startup, CI or a request.
6. Obtain the specific two Google test identities the user authorizes. After each completes real sign-in, verify its stable Neon subject, then explicitly enroll those subjects in the development `memberships` table. Test an uninvited third identity or revoke one test membership. Do not infer invite approval from authentication or email ownership.

Creating a branch and generating/persisting credentials are separate action-time approvals in the original request and AGENTS.md. Permission for source code and a draft PR does not authorize these actions. Exact returned branch/endpoint IDs must be checked before credentials or migrations are used.

After approval and secure config, migrations can be run deliberately with the direct URL loaded only into the migration process:

```sh
node --env-file=.env.migration.local node_modules/drizzle-kit/bin.cjs migrate
pnpm dev
```

`drizzle.config.ts` refuses a pooled or non-Neon migration URL. It does not load environment files automatically. Review the actual destination securely before executing the command; never print the URL. No migration command has been executed against Neon.

## Approval B: preview setup and deployment

Separate approval is needed to configure persistent Vercel preview variables/trusted origins and deploy. Destination would be **only** project `prj_SuUclQl0K73R1ur4GiSGbKkKNpsF`, preview environment scoped to `feat/neon-private-library`, pointing at the approved development branch. Keep existing production variables/settings untouched. Use an exact protected preview origin and a distinct preview cookie secret; never broad Vercel wildcard trusted origins. Approve the preview hostname and Google redirect configuration before writing them.

`vercel.json` disables automatic Git deployments for `feat/neon-private-library`, so publishing the code/draft PR can proceed without a preview. It does not change the main branch deployment policy. Re-enable this branch only with deployment approval. No merge or deployment is authorized by this handoff.

Shared Google OAuth is for development. Public/production use needs separately approved owned Google OAuth configuration and Neon production checklist review. No Google Cloud grants or credentials are created in this milestone.

## Required real integration evidence

Once Approval A is granted, exercise actual Google sign-in/cancel/sign-out/revocation and session restoration in the approved local HTTPS/browser configuration as needed. Confirm invitation denial and two-user list/read/edit/export isolation, save/reload from a fresh browser/device, concurrent duplicate creates and stale edits, rejected CSRF and expired sessions. Verify the runtime role cannot edit memberships or provider-managed auth tables. Record branch IDs and result codes without secrets or user recipe bodies.

Approval B would then allow the same tests on the protected preview, including branch/auth isolation from production. Physical iOS/Safari and real cross-device access are still unverified. None of the local checks below establishes live Neon, Google or Vercel integration.

## Local verification

- Lint, Oxfmt, TypeScript and local production build pass without service credentials.
- Vitest: 107 tests, including ten new private-library API/database tests executing the shared handlers/services against actual embedded PostgreSQL/PGlite. Identity is explicitly supplied in tests. Tests cover anonymous/unverified/uninvited/revoked access, two-user isolation, save/reload/export, immutable original evidence, idempotency, concurrent creation/update, pagination, CSRF, malformed/oversized bodies and sanitized failures. A restricted PostgreSQL role can save/edit recipes while membership UPDATE, import reads and recipe DELETE remain denied.
- All 24 vendored lint-rule suites pass.
- Browser: 30 checks pass (15 scenarios × desktop/mobile), covering the authored sample plus mocked-account flows at desktop and iPhone-sized Chromium viewports. These are HTTP interaction tests, not OAuth success or remote persistence tests. Screenshots live in ignored `artifacts/` and contain authored fixture data only.
- Production has no test recipe/account data written. Its approved additive schema/grant/pooler changes are recorded in NEON-PRODUCTION-STATUS.md.

The installed Neon Auth SDK is `0.6.0-beta`; its transitive optional UI dependency reports peer mismatches for newer Better Auth API-key/better-call packages and a TypeScript-5-only logger. This app imports the Auth SDK API entry points, not that UI. Runtime auth behavior still requires the real test above; do not force dependency overrides without checking provider compatibility. `core-js`'s optional install script is disabled; esbuild remains the sole allowed dependency build script.

## Official references checked

- [Neon Next.js API quickstart](https://neon.com/docs/auth/quick-start/nextjs-api-only)
- [Neon Next.js server SDK](https://neon.com/docs/auth/reference/nextjs-server)
- [Neon Drizzle connection and migration guide](https://neon.com/docs/guides/drizzle)
- [Neon schema-only development branches](https://neon.com/docs/guides/branching-schema-only)
- [Vercel branch deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
