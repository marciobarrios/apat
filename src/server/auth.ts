import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { readConfig } from "./config";
import { AccessError } from "./errors";
import type { Identity } from "./db/library";

export function getAuth() {
  const config = readConfig();
  return createNeonAuth({
    baseUrl: config.NEON_AUTH_BASE_URL,
    cookies: { secret: config.NEON_AUTH_COOKIE_SECRET, sameSite: "lax" },
    logLevel: "silent",
  });
}
export async function requireIdentity(): Promise<Identity> {
  // Bypass the SDK session cookie cache so revoked sessions are checked upstream.
  const { data, error } = await getAuth().getSession({ query: { disableCookieCache: "true" } });
  if (error) throw new AccessError("auth_unavailable", 503);
  if (!data?.user) throw new AccessError("sign_in_required", 401);
  if (!data.user.emailVerified) throw new AccessError("verified_login_required", 403);
  return { id: data.user.id, name: data.user.name, emailVerified: data.user.emailVerified };
}
