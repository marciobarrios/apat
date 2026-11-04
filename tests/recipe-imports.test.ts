import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createRecipeImports } from "../src/server/db/recipe-imports";
import { createLibrary, type Identity } from "../src/server/db/library";
import { memberships, recipeImports } from "../src/server/db/schema";
import { sampleRecipe } from "../src/lib/recipe";
import { MamitsuFailure } from "../src/server/mamitsu";
import { importApi } from "../src/server/import-api";
import { AccessError } from "../src/server/errors";
import { ACCOUNT_SCOPE_HEADER } from "../src/lib/library-contract";

let client: PGlite;
let db: ReturnType<typeof drizzle>;
const alice = { id: "alice", name: "Alice", emailVerified: true };
const bob = { ...alice, id: "bob" };
const reel = "https://www.instagram.com/reel/AUTHORED123/";
const policy = () => ({ apiKey: "authored-test-key", totalCredits: 100, ownerCredits: 50 });
const extracted = { recipe: { ...sampleRecipe, sourceUrl: reel }, extractionId: "ext_authored" };
const input = (url = reel, key = randomUUID()) => ({ url, key });
const service = (identity = alice, extract = async () => extracted, limits = policy) =>
  createRecipeImports(db, identity, limits, extract);
beforeEach(async () => {
  client = new PGlite();
  db = drizzle(client);
  for (const file of (await readdir("drizzle")).filter((name) => name.endsWith(".sql")).sort())
    await client.exec(await readFile(`drizzle/${file}`, "utf8"));
  await db.insert(memberships).values([
    { id: "alice", active: 1 },
    { id: "bob", active: 1 },
    { id: "outsider", active: 0 },
  ]);
});
afterEach(async () => {
  await client.close();
});

it("reports configuration without exposing policy secrets and preserves existing receipts when disabled", async () => {
  const imports = service();
  await imports.start(input());
  const enabled = await imports.list();
  expect(enabled.configured).toBe(true);
  expect(JSON.stringify(enabled)).not.toContain("authored-test-key");
  const disabled = service(alice, undefined, () => {
    throw new AccessError("imports_not_configured", 503);
  });
  const list = await disabled.list();
  expect(list.configured).toBe(false);
  expect(list.imports).toHaveLength(1);
  await expect(disabled.start(input("https://youtu.be/abcdefghijk"))).rejects.toThrow(
    "imports_not_configured",
  );
});

it("persists a receipt, claims exactly once and saves edited content separately from imported evidence", async () => {
  let calls = 0;
  const imports = service(alice, async () => {
    calls++;
    return extracted;
  });
  const first = await imports.start(input());
  expect(first.dispatch).toBe(true);
  expect(first.job.state).toBe("queued");
  await Promise.all([imports.run(first.job.id), imports.run(first.job.id)]);
  expect(calls).toBe(1);
  const restored = await service().get(first.job.id);
  expect(restored.state).toBe("needs_review");
  expect(restored.draft?.ingredients[2].quantity).toBeNull();
  const saved = await imports.save(first.job.id, {
    recipe: { ...sampleRecipe, title: "My own title", sourceUrl: "https://example.test/spoof" },
  });
  expect(saved.original).toEqual(extracted.recipe);
  expect(saved.edited.title).toBe("My own title");
  expect(saved.edited.sourceUrl).toBe(reel);
  expect((await imports.save(first.job.id, { recipe: sampleRecipe })).id).toBe(saved.id);
  expect((await service().get(first.job.id)).recipeId).toBe(saved.id);
  expect((await createLibrary(db, alice).list()).recipes).toHaveLength(1);
});
it("deduplicates concurrent keys and tracking variants even with fresh intent keys", async () => {
  const imports = service();
  const value = input();
  const [a, b] = await Promise.all([imports.start(value), imports.start(value)]);
  expect([a.dispatch, b.dispatch].filter(Boolean)).toHaveLength(1);
  expect(a.job.id).toBe(b.job.id);
  expect((await imports.start(input(`${reel}?igsh=authored`))).job.id).toBe(a.job.id);
  await expect(imports.start(input("https://youtu.be/abcdefghijk", value.key))).rejects.toThrow(
    "idempotency_conflict",
  );
});
it("enforces total and owner credit reservations and concurrent instance limits", async () => {
  const limited = service(
    alice,
    async () => extracted,
    () => ({ ...policy(), totalCredits: 5, ownerCredits: 5 }),
  );
  const job = await limited.start(input());
  await expect(
    service(
      bob,
      async () => extracted,
      () => ({ ...policy(), totalCredits: 5 }),
    ).start(input()),
  ).rejects.toThrow("import_budget_exhausted");
  await limited.run(job.job.id);
  await expect(limited.start(input("https://instagram.com/reel/AUTHORED456/"))).rejects.toThrow(
    "import_budget_exhausted",
  );
  await expect(
    service(
      bob,
      async () => extracted,
      () => ({ ...policy(), ownerCredits: 4 }),
    ).start(input()),
  ).rejects.toThrow("import_budget_exhausted");
  const bobJob = await service(bob).start(input());
  await expect(
    service(bob).start(input("https://instagram.com/reel/AUTHORED456/")),
  ).rejects.toThrow("import_limit");
  await service(bob).cancel(bobJob.job.id);
});

it("admits only one competing owner when the remaining global budget fits one request", async () => {
  const limits = () => ({ ...policy(), totalCredits: 5 });
  const results = await Promise.allSettled([
    service(alice, async () => extracted, limits).start(input()),
    service(bob, async () => extracted, limits).start(input()),
  ]);
  expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  expect(
    (await db.select().from(recipeImports)).reduce((total, row) => total + row.heldCredits, 0),
  ).toBe(5);
});

it("paginates newest-first receipts and rejects another owner's pagination anchor", async () => {
  for (let i = 0; i < 21; i++)
    await db.insert(recipeImports).values({
      id: randomUUID(),
      ownerId: alice.id,
      requestKey: randomUUID(),
      sourceUrl: reel,
      provider: "instagram",
      state: "cancelled",
      reservedCredits: 5,
      heldCredits: 0,
      createdAt: new Date(1700000000000 + i * 1000),
    });
  const imports = service();
  const first = await imports.list();
  expect(first.imports).toHaveLength(20);
  expect(first.nextCursor).not.toBeNull();
  const next = await imports.list(first.nextCursor!);
  expect(next.imports).toHaveLength(1);
  expect(next.nextCursor).toBeNull();
  expect(new Set([...first.imports, ...next.imports].map((row) => row.id)).size).toBe(21);
  await expect(service(bob).list(first.nextCursor!)).rejects.toThrow("not_found");
});

it("settles a paid result under its owner after revocation without exposing it to that member", async () => {
  const imports = service(alice, async () => {
    await db.update(memberships).set({ active: 0 }).where(eq(memberships.id, alice.id));
    return extracted;
  });
  const first = await imports.start(input());
  await imports.run(first.job.id);
  const [row] = await db.select().from(recipeImports).where(eq(recipeImports.id, first.job.id));
  expect(row.state).toBe("needs_review");
  expect(row.heldCredits).toBe(5);
  await expect(imports.get(first.job.id)).rejects.toThrow("invitation_required");
  await expect(imports.save(first.job.id, { recipe: sampleRecipe })).rejects.toThrow(
    "invitation_required",
  );
});
it("retains holds on charged failures and unknown outcomes and permits explicit free retries", async () => {
  for (const code of ["url_source_inaccessible", "extraction_failed", "outcome_unknown"]) {
    const source = `https://instagram.com/reel/AUTHORED_${code}/`;
    const imports = service(alice, async () => {
      throw new MamitsuFailure(code, code === "url_source_inaccessible", "ext_authored");
    });
    const job = await imports.start(input(source));
    await imports.run(job.job.id);
    const result = await imports.get(job.job.id);
    expect(result.retryable).toBe(code === "url_source_inaccessible");
    const replay = await imports.start(input(source));
    expect(replay.dispatch).toBe(code === "url_source_inaccessible");
    if (replay.dispatch) await imports.cancel(replay.job.id);
    const [row] = await db.select().from(recipeImports).where(eq(recipeImports.id, job.job.id));
    expect(row.heldCredits).toBe(code === "url_source_inaccessible" ? 0 : 5);
  }
});
it("expires an unclaimed dispatch safely but never replays a claimed interrupted call", async () => {
  const imports = service();
  const first = await imports.start(input());
  await db
    .update(recipeImports)
    .set({ updatedAt: new Date(Date.now() - 200000) })
    .where(eq(recipeImports.id, first.job.id));
  expect((await imports.get(first.job.id)).state).toBe("cancelled");
  const second = await imports.start(input());
  await db
    .update(recipeImports)
    .set({ state: "extracting", updatedAt: new Date(Date.now() - 200000) })
    .where(eq(recipeImports.id, second.job.id));
  expect((await imports.get(second.job.id)).state).toBe("outcome_unknown");
  expect((await imports.start(input())).job.id).toBe(second.job.id);
  await expect(imports.cancel(second.job.id)).rejects.toThrow("import_already_started");
});
it("allows cancellation only before claim and never calls the provider for cancelled jobs", async () => {
  let calls = 0;
  const imports = service(alice, async () => {
    calls++;
    return extracted;
  });
  const first = await imports.start(input());
  await imports.cancel(first.job.id);
  await imports.run(first.job.id);
  expect(calls).toBe(0);
  expect((await imports.start(input())).dispatch).toBe(true);
});
it("denies foreign owners, uninvited members, unverified sessions and revoked membership before paid dispatch", async () => {
  const imports = service();
  const first = await imports.start(input());
  for (const operation of [
    () => service(bob).get(first.job.id),
    () => service(bob).cancel(first.job.id),
    () => service(bob).save(first.job.id, { recipe: sampleRecipe }),
  ])
    await expect(operation()).rejects.toThrow("not_found");
  expect((await service(bob).list()).imports).toEqual([]);
  await expect(service({ ...alice, id: "outsider" }).start(input())).rejects.toThrow(
    "invitation_required",
  );
  expect(() => service({ ...alice, emailVerified: false })).toThrow("verified_login_required");
  await db.update(memberships).set({ active: 0 }).where(eq(memberships.id, "alice"));
  await expect(imports.run(first.job.id)).rejects.toThrow("invitation_required");
  await expect(imports.get(first.job.id)).rejects.toThrow("invitation_required");
});
it("keeps the kill switch independent of reading and saving completed drafts", async () => {
  const first = await service().start(input());
  await service().run(first.job.id);
  const disabled = service(
    alice,
    async () => extracted,
    () => {
      throw new AccessError("imports_not_configured", 503);
    },
  );
  expect((await disabled.get(first.job.id)).state).toBe("needs_review");
  expect((await disabled.save(first.job.id, { recipe: sampleRecipe })).original).toEqual(
    extracted.recipe,
  );
  await expect(disabled.start(input("https://instagram.com/reel/AUTHORED456/"))).rejects.toThrow(
    "imports_not_configured",
  );
});
it("enforces bounded per-owner attempts even when every source failure is free", async () => {
  const imports = service(alice, async () => {
    throw new MamitsuFailure("url_source_inaccessible", true);
  });
  for (let n = 0; n < 5; n++) {
    const job = await imports.start(input());
    await imports.run(job.job.id);
  }
  await expect(imports.start(input())).rejects.toThrow("import_limit");
});
it("serializes save replays and permits import access with only reviewed runtime grants", async () => {
  await client.exec(
    "CREATE ROLE apat_import_test; GRANT USAGE ON SCHEMA public TO apat_import_test; GRANT SELECT ON memberships TO apat_import_test; GRANT SELECT, INSERT, UPDATE ON recipes, recipe_imports TO apat_import_test; SET ROLE apat_import_test;",
  );
  const imports = service();
  const job = await imports.start(input());
  await imports.run(job.job.id);
  const [a, b] = await Promise.all([
    imports.save(job.job.id, { recipe: sampleRecipe }),
    imports.save(job.job.id, { recipe: sampleRecipe }),
  ]);
  expect(a.id).toBe(b.id);
  await expect(client.query("delete from recipe_imports")).rejects.toThrow("permission denied");
});

const origin = "https://apat.example.test";
function request(body?: unknown, extra: Record<string, string> = {}) {
  return new Request(`${origin}/api/imports`, {
    method: body ? "POST" : "GET",
    headers: { origin, "content-type": "application/json", ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function handler(user: Identity | null, scheduled: (() => Promise<void>)[] = []) {
  return importApi({
    identity: async () => {
      if (!user) throw new AccessError("sign_in_required", 401);
      return user;
    },
    imports: (identity) => service(identity),
    origin: () => origin,
    schedule: (work) => {
      scheduled.push(work);
    },
  });
}
it("returns a private receipt before dispatch and authenticates every operation", async () => {
  const work: (() => Promise<void>)[] = [];
  const api = handler(alice, work);
  const response = await api(request(input()), "start");
  expect(response.status).toBe(202);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const job = await response.json();
  expect(job.state).toBe("queued");
  expect(work).toHaveLength(1);
  await work[0]();
  expect((await service().get(job.id)).state).toBe("needs_review");
  for (const operation of ["list", "start", "get", "cancel", "save"] as const) {
    expect((await handler(null)(request(input()), operation, job.id)).status).toBe(401);
    expect(
      (await handler(bob)(request(input(), { [ACCOUNT_SCOPE_HEADER]: "alice" }), operation, job.id))
        .status,
    ).toBe(409);
  }
});
it("rejects cross-origin, owner-injected, oversized and unsupported requests before admission", async () => {
  const api = handler(alice);
  expect((await api(request(input(), { origin: "https://evil.example" }), "start")).status).toBe(
    403,
  );
  expect((await api(request({ ...input(), ownerId: "bob" }), "start")).status).toBe(400);
  expect((await api(request(input("https://localhost/private")), "start")).status).toBe(400);
  expect((await api(request({ ...input(), extra: "x".repeat(256 * 1024) }), "start")).status).toBe(
    413,
  );
  expect((await service().list()).imports).toEqual([]);
});
