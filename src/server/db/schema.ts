import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { RecipeData } from "../../lib/recipe";
export const memberships = pgTable("memberships", {
  id: text().primaryKey(),
  active: integer().notNull().default(0),
});
export const budgets = pgTable(
  "budgets",
  {
    id: text().primaryKey(),
    limitMicros: integer().notNull(),
    reservedMicros: integer().notNull().default(0),
    spentMicros: integer().notNull().default(0),
  },
  (t) => [
    check(
      "budget_nonnegative",
      sql`${t.limitMicros} >= 0 and ${t.reservedMicros} >= 0 and ${t.spentMicros} >= 0`,
    ),
  ],
);
export const imports = pgTable(
  "imports",
  {
    id: text().primaryKey(),
    ownerId: text()
      .notNull()
      .references(() => memberships.id),
    source: text().notNull(),
    idempotencyKey: text().notNull(),
    state: text().notNull().default("queued"),
    reservationMicros: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("import_owner_key").on(t.ownerId, t.idempotencyKey),
    check("reservation_nonnegative", sql`${t.reservationMicros} >= 0`),
  ],
);
export const outbox = pgTable("dispatch_outbox", {
  importId: text()
    .primaryKey()
    .references(() => imports.id),
  attempts: integer().notNull().default(0),
  deliveredAt: timestamp({ withTimezone: true }),
});
export const recipes = pgTable(
  "recipes",
  {
    id: text().primaryKey(),
    ownerId: text()
      .notNull()
      .references(() => memberships.id),
    version: integer().notNull().default(1),
    original: jsonb().$type<RecipeData>().notNull(),
    edited: jsonb().$type<RecipeData>().notNull(),
    creationKey: text(),
    creationHash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recipe_owner_creation_key").on(t.ownerId, t.creationKey),
    index("recipe_owner_id").on(t.ownerId, t.id),
    check("recipe_positive_version", sql`${t.version} > 0`),
  ],
);
export const mediaObjects = pgTable("media_objects", {
  id: text().primaryKey(),
  ownerId: text()
    .notNull()
    .references(() => memberships.id),
  importId: text().references(() => imports.id),
  objectKey: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  cleanupState: text().notNull().default("pending"),
});

export const recipeImports = pgTable(
  "recipe_imports",
  {
    id: text().primaryKey(),
    ownerId: text()
      .notNull()
      .references(() => memberships.id),
    requestKey: text().notNull(),
    sourceUrl: text().notNull(),
    provider: text().notNull(),
    state: text().notNull().default("queued"),
    reservedCredits: integer().notNull(),
    heldCredits: integer().notNull(),
    extractionId: text(),
    errorCode: text(),
    draft: jsonb().$type<RecipeData>(),
    recipeId: text().references(() => recipes.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recipe_import_owner_key").on(t.ownerId, t.requestKey),
    index("recipe_import_owner_created").on(t.ownerId, t.createdAt, t.id),
    index("recipe_import_source").on(t.ownerId, t.sourceUrl),
    check(
      "recipe_import_credits",
      sql`${t.reservedCredits} > 0 and ${t.heldCredits} >= 0 and ${t.heldCredits} <= ${t.reservedCredits}`,
    ),
    check(
      "recipe_import_state",
      sql`${t.state} in ('queued', 'extracting', 'needs_review', 'saved', 'failed', 'outcome_unknown', 'cancelled')`,
    ),
  ],
);
