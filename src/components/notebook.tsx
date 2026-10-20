"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BookOpen, Download, Leaf, Pencil, Plus, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Recipe, sampleRecipe, scaleQuantity, type RecipeData } from "@/lib/recipe";
const storageKey = "apat:sample-notebook:v1";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}
function storedRecipe() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}
function readStoredRecipe(raw: string | null): RecipeData {
  if (!raw) return sampleRecipe;
  try {
    const parsed = Recipe.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : sampleRecipe;
  } catch {
    return sampleRecipe;
  }
}
type CloudRecipe = {
  recipe: RecipeData;
  save: (recipe: RecipeData) => Promise<void>;
  export: () => Promise<void>;
};
export function Notebook({ cloud }: { cloud?: CloudRecipe }) {
  const raw = useSyncExternalStore(
    cloud ? () => () => {} : subscribe,
    cloud ? () => null : storedRecipe,
    () => null,
  );
  const stored = useMemo(() => readStoredRecipe(raw), [raw]);
  const [localRecipe, setRecipe] = useState<RecipeData | null>(null);
  const recipe = cloud?.recipe ?? localRecipe ?? stored;
  const [draft, setDraft] = useState<RecipeData>(sampleRecipe);
  const [editing, setEditing] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [servings, setServings] = useState(recipe.servings ?? 2);
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const Main = cloud ? "div" : "main";
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  async function save() {
    if (saving.current) return;
    const parsed = Recipe.safeParse(draft);
    if (!parsed.success) {
      setNotice("Add a title, every ingredient name and each instruction before saving.");
      return;
    }
    if (cloud) {
      saving.current = true;
      setPending(true);
      try {
        await cloud.save(parsed.data);
        setNotice("Saved to your private notebook.");
        setEditing(false);
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "Save failed. Your draft is still here.",
        );
      } finally {
        saving.current = false;
        setPending(false);
      }
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(parsed.data));
      setNotice("Saved on this browser. No account or cloud copy was created.");
    } catch {
      setNotice(
        "Saved for this visit only. Browser storage is unavailable; export a copy before leaving.",
      );
    }
    setRecipe(parsed.data);
    setEditing(false);
  }
  async function exportRecipe() {
    if (cloud) {
      try {
        await cloud.export();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Export failed.");
      }
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "apat-recipe.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className={cloud ? "recipe-detail" : "shell"}>
      {!cloud && (
        <aside className="sidebar">
          <a href="#main" className="wordmark">
            apat<span>Recipes worth keeping.</span>
          </a>
          <nav aria-label="Main">
            <a href="#recipe">
              <BookOpen size={19} />
              Your notebook
            </a>
            <a href="#capture">
              <Plus size={19} />
              Save a recipe
            </a>
          </nav>
          <p className="sidebar-note">
            A little less scrolling.
            <br />A little more cooking.
          </p>
          <span className="local-tag">Local prototype</span>
        </aside>
      )}
      <Main id={cloud ? undefined : "main"}>
        {!cloud && (
          <>
            <div className="prototype-note">
              Early preview • The recipe is an original test fixture. Google login, video imports
              and AI are not connected.
            </div>
            <header>
              <div>
                <p className="intro">Your kitchen, collected.</p>
                <h1>
                  A place for the recipes
                  <br />
                  you want to make.
                </h1>
              </div>
              <Leaf className="leaf" size={70} strokeWidth={1} />
            </header>
            <section id="capture" className="capture" aria-labelledby="capture-title">
              <div>
                <h2 id="capture-title">From your saved videos to your table.</h2>
                <p>Instagram comes first. We’re testing what a public link can reliably tell us.</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice(
                    "Live imports are not enabled yet. No request or model call was made. Try the sample review below.",
                  );
                }}
              >
                <label htmlFor="link">Instagram recipe link</label>
                <div className="input-row">
                  <input
                    id="link"
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://www.instagram.com/reel/…"
                    required
                  />
                  <Button type="submit">Check availability</Button>
                </div>
              </form>
            </section>
          </>
        )}
        <output className="notice" aria-live="polite">
          {notice}
        </output>
        <section className="recipe" id="recipe" aria-labelledby="recipe-title">
          <div className="recipe-top">
            <span className="evidence-badge">
              {cloud
                ? "Private recipe · original evidence preserved"
                : "Sample recipe · text evidence only"}
            </span>
            <div className="actions">
              <Button variant="outline" disabled={pending} onClick={exportRecipe}>
                <Download />
                Export
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setDraft(recipe);
                  setEditing(true);
                  setCooking(false);
                  setNotice("");
                }}
              >
                <Pencil />
                Review & edit
              </Button>
              <Button
                disabled={pending}
                onClick={() => {
                  setCooking(!cooking);
                  setEditing(false);
                }}
              >
                <Utensils />
                {cooking ? "Close cooking view" : "Start cooking"}
              </Button>
            </div>
          </div>
          {editing ? (
            <fieldset className="editor" disabled={pending}>
              <h2>Review your recipe</h2>
              <p>Keep what the source says. Leave unknown amounts empty.</p>
              <label htmlFor="title">Recipe title</label>
              <input
                id="title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
              {draft.ingredients.map((item, index) => (
                <div className="ingredient-edit" key={item.id}>
                  <label htmlFor={`name-${item.id}`}>Ingredient {index + 1}</label>
                  <input
                    id={`name-${item.id}`}
                    value={item.name}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ingredients: draft.ingredients.map((i, n) =>
                          n === index ? { ...i, name: e.target.value } : i,
                        ),
                      })
                    }
                  />
                  <label htmlFor={`quantity-${item.id}`}>
                    Quantity for {item.name || `ingredient ${index + 1}`}
                  </label>
                  <input
                    id={`quantity-${item.id}`}
                    type="number"
                    min="0"
                    step="any"
                    value={item.quantity ?? ""}
                    placeholder="Not stated"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ingredients: draft.ingredients.map((i, n) =>
                          n === index
                            ? {
                                ...i,
                                quantity: e.target.value === "" ? null : Number(e.target.value),
                              }
                            : i,
                        ),
                      })
                    }
                  />
                  <small>Original: {item.original}</small>
                </div>
              ))}
              {draft.steps.map((step, index) => (
                <div key={step.id}>
                  <label htmlFor={`step-${step.id}`}>Step {index + 1}</label>
                  <textarea
                    id={`step-${step.id}`}
                    value={step.text}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        steps: draft.steps.map((s, n) =>
                          n === index ? { ...s, text: e.target.value } : s,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <div className="actions">
                <Button disabled={pending} onClick={save}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setEditing(false);
                    setDraft(recipe);
                    setNotice("Changes discarded.");
                  }}
                >
                  Cancel editing
                </Button>
              </div>
            </fieldset>
          ) : (
            <>
              <h2 id="recipe-title" className="recipe-name">
                {recipe.title}
              </h2>
              {!cloud && (
                <p className="recipe-deck">
                  A simple pan, a squeeze of lemon, and something good to eat.
                </p>
              )}
              <div className="facts">
                <span>{recipe.servings ?? "Not stated"} servings in source</span>
                <span>
                  Cooking time:{" "}
                  {recipe.cookMinutes === null ? "not stated" : `${recipe.cookMinutes} minutes`}
                </span>
              </div>
              {(!cloud || recipe.warnings.length > 0) && (
                <div className="review-note">
                  <strong>Worth checking</strong>
                  <p>
                    {recipe.warnings.join(" ")}{" "}
                    {!cloud &&
                      "No video has been analyzed. This sample is written for testing, not imported from a creator."}
                  </p>
                </div>
              )}
              <div className={cooking ? "recipe-columns cooking" : "recipe-columns"}>
                <section>
                  <div className="ingredients-heading">
                    <h3>Ingredients</h3>
                    <label>
                      Servings
                      <select
                        aria-label="Servings"
                        value={servings}
                        onChange={(e) => setServings(Number(e.target.value))}
                      >
                        {[1, 2, 4, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <ul className="ingredients">
                    {recipe.ingredients.map((item) => (
                      <li key={item.id}>
                        <label>
                          <input type="checkbox" />
                          <span>{item.name}</span>
                          <strong>
                            {item.quantity === null
                              ? "To taste / not stated"
                              : `${scaleQuantity(item.quantity, recipe.servings, servings)} ${item.unit ?? ""}`}
                          </strong>
                        </label>
                        <small>{item.evidence.excerpt}</small>
                      </li>
                    ))}
                  </ul>
                  <p className="small-note">
                    Serving changes scale known ingredient amounts only. They never change time or
                    temperature.
                  </p>
                </section>
                <section>
                  <h3>Let’s make it</h3>
                  <ol className="steps">
                    {recipe.steps.map((step, index) => (
                      <li key={step.id}>
                        <span className="step-number">{index + 1}</span>
                        <div>
                          <p>{step.text}</p>
                          {cooking && (
                            <label className="done">
                              <input type="checkbox" />
                              Done
                            </label>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </>
          )}
        </section>
        {!cloud && (
          <footer>
            Private by design. Honest about what’s known.
            <span>Prototype data stays in this browser.</span>
          </footer>
        )}
      </Main>
    </div>
  );
}
