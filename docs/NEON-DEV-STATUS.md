# Neon development setup — October 20, 2026

The user approved the development-only setup and selected `marciobarrios@gmail.com` as the single test account. This approval does not authorize Vercel changes, production changes, paid commitments, merging or deployment.

## Completed on the real development database

- Existing project: `apat`, `sparkling-base-11618556`, AWS Frankfurt.
- Created through Neon Console with **Branch schema only** selected: `dev-neon-private-library`, `br-patient-dew-bamsovs7`.
- The branch is an independent root with `init_source = parent-schema`; it has no production row/history copy. Its expiry is **2026-10-27 10:41:30 UTC**.
- Endpoint: `ep-blue-boat-batau7qj`. Compute minimum/maximum are both 0.25 CU; transaction pooling is enabled. The account rejected changing the suspension interval (HTTP 412). Its existing provider-default suspension configuration was retained; no upgrade was performed.
- Before migrations, the public schema had no application tables or migration journal. The copied `neon_auth` schema had zero rows in each of its nine tables, including users, sessions, accounts, keys and configuration.
- Applied the two reviewed repository migrations to this development branch only. SQL and journal metadata were read with Drizzle's `readMigrationFiles`, then sent through Neon's transactional SQL transport under the restricted schema role. This was not `drizzle-kit migrate` using a local credential. Journal entries match the Drizzle files:
  - `0000`: `8c0138c360406859acb07e37e170da4dccda8794e0bbd45b31c7c0a04ff26e5e`
  - `0001`: `48c8278aa7a3bd05aa94ff650070abeabb29a7c86b3aa9c80f013fdbe1e5af34`
- Created SQL-managed `apat_dev_schema` and `apat_dev_app`, both currently **NOLOGIN**, without superuser/role-creation/database-creation/replication/RLS-bypass attributes or inherited admin memberships. The schema role owns the application/migration objects and has development-schema DDL privileges. The app role has schema usage, membership SELECT, and recipe SELECT/INSERT/UPDATE only.
- Real PostgreSQL privilege checks confirm: membership UPDATE denied; recipe DELETE denied; import reads denied; provider-managed auth reads denied; application DDL denied.

Neon API-created roles automatically inherit `neon_superuser`. The two temporary API-created roles were removed before local use; only the restricted SQL-managed roles remain. Their temporary credentials are no longer valid and were not persisted.

## Protected local configuration

The following files exist only in the isolated worktree, are ignored by Git, and each has mode `0600`:

- `.env.local`: newly generated cookie secret and pooled `apat_dev_app` URL; Auth URL remains empty.
- `.env.migration.local`: direct URL for the separate restricted `apat_dev_schema` role.
- `.env.role-activation.sql`: a one-time, locally generated credential activation script for those two roles, to be applied by the user **only** in the development branch's Neon SQL Editor. It contains secrets; never paste its contents into chat, logs, a PR or a command argument. Delete it after successful activation.

Credentials were generated inside the local process and written directly to protected files. Their values did not appear in command arguments or output. The URLs are not usable until the roles are activated. Builds and ordinary CI do not activate credentials, apply migrations or contact Neon.

## Blocker 1: empty Auth schema cleanup approval

Managed Better Auth provisioning returned HTTP 409 because the schema-only branch contains the copied, empty `neon_auth` schema. Auth is not enabled on the development branch. All nine tables have been verified empty. Neon requires removing that schema before provisioning a fresh integration.

**Pending, not attempted:** `DROP SCHEMA neon_auth CASCADE` on **only** `br-patient-dew-bamsovs7`. This is a new destructive schema-cleanup action, so explicit approval is needed. Production `br-misty-paper-bacbzyhs` must not be targeted. After approval, recheck emptiness, remove only this empty copied schema, provision fresh development Better Auth, reconcile shared development Google OAuth and the exact local origin, then securely write the public branch Auth URL.

`marciobarrios@gmail.com` has not been created or enrolled yet. No substitute test account was used. Enrollment must follow a verified Google sign-in and stable subject mapping, or a specifically approved supported directory operation. Real sign-in/cancel/sign-out and invited/uninvited behavior remain pending.

## Blocker 2: secure credential activation handoff

Automatic approval review rejected a proposed local setup command because it embedded a bootstrap database password in command arguments. That command did not execute. It was not retried with encoded or indirect secret transport.

The safer alternative is prepared: credentials are generated locally, stored only in the protected files above, and the user applies the protected activation SQL through the development Neon SQL Editor. The agent has not transmitted this credential-bearing SQL through a tool. This handoff does not require posting a secret in chat or creating an account-wide CLI/API credential. The broader setup approval remains valid; it does not authorize exposing a password in tool arguments.

Once the user confirms activation, verify the local runtime connection without printing credentials; ensure the role's privileges remain restricted. Then exercise actual Drizzle save/reload/export and two-owner denial with authored test data, keeping those results separate from mocked-auth browser tests. The current evidence proves real migrations and database grants, not authenticated application persistence or cross-device access.

## Production and hosting boundary

No SQL was executed on production. No production rows, Auth settings, credentials or grants were changed. The existing Vercel project was not configured or deployed. Feature-branch automatic deployment remains disabled in `vercel.json`. PR #2 remains draft; no merge or auto-merge was requested.
