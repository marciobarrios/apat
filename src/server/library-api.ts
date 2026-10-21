import { z } from "zod";
import { ACCOUNT_SCOPE_HEADER } from "../lib/library-contract";
import { AccessError } from "./errors";
import { createLibrary, type Identity } from "./db/library";
import { assertSameOrigin, errorResponse, privateJson, readJson } from "./http";

type Dependencies = {
  identity: () => Promise<Identity>;
  library: (identity: Identity) => ReturnType<typeof createLibrary>;
  origin: () => string;
};
// Tests exercise these exact handlers with PGlite and an explicit identity provider.
// Identity always comes from the verified session. The optional expected-account
// header can only reject a stale client context; it never selects an owner.
export function libraryApi(deps: Dependencies) {
  return async (
    request: Request,
    operation: "account" | "list" | "create" | "get" | "update" | "export",
    id?: string,
  ) => {
    try {
      if (operation === "create" || operation === "update")
        assertSameOrigin(request, deps.origin());
      const identity = await deps.identity();
      const expectedAccount = request.headers.get(ACCOUNT_SCOPE_HEADER);
      if (expectedAccount !== null && expectedAccount !== identity.id)
        throw new AccessError("account_changed", 409);
      const service = deps.library(identity);
      if (operation === "account") return privateJson(await service.account());
      if (operation === "list") {
        const cursor = z
          .string()
          .max(100)
          .optional()
          .parse(new URL(request.url).searchParams.get("cursor") ?? undefined);
        const [account, list] = await Promise.all([service.account(), service.list(cursor)]);
        return privateJson({ ...list, account });
      }
      if (operation === "create")
        return privateJson(await service.create(await readJson(request)), 201);
      const recipeId = z.uuid().parse(id);
      if (operation === "update")
        return privateJson(await service.update(recipeId, await readJson(request)));
      const recipe = await service.get(recipeId);
      if (operation === "export") {
        const response = privateJson(recipe);
        response.headers.set("Content-Disposition", 'attachment; filename="apat-recipe.json"');
        return response;
      }
      return privateJson(recipe);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
