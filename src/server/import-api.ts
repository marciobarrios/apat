import { z } from "zod";
import { ACCOUNT_SCOPE_HEADER } from "../lib/library-contract";
import { createRecipeImports } from "./db/recipe-imports";
import type { Identity } from "./db/library";
import { AccessError } from "./errors";
import { assertSameOrigin, errorResponse, privateJson, readJson } from "./http";

export function importApi(deps: {
  identity: () => Promise<Identity>;
  imports: (identity: Identity) => ReturnType<typeof createRecipeImports>;
  origin: () => string;
  schedule: (work: () => Promise<void>) => void;
}) {
  return async (
    request: Request,
    operation: "list" | "start" | "get" | "cancel" | "save",
    id?: string,
  ) => {
    try {
      if (["start", "cancel", "save"].includes(operation)) assertSameOrigin(request, deps.origin());
      const identity = await deps.identity();
      const expected = request.headers.get(ACCOUNT_SCOPE_HEADER);
      if (expected !== null && expected !== identity.id)
        throw new AccessError("account_changed", 409);
      const service = deps.imports(identity);
      if (operation === "list") {
        const cursor = z
          .uuid()
          .optional()
          .parse(new URL(request.url).searchParams.get("cursor") ?? undefined);
        return privateJson(await service.list(cursor));
      }
      if (operation === "start") {
        const { job, dispatch } = await service.start(await readJson(request));
        if (dispatch)
          deps.schedule(async () => {
            try {
              await service.run(job.id);
            } catch {
              /* Receipt expires conservatively; never log source data or retry. */
            }
          });
        return privateJson(job, 202);
      }
      const importId = z.uuid().parse(id);
      if (operation === "cancel") return privateJson(await service.cancel(importId));
      if (operation === "save")
        return privateJson(await service.save(importId, await readJson(request)));
      return privateJson(await service.get(importId));
    } catch (error) {
      return errorResponse(error);
    }
  };
}
