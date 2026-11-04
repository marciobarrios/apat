import { z } from "zod";
const Evidence = z.object({
  kind: z.enum(["caption", "audio", "visual", "user"]),
  excerpt: z.string().max(2000),
  timestampSeconds: z.number().nonnegative().nullable(),
});
export const Ingredient = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(200),
    original: z.string().max(500),
    quantity: z.number().nonnegative().nullable(),
    quantityMax: z.number().nonnegative().nullable(),
    unit: z.string().max(80).nullable(),
    evidence: Evidence,
  })
  .refine(
    (v) => v.quantityMax === null || (v.quantity !== null && v.quantityMax >= v.quantity),
    "Invalid quantity range",
  );
export const Recipe = z.object({
  title: z.string().trim().min(1).max(160),
  language: z.string().min(2).max(20),
  servings: z.number().positive().nullable(),
  cookMinutes: z.number().nonnegative().nullable(),
  ingredients: z.array(Ingredient).min(1).max(100),
  steps: z
    .array(
      z.object({ id: z.string().min(1), text: z.string().min(1).max(3000), evidence: Evidence }),
    )
    .min(1)
    .max(100),
  warnings: z.array(z.string().max(500)).max(30),
  sourceUrl: z.url().nullable(),
  provenance: z
    .object({
      provider: z.enum(["instagram", "youtube"]),
      creator: z.string().max(200).nullable(),
      extractionId: z.string().max(100),
      schemaVersion: z.string().max(50),
    })
    .optional(),
});
export type RecipeData = z.infer<typeof Recipe>;
export function scaleQuantity(
  value: number | null,
  base: number | null,
  target: number,
): number | null {
  if (value === null || base === null) return null;
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(base) || base <= 0)
    throw new Error("Invalid servings");
  return Math.round(((value * target) / base) * 1000) / 1000;
}
export const sampleRecipe: RecipeData = {
  title: "Chickpeas with lemon",
  language: "en",
  servings: 2,
  cookMinutes: null,
  sourceUrl: null,
  warnings: ["Salt quantity and cooking time were not stated."],
  ingredients: [
    {
      id: "chickpeas",
      name: "Cooked chickpeas",
      original: "400 g cooked chickpeas",
      quantity: 400,
      quantityMax: null,
      unit: "g",
      evidence: { kind: "caption", excerpt: "400 g cooked chickpeas", timestampSeconds: null },
    },
    {
      id: "lemon",
      name: "Lemon",
      original: "1 lemon",
      quantity: 1,
      quantityMax: null,
      unit: null,
      evidence: { kind: "caption", excerpt: "1 lemon", timestampSeconds: null },
    },
    {
      id: "salt",
      name: "Salt",
      original: "Salt to taste",
      quantity: null,
      quantityMax: null,
      unit: null,
      evidence: { kind: "caption", excerpt: "Salt to taste", timestampSeconds: null },
    },
  ],
  steps: [
    {
      id: "warm",
      text: "Warm the chickpeas in a pan.",
      evidence: {
        kind: "caption",
        excerpt: "Warm the chickpeas in a pan.",
        timestampSeconds: null,
      },
    },
    {
      id: "finish",
      text: "Add lemon juice and salt to taste.",
      evidence: {
        kind: "caption",
        excerpt: "Add lemon juice and salt to taste.",
        timestampSeconds: null,
      },
    },
  ],
};
