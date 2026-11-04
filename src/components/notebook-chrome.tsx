import Link from "next/link";
import { BookOpen, LockKeyhole, NotebookPen } from "lucide-react";

export function NotebookNav({ sample = false }: { sample?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to notebook
      </a>
      <div className="masthead">
        <Link className="wordmark" href="/" aria-label="Àpat home">
          àpat<span>Recipes worth keeping.</span>
        </Link>
        <nav aria-label="Main" className="notebook-tabs">
          <Link href="/" aria-current={sample ? undefined : "page"}>
            <BookOpen size={17} aria-hidden="true" /> Your notebook
          </Link>
          <Link href="/sample" aria-current={sample ? "page" : undefined}>
            <NotebookPen size={17} aria-hidden="true" /> Try the sample
          </Link>
        </nav>
        <span className="edition">
          <LockKeyhole size={13} aria-hidden="true" /> Private beta
        </span>
      </div>
    </>
  );
}

// A decorative pen sketch, never a photograph or evidence of a recipe's appearance.
export function KitchenSketch() {
  return (
    <svg className="kitchen-sketch" viewBox="0 0 220 150" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 106c-8-16 4-40 22-48 17-7 35-3 44 12 11 18-2 40-23 46-15 5-30 1-37-7l-6-3Z" />
        <path d="M44 101c-6-13 5-32 20-39 15-6 30-3 37 10 8 14-3 32-20 38-14 4-27 1-33-6" />
        <path d="m70 63 5 19m23-8-16 10m13 14-14-8m-8 18 3-15m-24 1 17-7" />
        <path d="M104 117c-6-17 1-34 18-43 12-6 21-4 28-6 4 7 12 11 12 24 0 18-17 33-35 34-12 1-17-5-23-9Z" />
        <path d="m116 116 2-1m7 5 2-1m13-35 2-1m-31 16 2-1m34 7 2-1m-16 8 2-1" />
        <path d="M149 73c5-16 16-37 32-55m-19 30c-13-3-20-12-17-23 12 1 19 11 17 23Zm9-13c0-14 5-23 15-24 3 12-3 22-15 24Zm-12 18c11-8 22-8 29-1-7 10-17 10-29 1Zm-9 16c-11-4-18-12-15-22 11 2 17 9 15 22Z" />
        <path d="M33 127c36 8 92 11 139-1" opacity=".45" />
        <path d="m32 50 2-8m-6 3 9 2m149 51 3-9m-7 4 10 2" />
      </g>
    </svg>
  );
}

export function NotebookFooter({ sample = false }: { sample?: boolean }) {
  return (
    <footer className="notebook-footer">
      <span>Made for the joy of making.</span>
      <span>
        {sample
          ? "Sample edits stay in this browser."
          : "Your recipes. Your little corner of the kitchen."}
      </span>
    </footer>
  );
}
