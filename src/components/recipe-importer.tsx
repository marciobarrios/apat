"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImportList,
  ImportRecord,
  canonicalizeRecipeSource,
  type ImportRecordData,
} from "@/lib/import-contract";
import { SavedRecipe, type SavedRecipeData } from "@/lib/library-contract";
import { LibraryError, libraryRequest } from "@/lib/library-client";
import { Notebook } from "./notebook";
import { Button } from "./ui/button";

const statusLabels = {
  queued: "Waiting to start",
  extracting: "Reading the video…",
  needs_review: "Ready to review",
  saved: "Saved to notebook",
  failed: "Import failed",
  outcome_unknown: "Import needs checking",
  cancelled: "Cancelled",
};
function failureMessage(job: ImportRecordData) {
  if (job.state === "outcome_unknown")
    return "The connection ended before we could confirm the result. Credits may have been used. This import will not run again; ask the notebook owner to check it.";
  if (job.errorCode === "not_a_recipe")
    return "We couldn’t find both ingredients and instructions. Check the source or add this recipe manually.";
  if (job.state === "failed")
    return job.retryable
      ? "The video could not be imported. No model credits were used. Check that the link is public; you can retry later."
      : "Extraction failed after it may have used credits. Automatic retries are paused; ask the notebook owner to check the result before trying again.";
  if (job.errorCode === "dispatch_expired")
    return "The import did not start. No credits were used. You can submit the link again.";
  return "";
}
export function RecipeImporter({
  accountId,
  onSaved,
  onError,
}: {
  accountId: string;
  onSaved: (recipe: SavedRecipeData) => void;
  onError: (error: unknown) => void;
}) {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<ImportRecordData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [review, setReview] = useState<ImportRecordData | null>(null);
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const intent = useRef<{ url: string; key: string } | null>(null);
  const alive = useRef(true);
  const revision = useRef(0);
  const report = useCallback(
    (error: unknown) => {
      if (!alive.current) return;
      if (error instanceof LibraryError && error.code === "imports_not_configured")
        setConfigured(false);
      setMessage(error instanceof Error ? error.message : "Import unavailable. Try again.");
      if (
        error instanceof LibraryError &&
        [
          "account_changed",
          "sign_in_required",
          "invitation_required",
          "verified_login_required",
        ].includes(error.code)
      )
        onError(error);
    },
    [onError],
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const started = revision.current;
      const list = await libraryRequest("/api/imports", ImportList, { signal }, accountId);
      if (!alive.current || signal?.aborted || started !== revision.current) return;
      setConfigured(list.configured);
      setJobs(list.imports);
      setCursor(list.nextCursor);
    },
    [accountId],
  );
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void refresh(controller.signal).catch((error) => {
      if (!controller.signal.aborted) report(error);
    });
    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [refresh, report]);
  const active = jobs.some((job) => job.state === "queued" || job.state === "extracting");
  const visibleJobs = jobs.filter((job) => job.state !== "saved");
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        void refresh(controller.signal).catch((error) => {
          if (!controller.signal.aborted) report(error);
        });
    }, 2500);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [active, refresh, report]);

  async function start(sourceUrl: string, retry = false) {
    if (submitting.current || configured !== true) return;
    let source: ReturnType<typeof canonicalizeRecipeSource>;
    try {
      source = canonicalizeRecipeSource(sourceUrl);
    } catch {
      setMessage("Use a public Instagram Reel or a YouTube video / Shorts link.");
      return;
    }
    if (retry || intent.current?.url !== source.url)
      intent.current = { url: source.url, key: crypto.randomUUID() };
    submitting.current = true;
    revision.current++;
    setPending(true);
    setMessage("");
    try {
      const job = await libraryRequest(
        "/api/imports",
        ImportRecord,
        { method: "POST", body: JSON.stringify({ key: intent.current.key, url: source.url }) },
        accountId,
      );
      if (!alive.current) return;
      setJobs((previous) => [job, ...previous.filter((item) => item.id !== job.id)]);
      if (job.state === "needs_review") setReview(job);
      if (job.state === "cancelled") intent.current = null;
      setMessage(job.state === "saved" ? "This video is already saved in your notebook." : "");
    } catch (error) {
      report(error);
    } finally {
      submitting.current = false;
      if (alive.current) setPending(false);
    }
  }
  if (review?.draft)
    return (
      <section className="import-review" aria-label="Review imported recipe">
        <div className="actions">
          <Button variant="outline" onClick={() => setReview(null)}>
            Back to imports
          </Button>
        </div>
        <p>
          Check the ingredients and instructions against the original video. You can edit the draft
          before saving.
        </p>
        <Notebook
          key={review.id}
          cloud={{
            recipe: review.draft,
            importDraft: true,
            export: async () => {},
            save: async (recipe) => {
              try {
                const saved = await libraryRequest(
                  `/api/imports/${review.id}/save`,
                  SavedRecipe,
                  { method: "POST", body: JSON.stringify({ recipe }) },
                  accountId,
                );
                if (!alive.current) return;
                setReview(null);
                onSaved(saved);
              } catch (error) {
                report(error);
                throw error;
              }
            },
          }}
        />
      </section>
    );
  return (
    <section className="import-area" aria-labelledby="import-title">
      <div className="capture">
        <div className="capture-intro">
          <div>
            <h2 id="import-title">From your saved videos to your table.</h2>
            <p>
              Paste a public Instagram Reel or YouTube link. We’ll turn it into a draft for you to
              check and keep.
            </p>
          </div>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void start(url);
          }}
        >
          <label htmlFor="import-url">Instagram or YouTube recipe link</label>
          <div className="input-row">
            <input
              id="import-url"
              type="url"
              inputMode="url"
              required
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste a Reel, video or Shorts link"
              aria-describedby="import-help import-availability"
              disabled={pending || configured !== true}
            />
            <Button type="submit" disabled={pending || configured !== true}>
              {configured === null
                ? "Checking imports…"
                : configured === false
                  ? "Imports unavailable"
                  : pending
                    ? "Starting…"
                    : "Import recipe"}
            </Button>
          </div>
          <output id="import-availability" className="notice" aria-live="polite">
            {configured === false
              ? "Video imports are not enabled yet. The notebook owner needs to finish connecting the import service. You can still add recipes manually."
              : configured === null
                ? "Checking whether video imports are available…"
                : ""}
          </output>
          <p id="import-help" className="small-note">
            AI imports use credits, including some failed attempts. Missing amounts stay unknown.
            You can return here while a video is being read.
          </p>
        </form>
      </div>
      <output className="notice" aria-live="polite">
        {message}
      </output>
      {visibleJobs.length > 0 && (
        <>
          <h2>Imports</h2>
          <ul className="import-list">
            {visibleJobs.map((job) => (
              <li key={job.id}>
                <div>
                  <strong>
                    {job.draft?.title ??
                      (job.sourceUrl.includes("youtube.com")
                        ? "YouTube recipe"
                        : "Instagram recipe")}
                  </strong>
                  <output>{statusLabels[job.state]}</output>
                  <a href={job.sourceUrl} target="_blank" rel="noreferrer">
                    View source
                  </a>
                </div>
                {failureMessage(job) && <p>{failureMessage(job)}</p>}
                {job.extractionId && ["failed", "outcome_unknown"].includes(job.state) && (
                  <small>Support reference: {job.extractionId}</small>
                )}
                <div className="actions">
                  {job.state === "needs_review" && (
                    <Button onClick={() => setReview(job)}>Review draft</Button>
                  )}
                  {job.retryable && (
                    <Button
                      variant="outline"
                      disabled={pending || configured !== true}
                      onClick={() => void start(job.sourceUrl, true)}
                    >
                      Retry import
                    </Button>
                  )}
                  {job.state === "queued" && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        revision.current++;
                        try {
                          const cancelled = await libraryRequest(
                            `/api/imports/${job.id}`,
                            ImportRecord,
                            { method: "DELETE" },
                            accountId,
                          );
                          if (alive.current) {
                            setJobs((previous) =>
                              previous.map((row) => (row.id === cancelled.id ? cancelled : row)),
                            );
                            intent.current = null;
                          }
                        } catch (error) {
                          report(error);
                        }
                      }}
                    >
                      Cancel import
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {cursor && (
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const list = await libraryRequest(
                `/api/imports?cursor=${encodeURIComponent(cursor)}`,
                ImportList,
                undefined,
                accountId,
              );
              if (alive.current) {
                setJobs((previous) => [
                  ...previous,
                  ...list.imports.filter((row) => !previous.some((old) => old.id === row.id)),
                ]);
                setCursor(list.nextCursor);
              }
            } catch (error) {
              report(error);
            }
          }}
        >
          Older imports
        </Button>
      )}
    </section>
  );
}
