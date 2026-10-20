import { defineConfig } from "oxlint";
export default defineConfig({
  plugins: ["typescript", "react", "jsx-a11y", "nextjs"],
  ignorePatterns: [
    "tools/**",
    ".next/**",
    "research/**",
    "artifacts/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ],
  jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
  rules: {
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
    "anti-slop/no-array-filter-map": "error",
    "oxc/no-accumulating-spread": "error",
  },
});
