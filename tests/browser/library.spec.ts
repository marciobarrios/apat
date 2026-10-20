import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  CreateRecipe,
  SavedRecipe,
  UpdateRecipe,
  type SavedRecipeData,
} from "../../src/lib/library-contract";

// Browser interaction tests deliberately mock HTTP, never Google/Neon verification.
// The API suite separately executes these contracts against local PostgreSQL/PGlite.
async function mockLibrary(page: Page) {
  const records = new Map<string, SavedRecipeData>();
  const keys = new Map<string, string>();
  let createCount = 0;
  let failNext = false;
  let failAfterCommit = false;
  let conflictNext = false;
  await page.route("**/api/account", (route) =>
    route.fulfill({ json: { id: "alice", name: "Alice (test fixture)" } }),
  );
  await page.route("**/api/recipes**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST") {
      createCount++;
      if (failNext) {
        failNext = false;
        await route.fulfill({ status: 503, json: { error: "service_unavailable" } });
        return;
      }
      const input = CreateRecipe.parse(request.postDataJSON());
      const id = keys.get(input.key) ?? randomUUID();
      const recipe = records.get(id) ?? {
        id,
        version: 1,
        original: input.recipe,
        edited: input.recipe,
      };
      records.set(id, recipe);
      keys.set(input.key, id);
      if (failAfterCommit) {
        failAfterCommit = false;
        await route.abort();
        return;
      }
      await route.fulfill({ status: 201, json: recipe });
      return;
    }
    const id = path.split("/")[3];
    if (!id) {
      await route.fulfill({ json: { recipes: [...records.values()], nextCursor: null } });
      return;
    }
    const record = records.get(id);
    if (!record) {
      await route.fulfill({ status: 404, json: { error: "not_found" } });
      return;
    }
    if (request.method() === "PATCH") {
      if (conflictNext) {
        conflictNext = false;
        await route.fulfill({ status: 409, json: { error: "version_conflict" } });
        return;
      }
      const input = UpdateRecipe.parse(request.postDataJSON());
      const updated = SavedRecipe.parse({
        ...record,
        version: record.version + 1,
        edited: input.recipe,
      });
      records.set(id, updated);
      await route.fulfill({ json: updated });
      return;
    }
    await route.fulfill({ json: record });
  });
  return {
    records,
    count: () => createCount,
    fail: () => {
      failNext = true;
    },
    loseResponse: () => {
      failAfterCommit = true;
    },
    conflict: () => {
      conflictNext = true;
    },
  };
}
async function fillRecipe(page: Page) {
  await page.getByRole("button", { name: "Add a recipe", exact: true }).click();
  await page.getByLabel("Recipe title").fill("Lemon pasta");
  await page.getByLabel("Ingredients, one per line").fill("Pasta\nLemon\nSalt to taste");
  await page.getByLabel("Instructions, one per line").fill("Boil the pasta.\nAdd lemon.");
}
test("missing configuration fails closed and keeps the sample available", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByText("Private notebooks are waiting", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  expect((await request.get("/api/recipes")).status()).toBe(503);
  expect((await request.post("/api/recipes", { data: {} })).status()).toBe(503);
  await page.getByRole("link", { name: "Explore the sample" }).click();
  await expect(page.getByRole("heading", { name: "Chickpeas with lemon" })).toBeVisible();
});
test("mocked account: create, reload, edit, export and keep browser storage empty", async ({
  page,
}, info) => {
  const mock = await mockLibrary(page);
  await page.goto("/");
  await expect(page.getByText("Your notebook is ready.")).toBeVisible();
  await fillRecipe(page);
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
  expect(mock.count()).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Lemon pasta", exact: true }).click();
  await page.getByRole("button", { name: "Review & edit" }).click();
  await page.getByLabel("Recipe title").fill("My lemon pasta");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "My lemon pasta" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("apat-recipe.json");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect([...mock.records.values()][0].original.title).toBe("Lemon pasta");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `artifacts/${info.project.name}-private-recipe-mock.png`,
    fullPage: true,
  });
});
test("mocked account: cancel and validation make no writes; failed save retains draft", async ({
  page,
}) => {
  const mock = await mockLibrary(page);
  await page.goto("/");
  await fillRecipe(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(mock.count()).toBe(0);
  await page.getByRole("button", { name: "Add a recipe", exact: true }).click();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByText("Add a title, at least", { exact: false })).toBeVisible();
  expect(mock.count()).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await fillRecipe(page);
  mock.fail();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByText("The service could not", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Recipe title")).toHaveValue("Lemon pasta");
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
  expect(mock.records.size).toBe(1);
});
test("mocked account: retry after a lost response uses the same idempotency key", async ({
  page,
}) => {
  const mock = await mockLibrary(page);
  await page.goto("/");
  await fillRecipe(page);
  mock.loseResponse();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByText("The service could not", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Save recipe", exact: true }).dblclick();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
  expect(mock.records.size).toBe(1);
});
test("mocked account: stale edit keeps the draft and cancel restores saved content", async ({
  page,
}) => {
  const mock = await mockLibrary(page);
  await page.goto("/");
  await fillRecipe(page);
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await page.getByRole("button", { name: "Review & edit" }).click();
  await page.getByLabel("Recipe title").fill("Unsaved title");
  mock.conflict();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Recipe title")).toHaveValue("Unsaved title");
  await expect(page.getByText("This recipe changed", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
});
test("mocked auth: cancelled Google sign-in can be retried without exposing a library", async ({
  page,
}) => {
  await page.route("**/api/account", (route) =>
    route.fulfill({ status: 401, json: { error: "sign_in_required" } }),
  );
  let attempts = 0;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    attempts++;
    expect(route.request().postDataJSON().provider).toBe("google");
    await route.fulfill({ status: 400, json: { code: "ACCESS_DENIED", message: "Cancelled" } });
  });
  await page.goto("/");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page.getByText("Google sign-in was cancelled", { exact: false })).toBeVisible();
  }
  expect(attempts).toBe(2);
  await expect(page.getByRole("button", { name: "Add a recipe", exact: true })).toHaveCount(0);
});
test("mocked auth: uninvited identity sees denial and can sign out", async ({ page }) => {
  await page.route("**/api/account", (route) =>
    route.fulfill({ status: 403, json: { error: "invitation_required" } }),
  );
  await page.goto("/");
  await expect(page.getByText("has not been invited", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a recipe", exact: true })).toHaveCount(0);
});

test("mocked auth: switching accounts clears the previous account's recipe", async ({ page }) => {
  await mockLibrary(page);
  await page.goto("/");
  await fillRecipe(page);
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
  await page.route("**/api/account", (route) =>
    route.fulfill({ json: { id: "bob", name: "Bob" } }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Your signed-in account changed", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toHaveCount(0);
});

test("mocked auth: sign-out failure is retryable, success clears private state", async ({
  page,
}) => {
  await mockLibrary(page);
  await page.goto("/");
  await fillRecipe(page);
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toBeVisible();
  let attempts = 0;
  await page.route("**/api/auth/sign-out", async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { message: "Unavailable" } });
      return;
    }
    await page.route("**/api/account", (next) =>
      next.fulfill({ status: 401, json: { error: "sign_in_required" } }),
    );
    await route.fulfill({ json: { success: true } });
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Sign out failed. Please try again.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Sign in with Google to open", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lemon pasta" })).toHaveCount(0);
});
