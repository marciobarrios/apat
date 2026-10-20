import { defineConfig } from "vitest/config";
// `pnpm test` also runs the vendored standalone RuleTester/CLI suites via test:lint-rules.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], testTimeout: 15000 } });
