import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const repository = fileURLToPath(new URL("../", import.meta.url));
const root = join(repository, "tools/oxlint/anti-slop");
const tests = (await readdir(root, { recursive: true }))
  .filter((path) => path.endsWith(".test.ts"))
  .sort();
if (!tests.length) throw new Error("No anti-slop tests discovered.");

// Oxlint RuleTester has a standalone assertion runner. Use it without altering
// the vendored suites; the CLI regression also runs its assertions at module scope.
// Separate processes avoid sharing RuleTester globals/native state across files.
for (const test of tests) {
  execFileSync(process.execPath, [join(root, test)], {
    cwd: repository,
    stdio: "inherit",
    timeout: 30000,
  });
  console.log(`Passed anti-slop: ${test}`);
}
console.log(`All ${tests.length} anti-slop test files passed (including CLI integration).`);
