import { expect, test } from "@playwright/test";
test("review, save, reload, export and preserve evidence", async ({ page }) => {
  await page.goto("/sample");
  await page.getByRole("button", { name: "Review & edit" }).click();
  await page.getByLabel("Recipe title").fill("My lemon chickpeas");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { name: "My lemon chickpeas" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "My lemon chickpeas" })).toBeVisible();
  await expect(page.getByText("Cooking time: not stated")).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("apat-recipe.json");
});
test("invalid edits remain reviewable and cancel restores original", async ({ page }) => {
  await page.goto("/sample");
  await page.getByRole("button", { name: "Review & edit" }).click();
  await page.getByLabel("Recipe title").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Add a title");
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await expect(page.getByRole("heading", { name: "Chickpeas with lemon" })).toBeVisible();
});
test("repeated captures make no network or paid calls", async ({ page }) => {
  const outgoing: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3026")) outgoing.push(request.url());
  });
  await page.goto("/sample");
  await page
    .getByLabel("Instagram recipe link")
    .fill("https://www.instagram.com/reel/DWJJrpcCLLP/");
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Check availability" }).click();
  await expect(page.getByRole("status")).toContainText("No request or model call was made");
  expect(outgoing).toEqual([]);
  await expect(page.getByRole("heading", { name: "Chickpeas with lemon" })).toHaveCount(1);
});
test("serving scaling leaves time and unknowns unchanged; cooking has touch controls", async ({
  page,
}) => {
  await page.goto("/sample");
  await page.getByLabel("Servings", { exact: true }).selectOption("4");
  await expect(page.getByText("800 g", { exact: true })).toBeVisible();
  await expect(page.getByText("To taste / not stated", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start cooking" }).click();
  await page.getByLabel("Done", { exact: true }).first().check();
  await expect(page.getByLabel("Done", { exact: true }).first()).toBeChecked();
  await expect(page.getByText("Cooking time: not stated")).toBeVisible();
});
test("keyboard flow and responsive page without overflow", async ({ page }, info) => {
  await page.goto("/sample");
  await page.getByRole("button", { name: "Review & edit" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Recipe title")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await page.screenshot({ path: `artifacts/${info.project.name}-notebook.png`, fullPage: true });
});
test("no unauthenticated live import endpoint exists", async ({ request }) => {
  expect(
    (
      await request.post("/api/imports", {
        data: { url: "https://www.instagram.com/reel/DWJJrpcCLLP/" },
      })
    ).status(),
  ).toBe(404);
});
