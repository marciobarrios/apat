import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, exists, gt, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { CreateRecipe, SavedRecipe, UpdateRecipe } from "../../lib/library-contract";
import { Recipe, type RecipeData } from "../../lib/recipe";
import { AccessError } from "../errors";
import { memberships, recipes } from "./schema";

// Shared Drizzle SQL implementation: node-postgres in the app, PGlite in isolated tests.
export type Database = PgDatabase<PgQueryResultHKT, ReturnType<typeof drizzle>["_"]["fullSchema"]>;
export type Identity = { id: string; name: string; emailVerified: boolean };

export function createLibrary(db: Database, identity: Identity) {
  if (!identity.id || !identity.emailVerified)
    throw new AccessError("verified_login_required", 403);
  const member = () =>
    db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.id, identity.id), eq(memberships.active, 1)));
  const owned = (id?: string) =>
    and(
      eq(recipes.ownerId, identity.id),
      exists(member()),
      id === undefined ? undefined : eq(recipes.id, id),
    );
  async function requireMembership() {
    if (!(await member()).length) throw new AccessError("invitation_required", 403);
  }
  async function get(id: string) {
    await requireMembership();
    const [row] = await db.select().from(recipes).where(owned(id));
    if (!row) throw new AccessError("not_found", 404);
    return SavedRecipe.parse(row);
  }
  async function createRecord(original: RecipeData, edited: RecipeData, key: string) {
    const hash = createHash("sha256")
      .update(JSON.stringify(original === edited ? edited : { original, edited }))
      .digest("hex");
    return db.transaction(async (tx) => {
      // Membership-filtered INSERT SELECT is one statement. Unique conflict handling
      // serializes duplicate creates without requiring UPDATE privileges on memberships.
      const [row] = await tx
        .insert(recipes)
        .select(
          tx
            .select({
              id: sql<string>`${randomUUID()}`.as("id"),
              ownerId: memberships.id,
              version: sql<number>`1`.as("version"),
              original: sql<RecipeData>`${JSON.stringify(original)}::jsonb`.as("original"),
              edited: sql<RecipeData>`${JSON.stringify(edited)}::jsonb`.as("edited"),
              creationKey: sql<string>`${key}`.as("creationKey"),
              creationHash: sql<string>`${hash}`.as("creationHash"),
              createdAt: sql<Date>`now()`.as("createdAt"),
            })
            .from(memberships)
            .where(and(eq(memberships.id, identity.id), eq(memberships.active, 1))),
        )
        .onConflictDoNothing({ target: [recipes.ownerId, recipes.creationKey] })
        .returning();
      if (row) return SavedRecipe.parse(row);
      const [membership] = await tx
        .select()
        .from(memberships)
        .where(and(eq(memberships.id, identity.id), eq(memberships.active, 1)));
      if (!membership) throw new AccessError("invitation_required", 403);
      const [existing] = await tx
        .select()
        .from(recipes)
        .where(and(eq(recipes.ownerId, identity.id), eq(recipes.creationKey, key)));
      if (!existing) throw new Error("Recipe creation did not settle");
      if (existing.creationHash !== hash) throw new AccessError("idempotency_conflict", 409);
      return SavedRecipe.parse(existing);
    });
  }
  return {
    async account() {
      await requireMembership();
      return { id: identity.id, name: identity.name };
    },
    async list(cursor?: string) {
      await requireMembership();
      const rows = await db
        .select()
        .from(recipes)
        .where(and(owned(), cursor ? gt(recipes.id, cursor) : undefined))
        .orderBy(asc(recipes.id))
        .limit(21);
      return {
        recipes: rows.slice(0, 20).map((row) => SavedRecipe.parse(row)),
        nextCursor: rows.length > 20 ? rows[19].id : null,
      };
    },
    get,
    async create(input: unknown) {
      const parsed = CreateRecipe.parse(input);
      return createRecord(parsed.recipe, parsed.recipe, parsed.key);
    },
    async createImported(original: RecipeData, edited: RecipeData, key: string) {
      return createRecord(Recipe.parse(original), Recipe.parse(edited), key);
    },
    async update(id: string, input: unknown) {
      const parsed = UpdateRecipe.parse(input);
      await requireMembership();
      const [row] = await db
        .update(recipes)
        .set({
          edited: parsed.recipe,
          version: sql`${recipes.version} + 1`,
        })
        .where(and(owned(id), eq(recipes.version, parsed.version)))
        .returning();
      if (!row) {
        await get(id); // Foreign/missing records return the same 404, never version information.
        throw new AccessError("version_conflict", 409);
      }
      return SavedRecipe.parse(row);
    },
  };
}
