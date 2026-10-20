import { pgTable, text, integer, jsonb, timestamp, uniqueIndex, check } from "drizzle-orm/pg-core";
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
export const recipes = pgTable("recipes", {
  id: text().primaryKey(),
  ownerId: text()
    .notNull()
    .references(() => memberships.id),
  version: integer().notNull().default(1),
  original: jsonb().$type<RecipeData>().notNull(),
  edited: jsonb().$type<RecipeData>().notNull(),
});
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
