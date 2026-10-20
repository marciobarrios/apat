import { defineConfig } from "drizzle-kit";
const url = process.env.DATABASE_URL_UNPOOLED;
if (url) {
  if (!URL.canParse(url)) throw new Error("Invalid migration connection configuration");
  const target = new URL(url);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !target.hostname.endsWith(".neon.tech") ||
    target.hostname.includes("-pooler") ||
    !["require", "verify-full"].includes(target.searchParams.get("sslmode") ?? "")
  ) {
    throw new Error("Migrations require an approved direct TLS Neon connection");
  }
}
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
});
