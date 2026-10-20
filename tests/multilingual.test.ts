import { describe, expect, it } from "vitest";
import { canonicalizeInstagram, parseInstagramHtml } from "../src/server/sources/instagram";
import { Recipe, scaleQuantity } from "../src/lib/recipe";

const url = "https://www.instagram.com/reel/TESTrecipe/";
// Authored examples, not scraped captions. Expected recipes are human-defined contracts:
// these tests do not claim that an unconnected model can infer the structured values.
const examples = [
  {
    language: "en",
    title: "Lemon rice",
    caption:
      "Lemon & rice 🍋\n1.5 cups rice\n½ lemon\nSalt to taste\nCook gently; no time specified.",
    ingredient: "1.5 cups rice",
    name: "rice",
    unit: "cups",
    unknown: "Salt to taste",
    step: "Cook gently; no time specified.",
  },
  {
    language: "es",
    title: "Arroz con limón",
    caption:
      "Arroz & limón 🍋\n1,5 tazas de arroz\n½ limón\nSal al gusto\nCocer suavemente; sin tiempo indicado.",
    ingredient: "1,5 tazas de arroz",
    name: "arroz",
    unit: "tazas",
    unknown: "Sal al gusto",
    step: "Cocer suavemente; sin tiempo indicado.",
  },
  {
    language: "ca",
    title: "Arròs amb llimona",
    caption:
      "Arròs & llimona 🍋\n1,5 tasses d'arròs\n½ llimona\nSal al gust\nCoeu a foc suau; temps no indicat. Col·loqueu-ho al plat.",
    ingredient: "1,5 tasses d'arròs",
    name: "arròs",
    unit: "tasses",
    unknown: "Sal al gust",
    step: "Coeu a foc suau; temps no indicat. Col·loqueu-ho al plat.",
  },
];

function escapedAttribute(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "&#10;");
}
const evidence = (excerpt: string) => ({
  kind: "caption" as const,
  excerpt,
  timestampSeconds: null,
});

describe.each(examples)("$language source preservation", (example) => {
  it("preserves Unicode, entities, line breaks, fractions and locale punctuation in OG metadata", () => {
    const actual = parseInstagramHtml(
      `<meta property="og:description" content="${escapedAttribute(example.caption)}">`,
      url,
    );
    expect(actual.caption).toBe(example.caption);
    expect(actual.modalities).toEqual(["text"]);
    expect(actual.mediaReferences).toEqual([]);
  });
  it("preserves the same text in JSON-LD metadata", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "VideoObject", description: example.caption })}</script>`;
    expect(parseInstagramHtml(html, url).caption).toBe(example.caption);
  });
  it("retains original phrases, language and unknown quantities through validation, export and scaling", () => {
    const recipe = Recipe.parse({
      title: example.title,
      language: example.language,
      servings: 2,
      cookMinutes: null,
      sourceUrl: url,
      warnings: [],
      ingredients: [
        {
          id: "rice",
          name: example.name,
          original: example.ingredient,
          quantity: 1.5,
          quantityMax: null,
          unit: example.unit,
          evidence: evidence(example.ingredient),
        },
        {
          id: "salt",
          name: example.unknown,
          original: example.unknown,
          quantity: null,
          quantityMax: null,
          unit: null,
          evidence: evidence(example.unknown),
        },
      ],
      steps: [{ id: "cook", text: example.step, evidence: evidence(example.step) }],
    });
    const restored = Recipe.parse(JSON.parse(JSON.stringify(recipe)));
    expect(restored).toEqual(recipe);
    expect(restored.ingredients[0].original).toBe(example.ingredient);
    expect(scaleQuantity(restored.ingredients[0].quantity, restored.servings, 3)).toBe(2.25);
    expect(scaleQuantity(restored.ingredients[1].quantity, restored.servings, 3)).toBeNull();
    expect(restored.cookMinutes).toBeNull();
  });
});

it.each([
  "Log in",
  "Inicia sesión",
  "Iniciar sesión",
  "Inicia sessió",
  "Iniciar sessió",
  "Registra’t",
])("rejects generic %s login metadata", (caption) => {
  expect(() =>
    parseInstagramHtml(
      `<meta property="og:description" content="${caption}"><form action="/accounts/login/"><input name="password"></form>`,
      url,
    ),
  ).toThrow("access_denied");
});
it("does not reject an accessible recipe merely because a login form is also present", () => {
  expect(
    parseInstagramHtml(
      '<meta property="og:description" content="Arròs amb llimona"><input name="password">',
      url,
    ).caption,
  ).toBe("Arròs amb llimona");
});
it("rejects whitespace-only structured metadata", () => {
  expect(() =>
    parseInstagramHtml(
      '<script type="application/ld+json">{"@type":"VideoObject","description":"   "}</script>',
      url,
    ),
  ).toThrow("unexpected_html");
});
it.each(["?psln=tracking", "?xtok=tracking", "?obrf=tracking%3D%3D"])(
  "drops shared-link metadata %s",
  (query) => {
    expect(canonicalizeInstagram(`${url}${query}`)).toBe(url);
  },
);
