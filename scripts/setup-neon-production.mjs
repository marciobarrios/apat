// Run manually in a local terminal. Never pass a credential as an argument.
import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const host = "ep-sweet-tooth-baaomfd7.c-8.eu-central-1.aws.neon.tech";
const pooledHost = "ep-sweet-tooth-baaomfd7-pooler.c-8.eu-central-1.aws.neon.tech";
const auth = "https://ep-sweet-tooth-baaomfd7.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth";
const appPath = join(root, ".env.production-branch.local");
const migrationPath = join(root, ".env.production-branch.migration.local");
const secretPattern = /^[A-Za-z0-9_-]{43}$/;

async function protectedFile(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600) {
    throw new Error("Unsafe local file permissions");
  }
  return readFile(path, "utf8");
}
async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
function urlFor(role, password, endpoint) {
  const url = new URL(`postgresql://${endpoint}/neondb?sslmode=verify-full`);
  url.username = role;
  url.password = password;
  return url.href;
}
async function preparedConfig() {
  const appExists = await exists(appPath);
  const migrationExists = await exists(migrationPath);
  if (appExists !== migrationExists) throw new Error("Incomplete staged configuration");
  if (!appExists) {
    const appPassword = randomBytes(32).toString("base64url");
    const migrationPassword = randomBytes(32).toString("base64url");
    const cookie = randomBytes(32).toString("base64url");
    await writeFile(
      appPath,
      `DATABASE_URL=${urlFor("apat_prod_app", appPassword, pooledHost)}\nNEON_AUTH_BASE_URL=${auth}\nNEON_AUTH_COOKIE_SECRET=${cookie}\nAPP_ORIGIN=http://127.0.0.1:3026\n`,
      { mode: 0o600, flag: "wx" },
    );
    await writeFile(
      migrationPath,
      `DATABASE_URL_UNPOOLED=${urlFor("apat_prod_schema", migrationPassword, host)}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
  const app = parseEnv(await protectedFile(appPath));
  const migration = parseEnv(await protectedFile(migrationPath));
  const appUrl = new URL(app.DATABASE_URL);
  const migrationUrl = new URL(migration.DATABASE_URL_UNPOOLED);
  for (const [url, endpoint, role] of [
    [appUrl, pooledHost, "apat_prod_app"],
    [migrationUrl, host, "apat_prod_schema"],
  ]) {
    if (
      url.protocol !== "postgresql:" ||
      url.hostname !== endpoint ||
      url.port ||
      url.pathname !== "/neondb" ||
      url.username !== role ||
      url.search !== "?sslmode=verify-full" ||
      !secretPattern.test(url.password)
    )
      throw new Error("Unexpected staged database target");
  }
  if (
    app.NEON_AUTH_BASE_URL !== auth ||
    app.APP_ORIGIN !== "http://127.0.0.1:3026" ||
    !secretPattern.test(app.NEON_AUTH_COOKIE_SECRET)
  )
    throw new Error("Unexpected staged Auth configuration");
  return { appUrl, migrationUrl };
}
function hiddenPassword() {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = "";
    const finish = (error) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\u0003" || char === "\u0004") return finish(new Error("Cancelled"));
        if (char === "\r" || char === "\n")
          return finish(value ? null : new Error("Empty password"));
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && char <= "~" && value.length < 4096) value += char;
      }
    };
    input.setRawMode(true);
    input.on("data", onData);
    input.resume();
    process.stdout.write("Existing neondb_owner password (hidden; paste here, never in chat): ");
  });
}
async function checkConnection(url, role) {
  const client = new Client({
    connectionString: url.href,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT current_user AS role, current_database() AS db");
    return rows[0]?.role === role && rows[0]?.db === "neondb";
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}
async function installConfig(source, destination) {
  const contents = await protectedFile(source);
  if (await exists(destination)) {
    const existing = await protectedFile(destination);
    if (contents === existing) return;
    const backup = `${destination}.before-production`;
    await copyFile(destination, backup, constants.COPYFILE_EXCL);
  }
  // Refuse symlinks; the existing development configuration is backed up above.
  await writeFile(destination, contents, {
    mode: 0o600,
    flag: constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW,
  });
}
async function main() {
  if (process.argv.length !== 2 || !process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Interactive local terminal required; credentials must not be arguments or piped input",
    );
  process.umask(0o077);
  console.log("Target: apat / production / br-misty-paper-bacbzyhs / neondb");
  const { appUrl, migrationUrl } = await preparedConfig();
  const appReady = await checkConnection(appUrl, "apat_prod_app");
  const migrationReady = await checkConnection(migrationUrl, "apat_prod_schema");
  if (!appReady || !migrationReady) {
    if (appReady !== migrationReady)
      throw new Error("Partial activation; reconcile before continuing");
    let password = await hiddenPassword();
    const owner = new Client({
      host,
      port: 5432,
      database: "neondb",
      user: "neondb_owner",
      password,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
    });
    password = undefined;
    try {
      await owner.connect();
      await owner.query("BEGIN");
      await owner.query("SET LOCAL lock_timeout = '5s'");
      const { rows } = await owner.query(
        `SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, EXISTS (SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS inherited FROM pg_roles WHERE rolname IN ('apat_prod_app','apat_prod_schema') ORDER BY rolname`,
      );
      if (
        rows.length !== 2 ||
        rows.some(
          (r) =>
            r.rolcanlogin ||
            r.rolsuper ||
            r.rolcreatedb ||
            r.rolcreaterole ||
            r.rolreplication ||
            r.rolbypassrls ||
            r.inherited,
        )
      )
        throw new Error("Unexpected role state; no credential reset attempted");
      const journal = await owner.query(
        "SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at",
      );
      if (
        journal.rows.map((r) => r.hash).join(",") !==
        "8c0138c360406859acb07e37e170da4dccda8794e0bbd45b31c7c0a04ff26e5e,48c8278aa7a3bd05aa94ff650070abeabb29a7c86b3aa9c80f013fdbe1e5af34"
      )
        throw new Error("Unexpected migration state");
      // Passwords are locally generated and strictly validated above. PostgreSQL
      // role DDL cannot bind password parameters. Never log these statements.
      await owner.query(
        `ALTER ROLE apat_prod_app LOGIN PASSWORD '${appUrl.password}' CONNECTION LIMIT 5`,
      );
      await owner.query(
        `ALTER ROLE apat_prod_schema LOGIN PASSWORD '${migrationUrl.password}' CONNECTION LIMIT 2`,
      );
      await owner.query("COMMIT");
    } catch (error) {
      await owner.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      await owner.end().catch(() => {});
    }
    if (
      !(await checkConnection(appUrl, "apat_prod_app")) ||
      !(await checkConnection(migrationUrl, "apat_prod_schema"))
    )
      throw new Error("Activation outcome needs reconciliation; staged credentials retained");
  }
  await installConfig(appPath, join(root, ".env.local"));
  await installConfig(migrationPath, join(root, ".env.migration.local"));
  console.log(
    "Restricted app/migration connections verified. Protected local config installed; previous development files backed up. No owner credential stored. Next: pnpm dev and Google sign-in.",
  );
}
main().catch(() => {
  console.error(
    "Setup stopped. No credential values logged. Keep any staged .env.production-branch files for outcome reconciliation; do not reset passwords or retry blindly.",
  );
  process.exitCode = 1;
});
