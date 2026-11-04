import "server-only";
import { after } from "next/server";
import { importApi } from "./import-api";
import { requireIdentity } from "./auth";
import { getDatabase } from "./db/client";
import { createRecipeImports } from "./db/recipe-imports";
import { readConfig } from "./config";
import { readImportPolicy } from "./mamitsu";

export const importsApi = importApi({
  identity: requireIdentity,
  imports: (identity) => createRecipeImports(getDatabase(), identity, readImportPolicy),
  origin: () => readConfig().APP_ORIGIN,
  schedule: (work) => after(work),
});
