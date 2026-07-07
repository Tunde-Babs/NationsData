// Runs Playwright with the given args, then generates the Allure report.
//
// - Cleans `allure-results/` first so the report reflects only THIS run
//   (the allure-playwright reporter appends, it does not clean).
// - Generates the report to `allure-report/` (non-blocking) — even if tests
//   fail, so you can inspect failures.
// - Preserves the test exit code so failures still fail the script.
//
// Allure reports are a served single-page app, so view with `npm run allure:open`
// (or `npm run allure:serve`). CI calls `npx playwright test` directly and is
// unaffected by these scripts.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const onWindows = process.platform === 'win32';

// Resolve local .bin so this works whether invoked via `npm run` or `node` directly.
const binDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '.bin');
const bin = (name) => path.join(binDir, onWindows ? `${name}.cmd` : name);
const run = (cmd, cmdArgs) =>
  spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: onWindows });

// 1. Fresh results for this run.
rmSync('allure-results', { recursive: true, force: true });

// 2. Run the tests (args passed through from the npm script).
const test = run(bin('playwright'), ['test', ...args]);

// 3. Generate the report (non-blocking). Needs Java.
const report = run(bin('allure'), ['generate', 'allure-results', '--clean', '-o', 'allure-report']);
if (report.error || report.status !== 0) {
  console.warn(
    '\n[allure] Could not generate the report (is Java installed?).' +
      ' Tests still ran — Playwright HTML report: npm run report\n'
  );
} else {
  console.log('\n[allure] Report generated → allure-report/  ·  open it with: npm run allure:open\n');
}

// 4. Exit with the real test status.
process.exit(test.status ?? 0);
