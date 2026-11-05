import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { sampleRecipe } from "../../src/lib/recipe";
import { ACCOUNT_SCOPE_HEADER, type SavedRecipeData } from "../../src/lib/library-contract";
import {
  ImportRecord,
  SaveImport,
  StartImport,
  type ImportRecordData,
} from "../../src/lib/import-contract";

// Browser tests mock the app API with authored data. They perform no provider,
// OAuth or Neon calls; PGlite exercises the server handlers separately.
async function fixture(page: Page) {
  const jobs: ImportRecordData[] = [];
  const recipes: SavedRecipeData[] = [];
  const keys: string[] = [];
  let loseResponse = false;
  let nextState: ImportRecordData["state"] = "needs_review";
  let accountChanged = false;
  await page.route("**/api/account", (route) =>
    route.fulfill({ json: { id: "alice", name: "Alice (authored fixture)" } }),
  );
  await page.route("**/api/recipes", (route) =>
    route.fulfill({
      json: {
        account: { id: "alice", name: "Alice (authored fixture)" },
        recipes,
        nextCursor: null,
      },
    }),
  );
  await page.route("**/api/imports**", async (route) => {
    const request = route.request();
    expect(request.headers()[ACCOUNT_SCOPE_HEADER.toLowerCase()]).toBe("alice");
    if (accountChanged) {
      await route.fulfill({ status: 409, json: { error: "account_changed" } });
      return;
    }
    if (request.method() === "GET") {
      await route.fulfill({ json: { configured: true, imports: jobs, nextCursor: null } });
      return;
    }
    if (request.url().endsWith("/save")) {
      const { recipe } = SaveImport.parse(request.postDataJSON());
      const job = jobs[0];
      const saved = { id: randomUUID(), version: 1, original: job.draft!, edited: recipe };
      recipes.push(saved);
      job.state = "saved";
      job.recipeId = saved.id;
      await route.fulfill({ json: saved });
      return;
    }
    const input = StartImport.parse(request.postDataJSON());
    keys.push(input.key);
    const job =
      jobs[0] ??
      ImportRecord.parse({
        id: randomUUID(),
        state: nextState,
        sourceUrl: input.url,
        recipeId: null,
        errorCode: nextState === "outcome_unknown" ? "outcome_unknown" : null,
        extractionId: "ext_authored",
        draft:
          nextState === "needs_review"
            ? {
                ...sampleRecipe,
                title: "Authored imported recipe",
                servings: null,
                sourceUrl: input.url,
                provenance: {
                  provider: input.url.includes("youtube") ? "youtube" : "instagram",
                  creator: null,
                  extractionId: "ext_authored",
                  schemaVersion: "apat-recipe-v1",
                },
              }
            : null,
      });
    if (!jobs.length) jobs.push(job);
    if (loseResponse) {
      loseResponse = false;
      await route.abort();
      return;
    }
    await route.fulfill({ status: 202, json: job });
  });
  return {
    jobs,
    recipes,
    keys,
    loseResponse: () => {
      loseResponse = true;
    },
    state: (state: typeof nextState) => {
      nextState = state;
    },
    switchAccount: () => {
      accountChanged = true;
    },
  };
}
for (const source of [
  "https://www.instagram.com/reel/AUTHORED123/",
  "https://www.youtube.com/watch?v=abcdefghijk",
]) {
  test(`authored import: review, correct and save ${source.includes("youtube") ? "YouTube" : "Instagram"} without replacing original evidence`, async ({
    page,
  }) => {
    const mock = await fixture(page);
    await page.goto("/");
    await page.getByLabel("Instagram or YouTube recipe link").fill(source);
    await page.getByRole("button", { name: "Import recipe", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Authored imported recipe" })).toBeVisible();
    await expect(page.getByRole("link", { name: /View original/ })).toHaveAttribute("href", source);
    await expect(page.getByLabel("Servings", { exact: true })).toBeDisabled();
    await expect(page.getByText("400 g", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Review & edit" }).click();
    await page.getByLabel("Recipe title").fill("My corrected recipe");
    await page.getByLabel("Quantity for Salt", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Save to notebook", exact: true }).last().click();
    await expect(page.getByRole("heading", { name: "My corrected recipe" })).toBeVisible();
    expect(mock.recipes[0].original.title).toBe("Authored imported recipe");
    expect(mock.recipes[0].original.ingredients[2].quantity).toBeNull();
    expect(mock.recipes[0].edited.ingredients[2].quantity).toBe(2);
    expect(mock.keys).toHaveLength(1);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "My corrected recipe", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Imports", exact: true })).toHaveCount(0);
    await expect(page.getByText("Saved to notebook", { exact: true })).toHaveCount(0);
    expect(mock.jobs[0].state).toBe("saved");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
test("authored import: saving an unchanged draft saves the imported recipe", async ({ page }) => {
  const mock = await fixture(page);
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await page.getByRole("button", { name: "Save to notebook", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Authored imported recipe" })).toBeVisible();
  expect(mock.recipes[0].edited.title).toBe("Authored imported recipe");
});

test("authored import: checks availability before allowing submission", async ({ page }) => {
  const mock = await fixture(page);
  let release: (() => void) | undefined;
  await page.route("**/api/imports", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: { configured: true, imports: [], nextCursor: null } });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Checking imports…" })).toBeDisabled();
  await expect(page.getByLabel("Instagram or YouTube recipe link")).toBeDisabled();
  expect(mock.keys).toHaveLength(0);
  release?.();
  await expect(page.getByRole("button", { name: "Import recipe", exact: true })).toBeEnabled();
});

test("authored import: disabled setup explains the blocker before a paid action", async ({
  page,
}) => {
  const mock = await fixture(page);
  await page.route("**/api/imports", (route) =>
    route.fulfill({
      json: { configured: false, imports: [], nextCursor: null },
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Imports unavailable" })).toBeDisabled();
  await expect(
    page.getByText("The notebook owner needs to finish connecting", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a recipe", exact: true })).toBeEnabled();
  expect(mock.keys).toHaveLength(0);
});

test("authored import: setup removed after loading disables further attempts", async ({ page }) => {
  const mock = await fixture(page);
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.route("**/api/imports", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({ status: 503, json: { error: "imports_not_configured" } });
    else await route.fallback();
  });
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByRole("button", { name: "Imports unavailable" })).toBeDisabled();
  expect(mock.keys).toHaveLength(0);
});

test("authored import: review can add missing ingredients/steps and preserve ranges", async ({
  page,
}) => {
  const mock = await fixture(page);
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await page.getByRole("button", { name: "Review & edit" }).click();
  await page.getByLabel("Servings in source").fill("3");
  await page.getByLabel("Upper quantity for Cooked chickpeas").fill("500");
  await page.getByRole("button", { name: "Add ingredient", exact: true }).click();
  await page.getByLabel("Ingredient 4", { exact: true }).fill("Parsley");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await page.getByLabel("Step 3", { exact: true }).fill("Finish with parsley.");
  await page.getByRole("button", { name: "Save to notebook", exact: true }).last().click();
  await expect(page.getByText("400–500 g", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Servings", { exact: true })).toHaveValue("3");
  expect(mock.recipes[0].edited.ingredients[3].evidence.kind).toBe("user");
  expect(mock.recipes[0].original.ingredients).toHaveLength(3);
});
test("authored import: restores a pending receipt after navigation without resubmitting", async ({
  page,
}) => {
  const mock = await fixture(page);
  mock.state("extracting");
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByText("Reading the video…")).toBeVisible();
  await expect(page.getByLabel("Instagram or YouTube recipe link")).toHaveValue("");
  await page.reload();
  await expect(page.getByText("Reading the video…")).toBeVisible();
  expect(mock.keys).toHaveLength(1);
  mock.jobs[0].state = "needs_review";
  mock.jobs[0].draft = { ...sampleRecipe, title: "Authored finished draft" };
  await expect(page.getByRole("button", { name: "Review draft" })).toBeVisible({ timeout: 10000 });
});
test("authored import: a lost submission response reuses the same intent", async ({ page }) => {
  const mock = await fixture(page);
  mock.loseResponse();
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByText("Your draft is still here", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Instagram or YouTube recipe link")).toHaveValue(
    "https://youtu.be/abcdefghijk",
  );
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Authored imported recipe" })).toBeVisible();
  expect(mock.keys).toHaveLength(2);
  expect(new Set(mock.keys).size).toBe(1);
});
test("authored import: unknown outcome has no paid retry or misleading cancellation", async ({
  page,
}) => {
  const mock = await fixture(page);
  mock.state("outcome_unknown");
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByText("Credits may have been used", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry import" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel import" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add a recipe", exact: true })).toBeVisible();
});
test("authored import: stale account rejects submission and removes private imports", async ({
  page,
}) => {
  const mock = await fixture(page);
  await page.goto("/");
  await page.getByLabel("Instagram or YouTube recipe link").fill("https://youtu.be/abcdefghijk");
  mock.switchAccount();
  await page.getByRole("button", { name: "Import recipe", exact: true }).click();
  await expect(page.getByText("Your signed-in account changed", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Instagram or YouTube recipe link")).toHaveCount(0);
  expect(mock.keys).toHaveLength(0);
});
