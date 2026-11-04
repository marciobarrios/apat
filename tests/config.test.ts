import { expect, it } from "vitest";
import { readConfig } from "../src/server/config";

const config = {
  DATABASE_URL: "postgresql://apat_app:authored@ep-authored.neon.tech/neondb?sslmode=verify-full",
  NEON_AUTH_BASE_URL: "https://auth.example.test/auth",
  NEON_AUTH_COOKIE_SECRET: "authored-cookie-fixture-with-at-least-32-characters",
  APP_ORIGIN: "https://preview.example.test",
};
it("prefers a restricted preview override to an integration-generated owner URL", () => {
  const owner = config.DATABASE_URL.replace("apat_app", "neondb_owner");
  expect(
    readConfig({ ...config, DATABASE_URL: owner, APAT_DATABASE_URL: config.DATABASE_URL })
      .DATABASE_URL,
  ).toBe(config.DATABASE_URL);
  expect(readConfig(config).DATABASE_URL).toBe(config.DATABASE_URL);
});
it("rejects owner credentials and never falls back from an invalid override", () => {
  for (const role of ["neondb_owner", "neondb%5Fowner"])
    expect(() =>
      readConfig({ ...config, DATABASE_URL: config.DATABASE_URL.replace("apat_app", role) }),
    ).toThrow("setup_required");
  for (const override of [
    "",
    "private-invalid-connection",
    config.DATABASE_URL.replace("apat_app", "neondb_owner"),
  ])
    expect(() => readConfig({ ...config, APAT_DATABASE_URL: override })).toThrow("setup_required");
});
