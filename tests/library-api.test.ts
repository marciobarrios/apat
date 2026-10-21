import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { libraryApi } from "../src/server/library-api";
import { createLibrary, type Identity } from "../src/server/db/library";
import { AccessError } from "../src/server/errors";
import { memberships } from "../src/server/db/schema";
import { sampleRecipe } from "../src/lib/recipe";
import { readConfig } from "../src/server/config";
import {
  SavedRecipe,
  RecipeList,
  LibrarySnapshot,
  ACCOUNT_SCOPE_HEADER,
} from "../src/lib/library-contract";

let client: PGlite;
let db: ReturnType<typeof drizzle>;
const alice = { id: "alice", name: "Alice", emailVerified: true };
const bob = { id: "bob", name: "Bob", emailVerified: true };
const origin = "http://localhost:3026";
beforeEach(async () => {
  client = new PGlite();
  db = drizzle(client);
  for (const file of (await readdir("drizzle")).filter((name) => name.endsWith(".sql")).sort()) {
    await client.exec(await readFile(`drizzle/${file}`, "utf8"));
  }
  await db.insert(memberships).values([
    { id: "alice", active: 1 },
    { id: "bob", active: 1 },
    { id: "outsider", active: 0 },
  ]);
});
afterEach(async () => {
  await client.close();
});
function api(identity: Identity | null) {
  return libraryApi({
    identity: async () => {
      if (!identity) throw new AccessError("sign_in_required", 401);
      return identity;
    },
    library: (user) => createLibrary(db, user),
    origin: () => origin,
  });
}
function request(body?: unknown, headers?: HeadersInit) {
  return new Request(`${origin}/api/recipes`, {
    method: body === undefined ? "GET" : "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function create(identity = alice, key = randomUUID()) {
  const response = await api(identity)(request({ key, recipe: sampleRecipe }), "create");
  expect(response.status).toBe(201);
  return SavedRecipe.parse(await response.json());
}
it("saves, reloads through a fresh service, edits optimistically and exports original evidence", async () => {
  const first = await create();
  const reload = await api(alice)(request(), "get", first.id);
  expect(SavedRecipe.parse(await reload.json())).toEqual(first);
  const updated = await api(alice)(
    request({ version: 1, recipe: { ...sampleRecipe, title: "My chickpeas" } }),
    "update",
    first.id,
  );
  expect(SavedRecipe.parse(await updated.json()).version).toBe(2);
  const exported = await api(alice)(request(), "export", first.id);
  expect(exported.headers.get("cache-control")).toBe("private, no-store");
  expect(exported.headers.get("content-disposition")).toContain("attachment");
  const recipe = SavedRecipe.parse(await exported.json());
  expect(recipe.original).toEqual(sampleRecipe);
  expect(recipe.edited.title).toBe("My chickpeas");
  expect(recipe.edited.cookMinutes).toBeNull();
  expect(
    (await api(alice)(request({ version: 1, recipe: sampleRecipe }), "update", first.id)).status,
  ).toBe(409);
});
it("denies anonymous requests even with forged owner headers", async () => {
  const first = await create();
  for (const operation of ["account", "list", "get", "export", "update", "create"] as const) {
    const response = await api(null)(
      request(
        { key: randomUUID(), recipe: sampleRecipe, ownerId: "alice" },
        { "x-user-id": "alice" },
      ),
      operation,
      first.id,
    );
    expect(response.status).toBe(401);
  }
});
it("denies cross-user read, edit and export with the same result as a missing recipe", async () => {
  const first = await create();
  for (const operation of ["get", "export", "update"] as const) {
    const body = operation === "update" ? { version: 1, recipe: sampleRecipe } : undefined;
    const denied = await api(bob)(request(body), operation, first.id);
    const missing = await api(bob)(request(body), operation, randomUUID());
    expect(denied.status).toBe(404);
    expect(await denied.json()).toEqual(await missing.json());
  }
  const list = RecipeList.parse(await (await api(bob)(request(), "list")).json());
  expect(list.recipes).toEqual([]);
});
it("requires verified identity and active membership, including revocation after login", async () => {
  const first = await create();
  for (const user of [
    { ...alice, emailVerified: false },
    { ...alice, id: "outsider" },
    { ...alice, id: "unknown" },
  ]) {
    expect((await api(user)(request(), "account")).status).toBe(403);
    expect(
      (await api(user)(request({ key: randomUUID(), recipe: sampleRecipe }), "create")).status,
    ).toBe(403);
  }
  await db.update(memberships).set({ active: 0 }).where(eq(memberships.id, "alice"));
  for (const operation of ["account", "list", "get", "export", "update", "create"] as const) {
    expect(
      (
        await api(alice)(
          request({ key: randomUUID(), version: 1, recipe: sampleRecipe }),
          operation,
          first.id,
        )
      ).status,
    ).toBeOneOf([400, 403]);
  }
  expect(
    (await api(alice)(request({ version: 1, recipe: sampleRecipe }), "update", first.id)).status,
  ).toBe(403);
});
it("deduplicates concurrent repeated submissions; rejects content changes and separates owners", async () => {
  const key = randomUUID();
  const [a, b] = await Promise.all([create(alice, key), create(alice, key)]);
  expect(a.id).toBe(b.id);
  expect((await create(bob, key)).id).not.toBe(a.id);
  const response = await api(alice)(
    request({ key, recipe: { ...sampleRecipe, title: "Different" } }),
    "create",
  );
  expect(response.status).toBe(409);
  const list = RecipeList.parse(await (await api(alice)(request(), "list")).json());
  expect(list.recipes).toHaveLength(1);
});
it("allows exactly one simultaneous edit from the same version", async () => {
  const first = await create();
  const results = await Promise.all(
    ["A", "B"].map((title) =>
      api(alice)(request({ version: 1, recipe: { ...sampleRecipe, title } }), "update", first.id),
    ),
  );
  expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
});
it("blocks cross-origin, missing-origin, malformed, oversized and owner-injected writes", async () => {
  const input = { key: randomUUID(), recipe: sampleRecipe };
  const invalidHeaders: HeadersInit[] = [
    { origin: "https://evil.example" },
    { origin: "null" },
    { origin: "" },
    { "sec-fetch-site": "cross-site" },
  ];
  for (const headers of invalidHeaders) {
    expect((await api(alice)(request(input, headers), "create")).status).toBe(403);
  }
  expect((await api(alice)(request({ ...input, ownerId: "bob" }), "create")).status).toBe(400);
  expect(
    (await api(alice)(request(input, { "content-type": "text/plain" }), "create")).status,
  ).toBe(415);
  expect(
    (
      await api(alice)(
        new Request(origin, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: "{",
        }),
        "create",
      )
    ).status,
  ).toBe(400);
  expect((await api(alice)(request({ text: "x".repeat(256 * 1024) }), "create")).status).toBe(413);
  expect(RecipeList.parse(await (await api(alice)(request(), "list")).json()).recipes).toHaveLength(
    0,
  );
});
it("paginates only the current owner's recipes without repeating rows", async () => {
  for (let i = 0; i < 21; i++) await create();
  await create(bob);
  const first = RecipeList.parse(await (await api(alice)(request(), "list")).json());
  expect(first.recipes).toHaveLength(20);
  const second = RecipeList.parse(
    await (
      await api(alice)(new Request(`${origin}/api/recipes?cursor=${first.nextCursor}`), "list")
    ).json(),
  );
  expect(second.recipes).toHaveLength(1);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.recipes, ...second.recipes].map((row) => row.id)).size).toBe(21);
});
it("fails closed without environment config and never includes secret values in errors", async () => {
  expect(() => readConfig({ DATABASE_URL: "secret-value" })).toThrow("setup_required");
  const handler = libraryApi({
    identity: async () => {
      throw new Error("postgresql://secret@host");
    },
    library: (user) => createLibrary(db, user),
    origin: () => origin,
  });
  const response = await handler(request(), "account");
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('{"error":"service_unavailable"}');
});

it("runtime role saves and edits while membership management and import tables remain denied", async () => {
  await client.exec(`
    CREATE ROLE apat_test_runtime;
    GRANT USAGE ON SCHEMA public TO apat_test_runtime;
    GRANT SELECT ON memberships TO apat_test_runtime;
    GRANT SELECT, INSERT, UPDATE ON recipes TO apat_test_runtime;
    SET ROLE apat_test_runtime;
  `);
  const saved = await create();
  expect(
    (
      await api(alice)(
        request({ version: 1, recipe: { ...sampleRecipe, title: "Restricted role" } }),
        "update",
        saved.id,
      )
    ).status,
  ).toBe(200);
  expect((await api(alice)(request(), "get", saved.id)).status).toBe(200);
  await expect(client.query("UPDATE memberships SET active = 1")).rejects.toThrow(
    "permission denied",
  );
  await expect(client.query("SELECT * FROM imports")).rejects.toThrow("permission denied");
  await expect(client.query("DELETE FROM recipes")).rejects.toThrow("permission denied");
});

it("returns account and recipes from one identity resolution when the session changes", async () => {
  const aliceRecipe = await create(alice);
  await create(bob);
  let resolutions = 0;
  const handler = libraryApi({
    identity: async () => (++resolutions === 1 ? alice : bob),
    library: (identity) => createLibrary(db, identity),
    origin: () => origin,
  });
  const response = await handler(request(), "list");
  expect(response.status).toBe(200);
  const snapshot = LibrarySnapshot.parse(await response.json());
  expect(resolutions).toBe(1);
  expect(snapshot.account).toEqual({ id: "alice", name: "Alice" });
  expect(snapshot.recipes.map((recipe) => recipe.id)).toEqual([aliceRecipe.id]);
});

it("rejects stale account context on every operation without reading or writing another account", async () => {
  const saved = await create(bob);
  for (const operation of ["account", "list", "get", "export", "update", "create"] as const) {
    const body =
      operation === "create"
        ? { key: randomUUID(), recipe: sampleRecipe }
        : operation === "update"
          ? { version: 1, recipe: { ...sampleRecipe, title: "Wrong account" } }
          : undefined;
    const response = await api(bob)(
      request(body, { [ACCOUNT_SCOPE_HEADER]: "alice" }),
      operation,
      saved.id,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "account_changed" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  }
  const snapshot = LibrarySnapshot.parse(await (await api(bob)(request(), "list")).json());
  expect(snapshot.recipes).toHaveLength(1);
  expect(snapshot.recipes[0]).toEqual(saved);
  // Matching a header cannot select someone else's owner: the session still wins.
  const denied = await api(bob)(
    request(undefined, { [ACCOUNT_SCOPE_HEADER]: "bob" }),
    "get",
    (await create(alice)).id,
  );
  expect(denied.status).toBe(404);
});
