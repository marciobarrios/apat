"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Notebook } from "./notebook";
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
      className="recipe editor"
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
      <output>{error}</output>
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
      <aside className="sidebar">
        <Link className="wordmark" href="/">
          apat<span>Recipes worth keeping.</span>
        </Link>
        <nav aria-label="Main">
          <Link href="/">Your notebook</Link>
          <Link href="/sample">Try the sample</Link>
        </nav>
        <p className="sidebar-note">
          A little less scrolling.
          <br />A little more cooking.
        </p>
        <span className="local-tag">Private beta</span>
      </aside>
      <main>
        <div className="prototype-note">
          Private recipe foundation • Instagram imports and AI extraction are not enabled.
        </div>
        <header>
          <div>
            <p className="intro">Your kitchen, collected.</p>
            <h1>Your private notebook.</h1>
          </div>
        </header>
        <output className="notice">{loading ? "Opening your notebook…" : notice}</output>
        {!loading && !account && (
          <section className="capture">
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
            <Link href="/sample">Explore the sample without an account</Link>
          </section>
        )}
        {account && (
          <div className="account-area">
            <p>Signed in as {account.name}</p>
            <div className="actions">
              {!selected && !adding && (
                <Button
                  onClick={() => {
                    creation.current = null;
                    setAdding(true);
                  }}
                >
                  Add a recipe
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
              <>
                {records.length === 0 && (
                  <section className="capture library-empty">
                    <h2>Your notebook is ready.</h2>
                    <p>
                      Add a recipe of your own. The sample is kept separate from your private
                      library.
                    </p>
                  </section>
                )}
                <ul className="library-list">
                  {records.map((recipe) => (
                    <li key={recipe.id}>
                      <Button
                        variant="outline"
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
                        {recipe.edited.title}
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
              </>
            )}
          </div>
        )}
        <footer>Private by design. Honest about what’s known.</footer>
      </main>
    </div>
  );
}
