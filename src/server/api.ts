import "server-only";
import { libraryApi } from "./library-api";
import { requireIdentity } from "./auth";
import { getDatabase } from "./db/client";
import { createLibrary } from "./db/library";
import { readConfig } from "./config";

export const api = libraryApi({
  identity: requireIdentity,
  library: (identity) => createLibrary(getDatabase(), identity),
  origin: () => readConfig().APP_ORIGIN,
});
