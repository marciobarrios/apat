"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Download, Pencil, Utensils, Clock3, Users, Link2 } from "lucide-react";
import { KitchenSketch, NotebookFooter, NotebookNav } from "./notebook-chrome";
import { Button } from "@/components/ui/button";
import { RecipeEditor } from "./recipe-editor";
import { Recipe, sampleRecipe, scaleQuantity, type RecipeData } from "@/lib/recipe";
const storageKey = "apat:sample-notebook:v1";
function ingredientAmount(
  item: RecipeData["ingredients"][number],
  base: number | null,
  target: number,
) {
  if (item.quantity === null) return "To taste / not stated";
  const scaled = (value: number) => (base === null ? value : scaleQuantity(value, base, target));
  const range = item.quantityMax === null ? "" : `–${scaled(item.quantityMax)}`;
  return `${scaled(item.quantity)}${range} ${item.unit ?? ""}`.trim();
}
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
  importDraft?: boolean;
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
  const [captureNotice, setCaptureNotice] = useState("");
  const [link, setLink] = useState("");
  async function save() {
    setCaptureNotice("");
    if (saving.current) return;
    const parsed = Recipe.safeParse(editing ? draft : recipe);
    if (!parsed.success) {
      setNotice("Add a title, every ingredient name and each instruction before saving.");
      return;
    }
    if (cloud) {
      saving.current = true;
      setPending(true);
      try {
        await cloud.save(parsed.data);
        setServings(parsed.data.servings ?? 2);
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
    setServings(parsed.data.servings ?? 2);
    setEditing(false);
  }
  async function exportRecipe() {
    setCaptureNotice("");
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
      {!cloud && <NotebookNav sample />}
      <Main id={cloud ? undefined : "main"}>
        {!cloud && (
          <header className="page-heading">
            <div>
              <p className="intro">A page to play with. A recipe to make your own.</p>
              <h1>The sample notebook.</h1>
            </div>
            <p className="handwritten heading-note">Pull up a chair.</p>
          </header>
        )}
        <output className="notice" aria-live="polite" hidden={captureNotice !== ""}>
          {notice}
        </output>
        <section className="recipe" id="recipe" aria-labelledby="recipe-title">
          <div className="recipe-top">
            <span className="evidence-badge">
              {cloud
                ? cloud.importDraft
                  ? "Import draft · review before saving"
                  : "Private recipe · original evidence preserved"
                : "Sample recipe · text evidence only"}
            </span>
            <div className="actions">
              {cloud?.importDraft && (
                <Button disabled={pending} onClick={save}>
                  Save to notebook
                </Button>
              )}
              {!cloud?.importDraft && (
                <Button variant="outline" disabled={pending} onClick={exportRecipe}>
                  <Download />
                  Export
                </Button>
              )}
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setDraft(recipe);
                  setEditing(true);
                  setCooking(false);
                  setNotice("");
                  setCaptureNotice("");
                }}
              >
                <Pencil />
                Review & edit
              </Button>
              <Button
                disabled={pending}
                aria-pressed={cooking}
                onClick={() => {
                  setCaptureNotice("");
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
            <RecipeEditor
              draft={draft}
              setDraft={setDraft}
              pending={pending}
              importDraft={cloud?.importDraft}
              onSave={() => void save()}
              onCancel={() => {
                setEditing(false);
                setDraft(recipe);
                setCaptureNotice("");
                setNotice("Changes discarded.");
              }}
            />
          ) : (
            <div
              className={cooking ? "book-spread recipe-pages cooking" : "book-spread recipe-pages"}
            >
              <div className="paper-page ingredients-page">
                <div className="page-caption">
                  <span>Recipe</span>
                  <span>01</span>
                </div>
                <div className="recipe-title-block">
                  <h2 id="recipe-title" className="recipe-name">
                    {recipe.title}
                  </h2>
                  {recipe.sourceUrl && (
                    <p className="source-attribution">
                      <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                        View original{" "}
                        {recipe.provenance?.provider === "youtube"
                          ? "YouTube video"
                          : "Instagram video"}
                      </a>
                      {recipe.provenance?.creator ? ` · ${recipe.provenance.creator}` : ""}
                    </p>
                  )}
                  {!cloud && (
                    <p className="recipe-deck">
                      A simple pan, a squeeze of lemon, and something good to eat.
                    </p>
                  )}
                </div>
                <div className="facts">
                  <span>
                    <Users size={16} aria-hidden="true" /> {recipe.servings ?? "Not stated"}{" "}
                    servings in source
                  </span>
                  <span>
                    <Clock3 size={16} aria-hidden="true" /> Cooking time:{" "}
                    {recipe.cookMinutes === null ? "not stated" : `${recipe.cookMinutes} minutes`}
                  </span>
                </div>
                <section aria-labelledby="ingredients-title">
                  <div className="ingredients-heading">
                    <h3 id="ingredients-title">Ingredients</h3>
                    <label>
                      Servings
                      <select
                        aria-label="Servings"
                        disabled={recipe.servings === null}
                        value={servings}
                        onChange={(e) => setServings(Number(e.target.value))}
                      >
                        {[...new Set([1, 2, 4, 6, recipe.servings ?? 2])]
                          .sort((a, b) => a - b)
                          .map((n) => (
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
                          <strong>{ingredientAmount(item, recipe.servings, servings)}</strong>
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
                <span className="page-folio">The good stuff</span>
              </div>
              <section className="paper-page preparation-page" aria-labelledby="preparation-title">
                <div className="page-caption">
                  <span>Preparation</span>
                  <span>02</span>
                </div>
                <div className="preparation-heading">
                  <h3 id="preparation-title">Let’s make it</h3>
                  <span className="handwritten">Apron on, world off.</span>
                </div>
                <ol className="steps">
                  {recipe.steps.map((step, index) => (
                    <li key={step.id}>
                      <span className="step-number">{index + 1}</span>
                      <div>
                        <p>{step.text}</p>
                        {cloud && (
                          <small className="source-evidence">
                            {step.evidence.kind} evidence
                            {step.evidence.timestampSeconds === null
                              ? ""
                              : ` · ${step.evidence.timestampSeconds}s`}
                            : {step.evidence.excerpt || "No excerpt supplied"}
                          </small>
                        )}
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

                {!cloud && (
                  <div className="recipe-tail">
                    <KitchenSketch />
                    <span className="handwritten">
                      A little lemon,
                      <br />a little love.
                    </span>
                  </div>
                )}
                <span className="page-folio">
                  {cooking ? "One step at a time" : "Made to be made again"}
                </span>
              </section>
            </div>
          )}
        </section>
        {!cloud && (
          <>
            <section id="capture" className="capture" aria-labelledby="capture-title">
              <div className="capture-intro">
                <Link2 size={22} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h2 id="capture-title">Found something you’d love to cook?</h2>
                  <p>
                    This authored sample stays in your browser. Import public Instagram and YouTube
                    videos in your private notebook.
                  </p>
                </div>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice("");
                  setCaptureNotice(
                    "Imports are disabled in this authored sample. No request or model call was made. Open your private notebook to import a video.",
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
                  <Button type="submit" variant="outline">
                    Check availability
                  </Button>
                </div>
                {captureNotice && <output className="notice">{captureNotice}</output>}
                <Link href="/">Open your private notebook</Link>
              </form>
            </section>
            <NotebookFooter sample />
          </>
        )}
      </Main>
    </div>
  );
}
