import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import { readConfig } from "../config";

let database: ReturnType<typeof drizzle> | undefined;
export function getDatabase() {
  if (!database) {
    const config = readConfig();
    const pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
    });
    // Avoid logging connection errors, which may contain credentials or recipe data.
    pool.on("error", () => console.error("Database pool connection failed"));
    attachDatabasePool(pool);
    database = drizzle(pool);
  }
  return database;
}
