# Neon development setup — October 20, 2026

Current target: the user subsequently approved configuring the existing production branch. See [actual production setup and remaining handoff](NEON-PRODUCTION-STATUS.md). The development history below is preserved; do not activate its credentials for the current test.

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

## Auth cleanup completed; fresh provisioning still blocked

The user explicitly approved permanent deletion of the empty development `neon_auth` schema and its nine empty tables. Immediately before deletion, branch identity was checked, all nine row counts were zero, and no external schema dependencies were found. Cleanup locked the tables and repeated the object-count, emptiness and dependency guards in the same transaction before `DROP SCHEMA neon_auth CASCADE`. This succeeded only on `br-patient-dew-bamsovs7`.

Fresh Better Auth provisioning then returned HTTP 412, `permission denied for database neondb`. Follow-up reads confirm that the development Auth schema is absent and Auth is not enabled. The database owner is still `neondb_owner` and has CREATE privilege; internal `neon_auth`/`neon_service` roles can connect but lack database CREATE. This is diagnostic evidence, not proof of the provider's exact failing statement. No internal provider-role grants were broadened and provisioning was not blindly retried.

`marciobarrios@gmail.com` has not been created or enrolled. No substitute test account was used. Real sign-in and authenticated persistence remain pending.

## Recommended target after the user's latest direction

The user said the unused production branch may be used if simpler. Read-only reconciliation of `production` (`br-misty-paper-bacbzyhs`) found its existing Better Auth enabled, shared development Google OAuth present, email/password disabled, localhost permitted, zero auth users/sessions/accounts, and no public application tables or Drizzle migration journal. Reusing this existing Auth is the simplest sound path. No production schema/data was deleted or changed.

The earlier approval for persistent credentials/configuration named the development branch. Before setting ongoing local access to the different production target, approve that exact branch for restricted app/migration credentials, protected local URLs/Auth URL/cookie configuration and enrollment of the verified approved Google subject. Additive migrations target the verified-empty application schema; they must not modify the existing managed Auth schema. Vercel settings, deployment, merging and paid changes remain outside scope. Preserve the development branch and its prepared files until this target decision is settled.

## Blocker 2: secure credential activation handoff

Automatic approval review rejected a proposed local setup command because it embedded a bootstrap database password in command arguments. That command did not execute. It was not retried with encoded or indirect secret transport.

The denial was specifically about password exposure in command arguments; it did not prohibit activation itself. The rejected command was not retried. Locally generated activation credentials remain in the protected files above, without transmitting their values through tools during diagnosis.

A standard local PostgreSQL client can read the protected activation file from disk and execute it without secret-bearing arguments or output, once that local client has a securely supplied, branch-scoped administrative setup connection. That authenticated local channel is currently missing: the prepared app/migration roles are NOLOGIN, no authenticated Neon CLI or local Neon API key is present, and the exposed MCP SQL tool accepts SQL text rather than a local file/reference. The SQL Editor toolbar exposes no file-import control. A local-client route would need a one-time secure authentication handoff (hidden local input or a supported secret-manager mount), not user copying raw credential SQL. Account-wide CLI authorization would be a different access scope and must not be silently introduced. The existing approval still covers development activation; the proposed production target requires its own exact persistent-access approval.

Once the user confirms activation, verify the local runtime connection without printing credentials; ensure the role's privileges remain restricted. Then exercise actual Drizzle save/reload/export and two-owner denial with authored test data, keeping those results separate from mocked-auth browser tests. The current evidence proves real migrations and database grants, not authenticated application persistence or cross-device access.

## Production and hosting boundary

Only read-only catalog/count queries were executed on production. No production rows, Auth settings, credentials or grants were changed. The existing Vercel project was not configured or deployed. Feature-branch automatic deployment remains disabled in `vercel.json`. PR #2 remains draft; no merge or auto-merge was requested.
