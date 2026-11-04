"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Notebook } from "./notebook";
import { KitchenSketch, NotebookFooter, NotebookNav } from "./notebook-chrome";
import { ArrowUpRight, BookOpen, Plus } from "lucide-react";
import {
  Account,
  LibrarySnapshot,
  RecipeList,
  SavedRecipe,
  type SavedRecipeData,
} from "@/lib/library-contract";
import { libraryRequest, LibraryError } from "@/lib/library-client";
import { authClient } from "@/lib/auth-client";
import { Recipe, type RecipeData } from "@/lib/recipe";

function NewRecipe({
  onSave,
  onCancel,
}: {
  onSave: (recipe: RecipeData) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [language, setLanguage] = useState("en");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  return (
    <form
      className="paper-sheet editor new-recipe"
      onSubmit={async (event) => {
        event.preventDefault();
        if (submitting.current) return;
        const lines = (value: string) =>
          value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        const evidence = (excerpt: string) => ({
          kind: "user" as const,
          excerpt,
          timestampSeconds: null,
        });
        const parsed = Recipe.safeParse({
          title,
          language,
          servings: null,
          cookMinutes: null,
          sourceUrl: null,
          warnings: [],
          ingredients: lines(ingredients).map((name, i) => ({
            id: `ingredient-${i}`,
            name,
            original: name,
            quantity: null,
            quantityMax: null,
            unit: null,
            evidence: evidence(name),
          })),
          steps: lines(steps).map((text, i) => ({
            id: `step-${i}`,
            text,
            evidence: evidence(text),
          })),
        });
        if (!parsed.success) {
          setError(
            "Add a title, at least one ingredient and one instruction. Keep ingredient lines under 200 characters.",
          );
          return;
        }
        submitting.current = true;
        setPending(true);
        setError("");
        try {
          await onSave(parsed.data);
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : "Save failed. Try again.");
        } finally {
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      <p className="page-caption">A fresh page</p>
      <h2>Add your own recipe</h2>
      <p>Write one ingredient or instruction per line. Amounts remain as written; no AI is used.</p>
      <label htmlFor="new-title">Recipe title</label>
      <input
        id="new-title"
        maxLength={160}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={pending}
      />
      <label htmlFor="language">Recipe language</label>
      <select
        id="language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        disabled={pending}
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="ca">Catalan</option>
      </select>
      <label htmlFor="new-ingredients">Ingredients, one per line</label>
      <textarea
        id="new-ingredients"
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        disabled={pending}
      />
      <label htmlFor="new-steps">Instructions, one per line</label>
      <textarea
        id="new-steps"
        value={steps}
        onChange={(e) => setSteps(e.target.value)}
        disabled={pending}
      />
      <output className="notice">{error}</output>
      <div className="actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save recipe"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

async function loadLibrary(signal?: AbortSignal) {
  return libraryRequest("/api/recipes", LibrarySnapshot, { signal });
}

export function Library() {
  const [account, setAccount] = useState<{ id: string; name: string } | null>(null);
  const [records, setRecords] = useState<SavedRecipeData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<SavedRecipeData | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const creation = useRef<{ key: string; body: string } | null>(null);
  const authBusy = useRef(false);
  const generation = useRef(0);
  async function currentRequest<T>(request: Promise<T>) {
    const start = generation.current;
    const result = await request;
    if (start !== generation.current) throw new LibraryError("account_changed");
    return result;
  }
  const report = useCallback((error: unknown) => {
    setNotice(error instanceof Error ? error.message : "The service is unavailable. Try again.");
    if (error instanceof LibraryError) {
      setCode(error.code);
      if (
        [
          "sign_in_required",
          "invitation_required",
          "verified_login_required",
          "setup_required",
          "account_changed",
        ].includes(error.code)
      ) {
        generation.current++;
        setRecords([]);
        setSelected(null);
        setAccount(null);
        setCursor(null);
        creation.current = null;
        setAdding(false);
      }
    }
  }, []);
  const accept = useCallback(
    (data: {
      account: { id: string; name: string };
      recipes: SavedRecipeData[];
      nextCursor: string | null;
    }) => {
      // A new snapshot invalidates operations started under the previous view.
      generation.current++;
      creation.current = null;
      setAccount(data.account);
      setRecords(data.recipes);
      setCursor(data.nextCursor);
      setSelected(null);
      setAdding(false);
      setNotice("");
      setCode("");
    },
    [],
  );
  async function load() {
    setLoading(true);
    try {
      accept(await currentRequest(loadLibrary()));
    } catch (error) {
      report(error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    loadLibrary(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) accept(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) report(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accept, report]);
  useEffect(() => {
    // Recheck entitlement after returning to the app, including browser back/forward cache.
    const check = () => {
      if (document.visibilityState === "visible" && account) {
        void libraryRequest("/api/account", Account, undefined, account.id)
          .then((current) => {
            if (current.id !== account.id) report(new LibraryError("account_changed"));
          })
          .catch(report);
      }
    };
    window.addEventListener("pageshow", check);
    window.addEventListener("focus", check);
    return () => {
      window.removeEventListener("pageshow", check);
      window.removeEventListener("focus", check);
    };
  }, [account, report]);
  async function authenticate(signOut: boolean) {
    if (authBusy.current) return;
    authBusy.current = true;
    setAuthPending(true);
    setNotice("");
    try {
      const result = signOut
        ? await authClient.signOut()
        : await authClient.signIn.social({
            provider: "google",
            callbackURL: "/library",
            errorCallbackURL: "/",
          });
      if (result.error)
        throw new Error(
          signOut
            ? "Sign out failed. Please try again."
            : "Google sign-in was cancelled or unavailable. Please try again.",
        );
      if (signOut) {
        generation.current++;
        setRecords([]);
        setSelected(null);
        setAccount(null);
        window.location.replace("/");
      }
    } catch {
      setNotice(
        signOut
          ? "Sign out failed. Please try again."
          : "Google sign-in was cancelled or unavailable. Please try again.",
      );
    } finally {
      authBusy.current = false;
      setAuthPending(false);
    }
  }
  return (
    <div className="shell">
      <NotebookNav />
      <main id="main">
        <header className="page-heading">
          <div>
            <p className="intro">A little less scrolling. A little more cooking.</p>
            <h1>Your private notebook.</h1>
          </div>
          <p className="handwritten heading-note">
            Good food is worth
            <br />
            writing down.
          </p>
        </header>
        <output className="notice">{loading ? "Opening your notebook…" : notice}</output>
        {!loading && !account && (
          <section
            className="welcome-book book-spread"
            aria-label="Welcome to your recipe notebook"
          >
            <div className="welcome-cover paper-page">
              <span className="page-caption">The kitchen notebook</span>
              <KitchenSketch />
              <h2>
                A place for
                <br />
                your good food.
              </h2>
              <p>
                The everyday favourites.
                <br />
                The happy experiments.
                <br />
                The ones you’ll make again.
              </p>
              <div className="owner-inscription">
                <span>From the kitchen of</span>
                <span className="handwritten">you, of course</span>
              </div>
              <span className="page-folio">Collected with care</span>
            </div>
            <div className="welcome-entry paper-page">
              <span className="page-caption">Make yourself at home</span>
              <h2>Recipes that follow you home.</h2>
              <p>
                Sign in with your invited Google account to save recipes and open them on another
                device.
              </p>
              <div className="actions">
                <Button
                  disabled={authPending || code === "setup_required"}
                  onClick={() => void authenticate(false)}
                >
                  {authPending ? "Connecting…" : "Continue with Google"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLoading(true);
                    void load();
                  }}
                >
                  Retry connection
                </Button>
                {["invitation_required", "verified_login_required"].includes(code) && (
                  <Button
                    variant="outline"
                    disabled={authPending || busy || loading}
                    onClick={() => void authenticate(true)}
                  >
                    Sign out
                  </Button>
                )}
              </div>
              <div className="sample-invitation">
                <span className="handwritten">Take a peek inside</span>
                <Link href="/sample" className="sample-link">
                  Explore the sample without an account{" "}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
                <p>An authored recipe to edit, scale, and cook through.</p>
              </div>
              <p className="availability-note">
                Instagram imports are still in the works. For now, make it your own with recipes you
                write.
              </p>
              <span className="page-folio">A new chapter in your kitchen</span>
            </div>
          </section>
        )}
        {account && (
          <div className="account-area">
            <p className="account-caption">
              Signed in as <strong>{account.name}</strong>
            </p>
            <div className="actions">
              {!selected && !adding && (
                <Button
                  onClick={() => {
                    creation.current = null;
                    setAdding(true);
                  }}
                >
                  <Plus size={16} aria-hidden="true" /> Add a recipe
                </Button>
              )}
              {!selected && !adding && (
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => {
                    setLoading(true);
                    void load();
                  }}
                >
                  Refresh library
                </Button>
              )}
              <Button
                variant="outline"
                disabled={authPending || busy || loading}
                onClick={() => void authenticate(true)}
              >
                Sign out
              </Button>
              {(selected || adding) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setSelected(null);
                    setAdding(false);
                  }}
                >
                  Back to library
                </Button>
              )}
            </div>
            {adding ? (
              <NewRecipe
                onCancel={() => setAdding(false)}
                onSave={async (recipe) => {
                  setBusy(true);
                  try {
                    const body = JSON.stringify(recipe);
                    if (creation.current?.body !== body)
                      creation.current = { key: crypto.randomUUID(), body };
                    const saved = await currentRequest(
                      libraryRequest(
                        "/api/recipes",
                        SavedRecipe,
                        {
                          method: "POST",
                          body: JSON.stringify({ key: creation.current.key, recipe }),
                        },
                        account.id,
                      ),
                    );
                    setRecords((previous) => [
                      saved,
                      ...previous.filter((row) => row.id !== saved.id),
                    ]);
                    creation.current = null;
                    setAdding(false);
                    setSelected(saved);
                  } catch (error) {
                    if (
                      error instanceof LibraryError &&
                      [
                        "sign_in_required",
                        "invitation_required",
                        "verified_login_required",
                        "account_changed",
                      ].includes(error.code)
                    )
                      report(error);
                    throw error;
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : selected ? (
              <Notebook
                key={selected.id}
                cloud={{
                  recipe: selected.edited,
                  save: async (recipe) => {
                    setBusy(true);
                    try {
                      const saved = await currentRequest(
                        libraryRequest(
                          `/api/recipes/${selected.id}`,
                          SavedRecipe,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ version: selected.version, recipe }),
                          },
                          account.id,
                        ),
                      );
                      setSelected(saved);
                      setRecords((previous) =>
                        previous.map((row) => (row.id === saved.id ? saved : row)),
                      );
                    } catch (error) {
                      if (
                        error instanceof LibraryError &&
                        [
                          "sign_in_required",
                          "invitation_required",
                          "verified_login_required",
                          "account_changed",
                        ].includes(error.code)
                      )
                        report(error);
                      throw error;
                    } finally {
                      setBusy(false);
                    }
                  },
                  export: async () => {
                    try {
                      const saved = await currentRequest(
                        libraryRequest(
                          `/api/recipes/${selected.id}/export`,
                          SavedRecipe,
                          undefined,
                          account.id,
                        ),
                      );
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" }),
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "apat-recipe.json";
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (error) {
                      report(error);
                      throw error;
                    }
                  },
                }}
              />
            ) : (
              <section className="library-index paper-sheet" aria-labelledby="index-title">
                <div className="index-heading">
                  <div>
                    <p className="page-caption">A growing collection</p>
                    <h2 id="index-title">Recipe index</h2>
                  </div>
                  <BookOpen size={28} strokeWidth={1} aria-hidden="true" />
                </div>
                {records.length === 0 && (
                  <section className="library-empty">
                    <KitchenSketch />
                    <h3>Your notebook is ready.</h3>
                    <p>
                      Add a recipe of your own. The sample is kept separate from your private
                      library.
                    </p>
                  </section>
                )}
                <ul className="library-list">
                  {records.map((recipe, index) => (
                    <li key={recipe.id}>
                      <Button
                        variant="ghost"
                        aria-label={recipe.edited.title}
                        onClick={async () => {
                          try {
                            setSelected(
                              await currentRequest(
                                libraryRequest(
                                  `/api/recipes/${recipe.id}`,
                                  SavedRecipe,
                                  undefined,
                                  account.id,
                                ),
                              ),
                            );
                          } catch (error) {
                            report(error);
                          }
                        }}
                      >
                        <span className="index-number" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="index-recipe-title">{recipe.edited.title}</span>
                        <span className="index-dots" aria-hidden="true" />
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
                {cursor && (
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const list = await currentRequest(
                          libraryRequest(
                            `/api/recipes?cursor=${encodeURIComponent(cursor)}`,
                            RecipeList,
                            undefined,
                            account.id,
                          ),
                        );
                        setRecords((previous) => [
                          ...previous,
                          ...list.recipes.filter(
                            (row) => !previous.some((old) => old.id === row.id),
                          ),
                        ]);
                        setCursor(list.nextCursor);
                      } catch (error) {
                        report(error);
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Load more recipes
                  </Button>
                )}
                <p className="handwritten index-note">Room for many more favourites.</p>
              </section>
            )}
          </div>
        )}
        <NotebookFooter />
      </main>
    </div>
  );
}
