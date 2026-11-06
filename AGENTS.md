# apat engineering instructions

Read README.md, docs/PLAN.md and docs/ACQUISITION.md first. The phase-0 acquisition gate is not a full product acceptance. Drizzle is mandatory. Preserve feature branches and unrelated work.

Never describe fixture review as a real import or login. No paid inference, new credentials, external migrations, permissions changes, provisioning or production deployment without the user's explicit approval. Do not use personal browser cookies, private Instagram endpoints or access bypass. Keep research/ and artifacts/ ignored; no signed URLs, provider tokens, user captions or creator media in commits/logs.

Vercel preview deployments for every pull request are explicitly pre-approved. Keep automatic Git previews enabled and allow Vercel to publish its deployment status and preview link on PRs. Do not disable deployments for any branch in repository configuration. Production deployments and changes to credentials, permissions or infrastructure still require explicit approval.

Use runtime validation and owner-scoped server services. Preserve missing recipe facts and source evidence. Coordinate paid retries, reservations, ambiguous outcomes and cleanup before exposing imports. No AI-generated food photo should masquerade as the imported dish.

Checks: pnpm lint; pnpm format:check; pnpm typecheck; pnpm test; pnpm build; pnpm test:browser. Browser tests use the built server and authored fixture, with no paid services. PGlite tests verify local PostgreSQL behavior, not Neon integration. Keep these evidence boundaries in PRs.

## Linear issue completion

The Linear project for this repository is [Àpat](https://linear.app/marciobarrios/project/apat-178be59a140c/overview) (`P-MAR-5`, team `MAR`). Before implementing a ticket, verify that its project and requested changes match this repository.

For every PR that fully resolves a Linear ticket, include `Closes <ISSUE-ID>` in the PR description, replacing the placeholder with the ticket's actual identifier. Use a separate closing line for each resolved ticket. An actual issue URL after `Closes` is also supported. Never invent an issue or use the project URL as a closing reference. For partial work, use `Refs <ISSUE-ID>` until the ticket is fully resolved.

Before handing off a PR, verify that its saved description contains the correct closing references and that Linear links the PR to the intended issues. A branch name, bare issue ID or PR comment alone does not satisfy this rule. Automatic completion requires the GitHub integration and the team's **On PR or commit merge** automation to target the appropriate completed status; report any inability to verify linking or automation. See [Linear's GitHub documentation](https://linear.app/docs/github). Let merge automation complete the ticket rather than marking it done when opening the PR.
