# Approved production-branch setup — October 21, 2026

The user explicitly approved configuring the existing `apat` production branch after the development Auth provisioning failure. This permits additive app migrations, restricted database credentials, protected local configuration and enrollment of the verified `marciobarrios@gmail.com` subject. It does not authorize a Vercel environment change, public deployment, merge, paid resource, production Auth deletion or a different Google account.

## Completed on Neon

- Project `sparkling-base-11618556`, branch `production` / `br-misty-paper-bacbzyhs`, database `neondb`, Frankfurt. Reconciliation found zero Auth users/sessions, no app tables/journal and no preexisting `apat_prod_*` roles.
- Preserved the existing Managed Better Auth endpoint and shared Google development provider. Email/password remains disabled, localhost permitted, trusted origins unchanged. No Auth schema/table was modified.
- Applied both reviewed Drizzle migrations in one transaction with a fresh-schema guard. The SQL and journal metadata came from Drizzle's `readMigrationFiles`; journal hashes match `0000` (`8c0138c360406859acb07e37e170da4dccda8794e0bbd45b31c7c0a04ff26e5e`) and `0001` (`48c8278aa7a3bd05aa94ff650070abeabb29a7c86b3aa9c80f013fdbe1e5af34`). This was Neon MCP transaction transport, not a local `drizzle-kit migrate` connection.
- Created SQL-managed `apat_prod_schema` and `apat_prod_app`, currently **NOLOGIN**. Neither has superuser, database/role creation, replication, RLS bypass or inherited role membership. The schema role owns app objects/journal and can create in the public schema; it cannot create databases or access managed Auth. The owner has membership in the schema role for explicit migration execution.
- App grants are public schema usage, memberships SELECT and recipes SELECT/INSERT/UPDATE. Remote privilege checks confirm membership UPDATE, recipe DELETE, import SELECT, managed Auth SELECT and public-schema CREATE are denied.
- Enabled transaction pooling on existing endpoint `ep-sweet-tooth-baaomfd7`; compute size, suspension and paid-plan settings were unchanged.
- Final counts: zero memberships, recipes and Auth users. No synthetic user/membership/recipe was inserted.

## One secure local handoff remains

The connected SQL tool accepts text, not a protected local file. Earlier automatic review rejected embedding a bootstrap password in a command argument; that rejected command was never executed or retried. The following route instead takes the existing owner password directly from the human through a hidden local terminal prompt. Do not send credentials in chat or tool arguments.

In this feature worktree, run:

```sh
pnpm setup:neon:production
```

If starting in a different folder, first open the `feat/neon-private-library` worktree used for PR #2. Do not run from the original main checkout or deploy the command to Vercel.

In Neon Console, choose project `apat`, branch `production` (`br-misty-paper-bacbzyhs`), database `neondb`, role `neondb_owner`. Copy its existing password from the Connect dialog into the command's **hidden password prompt**. The prompt expects the password only, not a connection URL. No password reset or new account-wide Neon CLI grant is needed.

The script pins the exact endpoint/database/role, verifies TLS, refuses piped input/credential arguments, generates app/migration passwords and a cookie secret within the local process, and writes only ignored owner-readable files. It checks the role restrictions and exact migration journal before activating the roles in one transaction. It never stores the owner password or prints SQL/provider exceptions. After verifying both new connections, it installs `.env.local` and `.env.migration.local`, preserving their existing development contents in `.before-production` backups. The app uses the pooled URL; migration credentials stay separate. Staged `.env.production-branch*` files remain protected for reconciliation if a connection/commit outcome is uncertain. Do not delete them, reset passwords or retry blindly after a failure; inspect actual role/connection state first.

The script has not been run against Neon. Its hidden input, cancellation, provider-error redaction, changed-role rejection, protected-file output and development backup behavior were exercised with a mocked client in a disposable local directory. That verifies local handoff behavior, not successful credential activation.

## Remaining real integration checks

After activation, start `pnpm dev`, open `http://127.0.0.1:3026`, and sign in with the approved Google account. Verify the provider's stable subject and verified email before enrolling that exact subject; do not auto-enroll arbitrary Google users. Then exercise real save/reload/export, revoked membership/session behavior and owner denial. A second real Google identity has not been authorized, so two-account OAuth and cross-device checks remain pending. Existing PGlite/HTTP mocks do not establish those results.

The existing shared Google provider is suitable for this approved local test even though the database branch is named production. A public release still needs separately approved production OAuth and Vercel configuration. No deployment was made. The development branch and its local configuration are preserved; its expiry remains October 27, 2026, 12:41 Europe/Madrid.
