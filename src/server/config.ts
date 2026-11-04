import { z } from "zod";
import { AccessError } from "./errors";

const Config = z.object({
  DATABASE_URL: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    let role: string;
    try {
      role = decodeURIComponent(url.username);
    } catch {
      return false;
    }
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      url.hostname.endsWith(".neon.tech") &&
      role.length > 0 &&
      role !== "neondb_owner" &&
      ["verify-full", "require"].includes(url.searchParams.get("sslmode") ?? "")
    );
  }),
  NEON_AUTH_BASE_URL: z
    .url()
    .refine((value) => URL.canParse(value) && new URL(value).protocol === "https:"),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32),
  APP_ORIGIN: z.url().refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return (
      value === url.origin &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  }),
});
export function readConfig(env: Partial<NodeJS.ProcessEnv> = process.env) {
  // Neon Git integration regenerates DATABASE_URL with the owner role. Keep a
  // branch-scoped restricted connection separate; an invalid override fails closed.
  const result = Config.safeParse({
    ...env,
    DATABASE_URL: env.APAT_DATABASE_URL ?? env.DATABASE_URL,
  });
  // Never return schema errors containing secret values.
  if (!result.success) throw new AccessError("setup_required", 503);
  return result.data;
}
