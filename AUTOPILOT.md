# Autopilot

Project settings for the global `autopilot` skill. These override its defaults.
`AGENTS.md` and `docs/PLAN.md` approval gates (below) always win over this file
and over the skill.

## Basics

- Base branch: `main`. Merge method: `gh pr merge <n> --squash --delete-branch`.
- Linear: team MAR, project Àpat (`P-MAR-5`). Confirm the issue belongs to
  this project before starting.
- Closing line: use `Closes MAR-123` (this repo's convention), one line per
  resolved issue; `Refs MAR-123` for partial work.
- Read `README.md` and `docs/PLAN.md` before planning. They record what is
  done, what is gated, and the evidence boundaries.

## Merge rules

Nobody depends on Apat yet, so favour speed. Auto-merge allowed at **low or
medium** risk when all checks are green (as if `merge medium` were always
passed). Merging to `main` and the production build Vercel makes from it are
pre-approved in `AGENTS.md`. Never auto-merge when the PR:

- adds or changes a migration under `drizzle/` (applying it is a separate,
  gated step; merge-ready code is fine to hand off),
- changes roles, grants, auth/session handling, or env var handling,
- turns on or changes paid inference (Mamitsu calls, credit ceilings),
- changes CI (`.github/workflows/`) or Vercel configuration.

## Approval gates (stop and ask, never do)

- Paid inference: never submit a Mamitsu import (real Instagram/YouTube URL)
  locally, on a Preview, or in production. Each one spends credits.
- New credentials, env vars, Vercel or Neon configuration, provisioning.
- Applying migrations to any external database. Generate and review them
  locally (`pnpm db:generate`, PGlite tests) only.
- Permission or role/grant changes, manual production deployment or
  promotion (the automatic build after a merge is fine).
- Personal browser cookies, private Instagram endpoints, access bypass.

If an issue can't be done without one of these, implement what doesn't need
it, open the PR with `Refs`, and list the approval needed under
**Verification gaps**.

## Worktree setup

No local env files to copy: without configuration the app runs in fixture
mode, which is what tests and evidence use. Run
`pnpm install --frozen-lockfile` (pnpm 12.4.2, Node 24 or 26).

## Commands

Match CI (`.github/workflows/ci.yml`, job `verify`). Run all before the PR:

```bash
pnpm lint
pnpm format:check   # fix with `pnpm format`
pnpm typecheck
pnpm test           # vitest + lint-rule tests (PGlite for Postgres behaviour)
pnpm build
pnpm test:browser   # needs `pnpm exec playwright install chromium` once
```

- Dev server: `pnpm dev` on `http://127.0.0.1:3026`. The port is fixed in
  `package.json` and `playwright.config.ts`.
- Playwright reuses whatever is on 3026 locally. If 3026 is busy with a
  server you didn't start, run `CI=1 pnpm test:browser` only after it's
  free; otherwise record "browser tests not run locally: port 3026 busy"
  as a verification gap and rely on CI.

## Verification

- Recipe parsing, scaling, schema: Vitest unit tests (`src/lib/recipe.ts`).
- Server/database services: PGlite tests. They prove local PostgreSQL
  behaviour, not Neon integration: say so in the PR.
- UI and flows: Playwright on `desktop` and `mobile` (iPhone 13 viewport)
  using the authored fixtures and `/sample`; never paid services.
- Never describe fixture review as a real import or login.

## Evidence

- Screenshots and recordings only from fixtures and `/sample`. Never capture
  real imports, creator captions or media, signed URLs, or provider tokens.
- Visual changes: before/after at desktop and mobile widths.
- Import, review, save and credit flows: Mermaid `sequenceDiagram` /
  `stateDiagram-v2`, before and after.
- Migrations: summary table of tables, columns, roles and grants changed,
  plus the PGlite test output.

## Vercel Preview

- Depth: `read-only`. Previews can use an isolated Neon branch, real Google
  sign-in and enabled Mamitsu imports. Load the touched pages signed out and
  `/sample`; check rendering, console and network errors. Never sign in,
  submit an import, save, or delete.

## Production monitoring

- Production: https://apat-self.vercel.app (Vercel project `apat`).
- After a merge: deployment Ready, public smoke check of the home page and
  `/sample`, and Vercel runtime errors for 15 min vs the hour before.
  Nothing logged-in, no imports.
- On a regression, open a revert PR and auto-merge it once green.

## Don't

- Commit `research/`, `artifacts/`, `test-results/`, captures, or `.env*`.
- Add `NEXT_PUBLIC_` aliases for server-only values.
- Run migrations at build, startup or in CI.
