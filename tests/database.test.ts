import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, afterEach, expect, it } from "vitest";
import {
  admitImport,
  editRecipe,
  readRecipe,
  type ExperimentDatabase,
} from "../src/server/db/admission";
import { budgets, imports, memberships, outbox, recipes } from "../src/server/db/schema";
import { sampleRecipe } from "../src/lib/recipe";
let client: PGlite;
let db: ExperimentDatabase;
const url = "https://www.instagram.com/reel/DWJJrpcCLLP/";
beforeEach(async () => {
  client = new PGlite();
  db = drizzle(client);
  const files = (await readdir("drizzle")).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) await client.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(memberships).values([
    { id: "alice", active: 1 },
    { id: "bob", active: 1 },
    { id: "outsider", active: 0 },
  ]);
  await db.insert(budgets).values([
    { id: "global", limitMicros: 100 },
    { id: "alice", limitMicros: 80 },
    { id: "bob", limitMicros: 80 },
  ]);
  await db
    .insert(recipes)
    .values({ id: "recipe", ownerId: "alice", original: sampleRecipe, edited: sampleRecipe });
});
afterEach(async () => {
  await client.close();
});
it("creates import and dispatch intent atomically and deduplicates repeats", async () => {
  const input = { ownerId: "alice", url, key: "share-1", reservationMicros: 60 };
  const first = await admitImport(db, input);
  const second = await admitImport(db, input);
  expect(second.id).toBe(first.id);
  expect(await db.select().from(imports)).toHaveLength(1);
  expect(await db.select().from(outbox)).toHaveLength(1);
  expect((await db.select().from(budgets)).find((row) => row.id === "global")?.reservedMicros).toBe(
    60,
  );
});
it("prevents budget races between owners", async () => {
  const results = await Promise.allSettled([
    admitImport(db, { ownerId: "alice", url, key: "a", reservationMicros: 60 }),
    admitImport(db, { ownerId: "bob", url, key: "b", reservationMicros: 60 }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(await db.select().from(outbox)).toHaveLength(1);
});
it("denies uninvited users and leaves no work", async () => {
  await expect(
    admitImport(db, { ownerId: "outsider", url, key: "a", reservationMicros: 1 }),
  ).rejects.toThrow("beta_access_required");
  expect(await db.select().from(imports)).toHaveLength(0);
});
it("rejects a reused key for different content", async () => {
  await admitImport(db, { ownerId: "alice", url, key: "a", reservationMicros: 10 });
  await expect(
    admitImport(db, {
      ownerId: "alice",
      url: "https://www.instagram.com/reel/ANOTHER/",
      key: "a",
      reservationMicros: 10,
    }),
  ).rejects.toThrow("idempotency_conflict");
});
it("rejects another active job for the same owner", async () => {
  await admitImport(db, { ownerId: "alice", url, key: "a", reservationMicros: 10 });
  await expect(
    admitImport(db, { ownerId: "alice", url, key: "b", reservationMicros: 10 }),
  ).rejects.toThrow("concurrency_limit");
});
it("enforces ownership for recipe reads and writes", async () => {
  await expect(readRecipe(db, "bob", "recipe")).rejects.toThrow("not_found");
  await expect(
    editRecipe(db, "bob", "recipe", 1, { ...sampleRecipe, title: "stolen" }),
  ).rejects.toThrow();
  expect((await readRecipe(db, "alice", "recipe")).edited.title).toBe(sampleRecipe.title);
});
it("preserves original evidence and rejects stale edits", async () => {
  await editRecipe(db, "alice", "recipe", 1, { ...sampleRecipe, title: "My version" });
  const result = await readRecipe(db, "alice", "recipe");
  expect(result.original.title).toBe(sampleRecipe.title);
  expect(result.edited.title).toBe("My version");
  await expect(editRecipe(db, "alice", "recipe", 1, sampleRecipe)).rejects.toThrow(
    "not_found_or_conflict",
  );
});
