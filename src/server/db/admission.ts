import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { z } from "zod";
import { budgets, imports, memberships, outbox, recipes } from "./schema";
import { canonicalizeInstagram } from "../sources/instagram";
import { Recipe } from "../../lib/recipe";
// Local PostgreSQL experiment. No production API uses this repository yet.
export type ExperimentDatabase = ReturnType<typeof drizzle>;
const Admission = z.object({
  ownerId: z.string().min(1),
  key: z.string().min(1).max(100),
  url: z.string(),
  reservationMicros: z.number().int().min(0).max(1000000),
});
export class DomainError extends Error {}
export async function admitImport(db: ExperimentDatabase, input: z.infer<typeof Admission>) {
  const parsed = Admission.parse(input);
  const source = canonicalizeInstagram(parsed.url);
  return db.transaction(async (tx) => {
    // The global budget lock serializes admission, including duplicate keys and user limits.
    const [global] = await tx.select().from(budgets).where(eq(budgets.id, "global")).for("update");
    const [member] = await tx.select().from(memberships).where(eq(memberships.id, parsed.ownerId));
    if (!member?.active) throw new DomainError("beta_access_required");
    const [existing] = await tx
      .select()
      .from(imports)
      .where(and(eq(imports.ownerId, parsed.ownerId), eq(imports.idempotencyKey, parsed.key)));
    if (existing) {
      if (existing.source !== source) throw new DomainError("idempotency_conflict");
      return existing;
    }
    const [personal] = await tx
      .select()
      .from(budgets)
      .where(eq(budgets.id, parsed.ownerId))
      .for("update");
    if (!global || !personal) throw new DomainError("budget_not_configured");
    for (const budget of [global, personal])
      if (
        budget.spentMicros + budget.reservedMicros + parsed.reservationMicros >
        budget.limitMicros
      )
        throw new DomainError("budget_exhausted");
    const active = await tx
      .select()
      .from(imports)
      .where(
        inArray(imports.state, [
          "queued",
          "acquiring",
          "extracting",
          "validating",
          "paid_outcome_unknown",
        ]),
      );
    if (active.length >= 2 || active.some((job) => job.ownerId === parsed.ownerId))
      throw new DomainError("concurrency_limit");
    const [job] = await tx
      .insert(imports)
      .values({
        id: crypto.randomUUID(),
        ownerId: parsed.ownerId,
        source,
        idempotencyKey: parsed.key,
        reservationMicros: parsed.reservationMicros,
      })
      .returning();
    await tx
      .update(budgets)
      .set({ reservedMicros: sql`${budgets.reservedMicros}+${parsed.reservationMicros}` })
      .where(inArray(budgets.id, ["global", parsed.ownerId]));
    await tx.insert(outbox).values({ importId: job.id });
    return job;
  });
}
export async function readRecipe(db: ExperimentDatabase, ownerId: string, id: string) {
  const [recipe] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId)));
  if (!recipe) throw new DomainError("not_found");
  return recipe;
}
export async function editRecipe(
  db: ExperimentDatabase,
  ownerId: string,
  id: string,
  version: number,
  edited: z.input<typeof Recipe>,
) {
  const content = Recipe.parse(edited);
  const [recipe] = await db
    .update(recipes)
    .set({ edited: content, version: version + 1 })
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId), eq(recipes.version, version)))
    .returning();
  if (!recipe) throw new DomainError("not_found_or_conflict");
  return recipe;
}
