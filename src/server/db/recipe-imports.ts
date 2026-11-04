import { randomUUID } from "node:crypto";
import { and, desc, eq, exists, inArray, lt, sql } from "drizzle-orm";
import {
  ImportRecord,
  SaveImport,
  StartImport,
  canonicalizeRecipeSource,
} from "../../lib/import-contract";
import { Recipe } from "../../lib/recipe";
import { AccessError } from "../errors";
import { MamitsuFailure, type ImportPolicy, extractWithMamitsu } from "../mamitsu";
import { createLibrary, type Database, type Identity } from "./library";
import { memberships, recipeImports } from "./schema";

type Extract = typeof extractWithMamitsu;
// One database-wide transaction lock covers admission, budget accounting and
// concurrent instances. It does not require UPDATE permission on memberships.
const lock = (db: Database) => db.execute(sql`select pg_advisory_xact_lock(728104, 1)`);
const publicRecord = (row: typeof recipeImports.$inferSelect) =>
  ImportRecord.parse({
    ...row,
    retryable: ["failed", "cancelled"].includes(row.state) && row.heldCredits === 0,
  });
export function createRecipeImports(
  db: Database,
  identity: Identity,
  policy: () => ImportPolicy,
  extract: Extract = extractWithMamitsu,
) {
  const library = createLibrary(db, identity);
  const member = () =>
    db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.id, identity.id), eq(memberships.active, 1)));
  const owned = (id?: string) =>
    and(
      eq(recipeImports.ownerId, identity.id),
      exists(member()),
      id ? eq(recipeImports.id, id) : undefined,
    );
  async function expire() {
    // A queued receipt was never claimed; it is safe to release. A claimed call
    // might have charged: retain its full credit hold and never replay it.
    const stale = lt(recipeImports.updatedAt, new Date(Date.now() - 180000));
    await db
      .update(recipeImports)
      .set({
        state: "cancelled",
        heldCredits: 0,
        errorCode: "dispatch_expired",
        updatedAt: new Date(),
      })
      .where(and(owned(), stale, eq(recipeImports.state, "queued")));
    await db
      .update(recipeImports)
      .set({ state: "outcome_unknown", errorCode: "outcome_unknown", updatedAt: new Date() })
      .where(and(owned(), stale, eq(recipeImports.state, "extracting")));
  }
  async function get(id: string) {
    await library.account();
    await expire();
    const [row] = await db.select().from(recipeImports).where(owned(id));
    if (!row) throw new AccessError("not_found", 404);
    return publicRecord(row);
  }
  return {
    get,
    async list(cursor?: string) {
      await library.account();
      await expire();
      const [anchor] = cursor ? await db.select().from(recipeImports).where(owned(cursor)) : [];
      if (cursor && !anchor) throw new AccessError("not_found", 404);
      const rows = await db
        .select()
        .from(recipeImports)
        .where(
          and(
            owned(),
            anchor
              ? sql`(${recipeImports.createdAt}, ${recipeImports.id}) < (${anchor.createdAt}, ${anchor.id})`
              : undefined,
          ),
        )
        .orderBy(desc(recipeImports.createdAt), desc(recipeImports.id))
        .limit(21);
      let configured = true;
      try {
        policy();
      } catch (error) {
        if (!(error instanceof AccessError) || error.code !== "imports_not_configured") throw error;
        configured = false;
      }
      return {
        configured,
        imports: rows.slice(0, 20).map(publicRecord),
        nextCursor: rows.length > 20 ? rows[19].id : null,
      };
    },
    async start(input: unknown) {
      const parsed = StartImport.parse(input);
      let source: ReturnType<typeof canonicalizeRecipeSource>;
      try {
        source = canonicalizeRecipeSource(parsed.url);
      } catch {
        throw new AccessError("unsupported_url", 400);
      }
      await library.account();
      await expire();
      return db.transaction(async (tx) => {
        await lock(tx);
        const [existing] = await tx
          .select()
          .from(recipeImports)
          .where(and(owned(), eq(recipeImports.requestKey, parsed.key)));
        if (existing) {
          if (existing.sourceUrl !== source.url) throw new AccessError("idempotency_conflict", 409);
          return { job: publicRecord(existing), dispatch: false };
        }
        // A fresh key cannot duplicate an active, uncertain, successful or charged
        // failed call. Only known-free failures/cancelled receipts can be retried.
        const [duplicate] = await tx
          .select()
          .from(recipeImports)
          .where(
            and(
              owned(),
              eq(recipeImports.sourceUrl, source.url),
              sql`(${recipeImports.heldCredits} > 0 or ${recipeImports.state} in ('needs_review', 'saved'))`,
            ),
          )
          .limit(1);
        if (duplicate) return { job: publicRecord(duplicate), dispatch: false };
        const limits = policy();
        const [totals] = await tx
          .select({
            total: sql<number>`coalesce(sum(${recipeImports.heldCredits}), 0)::integer`,
            owner: sql<number>`coalesce(sum(case when ${recipeImports.ownerId} = ${identity.id} then ${recipeImports.heldCredits} else 0 end), 0)::integer`,
            active: sql<number>`count(*) filter (where ${recipeImports.state} in ('queued','extracting','outcome_unknown'))::integer`,
            ownerActive: sql<number>`count(*) filter (where ${recipeImports.ownerId} = ${identity.id} and ${recipeImports.state} in ('queued','extracting','outcome_unknown'))::integer`,
            recent: sql<number>`count(*) filter (where ${recipeImports.createdAt} > now() - interval '1 hour')::integer`,
            ownerRecent: sql<number>`count(*) filter (where ${recipeImports.ownerId} = ${identity.id} and ${recipeImports.createdAt} > now() - interval '1 hour')::integer`,
          })
          .from(recipeImports);
        if (
          totals.total + source.credits > limits.totalCredits ||
          totals.owner + source.credits > limits.ownerCredits
        )
          throw new AccessError("import_budget_exhausted", 429);
        if (
          totals.active >= 2 ||
          totals.ownerActive >= 1 ||
          totals.recent >= 20 ||
          totals.ownerRecent >= 5
        )
          throw new AccessError("import_limit", 429);
        const [row] = await tx
          .insert(recipeImports)
          .select(
            tx
              .select({
                id: sql<string>`${randomUUID()}`.as("id"),
                ownerId: memberships.id,
                requestKey: sql<string>`${parsed.key}`.as("requestKey"),
                sourceUrl: sql<string>`${source.url}`.as("sourceUrl"),
                provider: sql<string>`${source.provider}`.as("provider"),
                state: sql<string>`'queued'`.as("state"),
                reservedCredits: sql<number>`${source.credits}`.as("reservedCredits"),
                heldCredits: sql<number>`${source.credits}`.as("heldCredits"),
                extractionId: sql<string>`null`.as("extractionId"),
                errorCode: sql<string>`null`.as("errorCode"),
                draft: sql<null>`null::jsonb`.as("draft"),
                recipeId: sql<string>`null`.as("recipeId"),
                createdAt: sql<Date>`now()`.as("createdAt"),
                updatedAt: sql<Date>`now()`.as("updatedAt"),
              })
              .from(memberships)
              .where(and(eq(memberships.id, identity.id), eq(memberships.active, 1))),
          )
          .returning();
        if (!row) throw new AccessError("invitation_required", 403);
        return { job: publicRecord(row), dispatch: true };
      });
    },
    async run(id: string) {
      // Resolve the kill switch and recheck entitlement immediately before claim.
      const limits = policy();
      await library.account();
      const [job] = await db
        .update(recipeImports)
        .set({ state: "extracting", updatedAt: new Date() })
        .where(and(owned(id), eq(recipeImports.state, "queued")))
        .returning();
      if (!job) return;
      let result: Awaited<ReturnType<Extract>>;
      try {
        result = await extract(job.sourceUrl, limits.apiKey);
      } catch (error) {
        const failure =
          error instanceof MamitsuFailure ? error : new MamitsuFailure("outcome_unknown", false);
        await db
          .update(recipeImports)
          .set({
            state: failure.code === "outcome_unknown" ? "outcome_unknown" : "failed",
            errorCode: failure.code,
            extractionId: failure.extractionId,
            heldCredits: failure.free ? 0 : job.reservedCredits,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(recipeImports.id, id),
              eq(recipeImports.ownerId, identity.id),
              eq(recipeImports.state, "extracting"),
            ),
          );
        return;
      }
      // Internal settlement retains the owner condition after membership revocation.
      // The owner-facing read/save path continues to require active membership.
      await db
        .update(recipeImports)
        .set({
          state: "needs_review",
          draft: result.recipe,
          extractionId: result.extractionId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(recipeImports.id, id),
            eq(recipeImports.ownerId, identity.id),
            inArray(recipeImports.state, ["extracting", "outcome_unknown"]),
          ),
        );
    },
    async cancel(id: string) {
      await library.account();
      const [row] = await db
        .update(recipeImports)
        .set({ state: "cancelled", heldCredits: 0, updatedAt: new Date() })
        .where(and(owned(id), eq(recipeImports.state, "queued")))
        .returning();
      if (row) return publicRecord(row);
      await get(id);
      throw new AccessError("import_already_started", 409);
    },
    async save(id: string, input: unknown) {
      const parsed = SaveImport.parse(input);
      await library.account();
      return db.transaction(async (tx) => {
        const [row] = await tx.select().from(recipeImports).where(owned(id)).for("update");
        if (!row) throw new AccessError("not_found", 404);
        if (row.state === "saved" && row.recipeId)
          return createLibrary(tx, identity).get(row.recipeId);
        if (row.state !== "needs_review" || !row.draft)
          throw new AccessError("import_not_ready", 409);
        const original = Recipe.parse(row.draft);
        const edited = {
          ...parsed.recipe,
          sourceUrl: original.sourceUrl,
          provenance: original.provenance,
        };
        const saved = await createLibrary(tx, identity).createImported(original, edited, id);
        await tx
          .update(recipeImports)
          .set({ state: "saved", recipeId: saved.id, updatedAt: new Date() })
          .where(eq(recipeImports.id, id));
        return saved;
      });
    },
  };
}
