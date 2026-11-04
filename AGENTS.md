# apat engineering instructions

Read README.md, docs/PLAN.md and docs/ACQUISITION.md first. The phase-0 acquisition gate is not a full product acceptance. Drizzle is mandatory. Preserve feature branches and unrelated work.

Never describe fixture review as a real import or login. No paid inference, new credentials, external migrations, permissions changes, provisioning or production deployment without the user's explicit approval. Do not use personal browser cookies, private Instagram endpoints or access bypass. Keep research/ and artifacts/ ignored; no signed URLs, provider tokens, user captions or creator media in commits/logs.

Vercel preview deployments for every pull request are explicitly pre-approved. Keep automatic Git previews enabled and allow Vercel to publish its deployment status and preview link on PRs. Do not disable deployments for any branch in repository configuration. Production deployments and changes to credentials, permissions or infrastructure still require explicit approval.

Use runtime validation and owner-scoped server services. Preserve missing recipe facts and source evidence. Coordinate paid retries, reservations, ambiguous outcomes and cleanup before exposing imports. No AI-generated food photo should masquerade as the imported dish.

Checks: pnpm lint; pnpm format:check; pnpm typecheck; pnpm test; pnpm build; pnpm test:browser. Browser tests use the built server and authored fixture, with no paid services. PGlite tests verify local PostgreSQL behavior, not Neon integration. Keep these evidence boundaries in PRs.
