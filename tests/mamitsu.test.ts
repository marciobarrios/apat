import { expect, it } from "vitest";
import { canonicalizeRecipeSource } from "../src/lib/import-contract";
import { sampleRecipe } from "../src/lib/recipe";
import { ExtractedRecipe, mamitsuRecipeSchema, toRecipe } from "../src/server/mamitsu-contract";
import { extractWithMamitsu, MamitsuFailure, readImportPolicy } from "../src/server/mamitsu";

const youtube = "https://www.youtube.com/watch?v=abcdefghijk";
const reel = "https://www.instagram.com/reel/AUTHORED123/";
export const authoredExtraction = {
  ...sampleRecipe,
  title: null,
  language: "ca",
  creator: null,
  ingredients: sampleRecipe.ingredients.map(({ id: _id, ...ingredient }) => ingredient),
  steps: sampleRecipe.steps.map(({ id: _id, ...step }) => step),
};
// Entirely authored provider envelopes. No creator captions or provider requests.
it("canonicalizes shared links without forwarding tracking, credentials or arbitrary hosts", () => {
  expect(canonicalizeRecipeSource("https://youtu.be/abcdefghijk?si=tracking&t=20").url).toBe(
    youtube,
  );
  expect(
    canonicalizeRecipeSource("https://m.youtube.com/shorts/abcdefghijk?feature=share").url,
  ).toBe(youtube);
  expect(canonicalizeRecipeSource(`${reel}?igsh=tracking`).url).toBe(reel);
  for (const url of [
    "http://youtube.com/watch?v=abcdefghijk",
    "https://youtube.com.evil.test/watch?v=abcdefghijk",
    "https://user:password@youtube.com/watch?v=abcdefghijk",
    "https://127.0.0.1/reel/AUTHORED123",
    "https://youtube.com/playlist?list=private",
    "https://www.instagram.com/p/AUTHORED123/",
    "https://youtu.be/abcdefghijk/extra",
  ])
    expect(() => canonicalizeRecipeSource(url)).toThrow();
});
it("sends only Mamitsu-supported JSON Schema keywords within documented size/depth bounds", () => {
  const allowed = new Set([
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "minimum",
    "maximum",
    "anyOf",
    "minItems",
    "maxItems",
  ]);
  let nodes = 0;
  function inspect(value: unknown, depth = 1) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    nodes++;
    expect(depth).toBeLessThanOrEqual(8);
    for (const [key, child] of Object.entries(value)) {
      expect(allowed.has(key), key).toBe(true);
      if (key === "properties" && child && typeof child === "object")
        for (const property of Object.values(child)) inspect(property, depth + 1);
      if (key === "items") inspect(child, depth + 1);
      if (key === "anyOf" && Array.isArray(child))
        child.forEach((item) => inspect(item, depth + 1));
    }
  }
  inspect(mamitsuRecipeSchema);
  expect(nodes).toBeLessThanOrEqual(200);
  expect(Buffer.byteLength(JSON.stringify(mamitsuRecipeSchema))).toBeLessThan(16 * 1024);
});
it("keeps unknown facts and multilingual evidence, with deterministic IDs and server source attribution", () => {
  const recipe = toRecipe(
    ExtractedRecipe.parse(authoredExtraction),
    reel,
    "instagram",
    "ext_authored",
  );
  expect(recipe.title).toBe("Untitled recipe");
  expect(recipe.language).toBe("ca");
  expect(recipe.cookMinutes).toBeNull();
  expect(recipe.ingredients[2].quantity).toBeNull();
  expect(recipe.ingredients[0].evidence).toEqual(sampleRecipe.ingredients[0].evidence);
  expect(recipe.provenance?.schemaVersion).toBe("apat-recipe-v1");
});
it("validates a response, source binding and actual request body without an SDK retry layer", async () => {
  let calls = 0;
  const result = await extractWithMamitsu(youtube, "authored-test-key", async (url, init) => {
    calls++;
    expect(url).toBe("https://usemamitsu.com/api/v1/extract");
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      url: youtube,
      schema: mamitsuRecipeSchema,
    });
    return Response.json({
      extraction_id: "ext_authored",
      source: { provider: "youtube", url: youtube },
      data: authoredExtraction,
    });
  });
  expect(calls).toBe(1);
  expect(result.recipe.sourceUrl).toBe(youtube);
  await expect(
    extractWithMamitsu(youtube, "authored-test-key", async () =>
      Response.json({
        extraction_id: "ext_authored",
        source: { provider: "instagram", url: reel },
        data: authoredExtraction,
      }),
    ),
  ).rejects.toMatchObject({ code: "invalid_extraction", free: false });
});
it("never retries ambiguous calls or exposes raw provider errors; distinguishes free from charged failures", async () => {
  for (const [code, free] of [
    ["url_source_rate_limited", true],
    ["insufficient_credits", true],
    ["extraction_failed", false],
    ["invalid_extraction", false],
    ["server_misconfigured", false],
  ] as const) {
    let calls = 0;
    await expect(
      extractWithMamitsu(reel, "authored-test-key", async () => {
        calls++;
        return Response.json(
          { extraction_id: "ext_authored", error: { code, message: "private source content" } },
          { status: 502 },
        );
      }),
    ).rejects.toMatchObject({ free });
    expect(calls).toBe(1);
  }
  await expect(
    extractWithMamitsu(reel, "authored-test-key", async () => {
      throw new Error("private provider detail");
    }),
  ).rejects.toEqual(new MamitsuFailure("outcome_unknown", false));
  await expect(
    extractWithMamitsu(reel, "authored-test-key", async () => new Response("not-json")),
  ).rejects.toMatchObject({ code: "outcome_unknown", free: false });
  await expect(
    extractWithMamitsu(reel, "authored-test-key", async () => new Response("x".repeat(513 * 1024))),
  ).rejects.toMatchObject({ code: "invalid_extraction", free: false });
});
it("rejects empty recipes, invalid quantities and overlong model text before review", async () => {
  for (const data of [
    { ...authoredExtraction, ingredients: [] },
    { ...authoredExtraction, title: "x".repeat(161) },
    {
      ...authoredExtraction,
      ingredients: [{ ...authoredExtraction.ingredients[0], quantityMax: 1 }],
    },
  ]) {
    await expect(
      extractWithMamitsu(reel, "authored-test-key", async () =>
        Response.json({
          extraction_id: "ext_authored",
          source: { provider: "instagram", url: reel },
          data,
        }),
      ),
    ).rejects.toBeInstanceOf(MamitsuFailure);
  }
});
it("requires an explicit kill switch, credential and numerical credit limits", () => {
  expect(() => readImportPolicy({})).toThrow("imports_not_configured");
  expect(() =>
    readImportPolicy({ MAMITSU_IMPORTS_ENABLED: "true", MAMITSU_API_KEY: "secret" }),
  ).toThrow("imports_not_configured");
});
