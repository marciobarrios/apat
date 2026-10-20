import { z } from "zod";
import { Recipe } from "./recipe";

export const CreateRecipe = z
  .object({
    key: z.uuid(),
    recipe: Recipe,
  })
  .strict();
export const UpdateRecipe = z
  .object({
    version: z.number().int().positive().max(2147483646),
    recipe: Recipe,
  })
  .strict();
export const SavedRecipe = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  original: Recipe,
  edited: Recipe,
});
export type SavedRecipeData = z.infer<typeof SavedRecipe>;
export const RecipeList = z.object({
  recipes: z.array(SavedRecipe),
  nextCursor: z.string().nullable(),
});
export const Account = z.object({ id: z.string(), name: z.string() });
