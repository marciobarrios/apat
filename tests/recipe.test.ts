import { expect, it } from "vitest";
import { Recipe, sampleRecipe, scaleQuantity } from "../src/lib/recipe";
import { transition } from "../src/lib/import-state";
it("keeps unknown quantities and evidence", () => {
  const result = Recipe.parse(sampleRecipe);
  expect(result.ingredients[2].quantity).toBeNull();
  expect(result.ingredients[2].original).toBe("Salt to taste");
});
it("scales fractions and preserves unknowns", () => {
  expect(scaleQuantity(0.5, 2, 3)).toBe(0.75);
  expect(scaleQuantity(null, 2, 4)).toBeNull();
  expect(scaleQuantity(1, null, 4)).toBeNull();
  expect(() => scaleQuantity(1, 2, 0)).toThrow();
});
it("rejects invalid ranges and blank titles", () => {
  expect(Recipe.safeParse({ ...sampleRecipe, title: " " }).success).toBe(false);
  expect(
    Recipe.safeParse({
      ...sampleRecipe,
      ingredients: [{ ...sampleRecipe.ingredients[0], quantityMax: 1 }],
    }).success,
  ).toBe(false);
});
it("does not mutate source while scaling", () => {
  const before = JSON.stringify(sampleRecipe);
  scaleQuantity(400, 2, 4);
  expect(JSON.stringify(sampleRecipe)).toBe(before);
});
it("allows only explicit state transitions", () => {
  expect(transition("queued", "cancelled")).toBe("cancelled");
  expect(() => transition("cancelled", "extracting")).toThrow();
  expect(() => transition("paid_outcome_unknown", "extracting")).toThrow();
  expect(() => transition("ready", "queued")).toThrow();
});
