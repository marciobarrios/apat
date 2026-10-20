Vendored from https://github.com/dmmulroy/anti-slop at 13909c9e07590f5a85d93c62712259fe14a883f7 (MIT), 2026-10-20.
Reviewed index and enabled rules (assertions, unsafe dictionaries, module mocks, accumulator copies).
Retain upstream license and nested eslint-stylistic provenance. No local source modifications.
Only evidence/safety rules are enabled. Unknown/typeof bans are intentionally not enabled: external HTML, JSON and network boundaries need runtime validation. Effect rules are not enabled; this app does not use Effect. Other taste rules await a separate decision. Oxlint and @oxlint/plugins are pinned together at 1.89.0.

All 24 upstream test files run unchanged through `pnpm test:lint-rules`, which is included in `pnpm test` and CI. `scripts/test-lint-rules.mjs` uses isolated Node processes and Oxlint RuleTester's standalone assertions, including the module-level CLI regression.
