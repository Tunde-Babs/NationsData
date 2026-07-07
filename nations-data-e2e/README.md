# NationsData — E2E & Smoke tests

Playwright + TypeScript test suite for [www.thenationsdata.com](https://www.thenationsdata.com).

## Setup

```bash
cd nations-data-e2e
npm install
npx playwright install        # download browsers (or: npx playwright install chromium)
```

## Run

```bash
# Live smoke suite (P0) against production — Chromium
npm run smoke:chromium

# Smoke on all browsers
npm run smoke

# Full suite
npm test

# Against a different environment (e.g. a Vercel preview or localhost)
BASE_URL=http://localhost:4200 npm run smoke:chromium

# Open the HTML report
npm run report
```

## Reporting (Allure)

**Every `npm run` test script auto-generates the Allure report when the run
finishes** (even on failure — that's when you want it). Each script cleans
`allure-results/` first (the reporter appends), runs the tests, then generates
the report to `allure-report/` — **non-blocking**, so your terminal is free.
This is handled by `scripts/test-and-report.mjs`. Needs Java.

```bash
npm run smoke:chromium     # runs tests → generates allure-report/
npm run allure:open        # view it (Allure reports need a server)
```

Need a report-less run (quick pass/fail, scripting)?

```bash
npm run test:raw -- --project=chromium --grep @smoke   # no report step
```

> Don't pass `--reporter=...` on the CLI — it overrides the config reporters and
> drops Allure. The scripts don't, so results are always produced. CI calls
> `npx playwright test` directly, so it's unaffected by the auto-open behavior.

### CI reporting

The GitHub Actions workflow aggregates Allure results from every job into one
report **with history/trends**:

- **Pull requests** → the combined report is uploaded as the `allure-report`
  build artifact (download from the run's Summary page).
- **`main` / nightly** → the report is published to **GitHub Pages** with
  trend history at `https://<owner>.github.io/<repo>/`.

**One-time setup:** after the first `main`/nightly run creates the `gh-pages`
branch, enable Pages in **Settings → Pages → Build and deployment → Source:
Deploy from a branch → `gh-pages` / root**.

## Visual testing (`@visual`)

`tests/visual/hero-theme.spec.ts` guards the **theme background colour**: it
screenshots `section.hero` in the light and dark themes and compares each against
a committed baseline (`hero-light.png` / `hero-dark.png`).

```bash
npm run test:visual      # run the visual check (Chromium)
npm run visual:update    # re-baseline after an *intended* design change, then commit the PNGs
```

- **Tolerance** — a 10% pixel budget (`playwright.config.ts → expect.toHaveScreenshot`)
  means the live hero stats (country/population totals) can change without a false
  failure, while a real background regression (repaints ~every pixel) still fails.
- **Chromium-only, one engine's baselines** — other engines render pixels
  differently and would each need their own set.
- **Baselines are platform-specific** (font antialiasing differs by OS). Playwright
  suffixes them per platform, so both sets are committed and each environment uses
  its own: **`*-darwin.png` locally**, **`*-linux.png` on CI** (Ubuntu). Refresh the
  macOS set with `npm run visual:update`.

### Running visual tests in CI

The `visual` job in `.github/workflows/e2e.yml` runs `@visual` on Chromium on every
push/PR, and its results feed the aggregated Allure report. It compares against the
**Linux baselines** (`*-linux.png`), which must be committed to the branch.

**Bootstrap / refresh the Linux baselines** (no Docker needed) — this is built into
the E2E Tests workflow so it works from any branch:

1. **Actions → E2E Tests → Run workflow →** select your branch, tick
   **`update_visual_baselines`**, Run.
2. The `visual` job regenerates `*-linux.png` on Ubuntu and **commits them back to
   your branch** (`chore(visual): update Linux baselines`).
3. That commit triggers a normal run which compares Linux-vs-Linux → **green**.

> First-time bootstrap: on a branch that has no `*-linux.png` yet, the `visual` job
> fails until you run the workflow once with `update_visual_baselines` ticked.
>
> Prefer local generation? `docker run --rm -v "$PWD":/e2e -w /e2e`
> `mcr.microsoft.com/playwright:v1.49.1-jammy bash -c "npm ci && npm run visual:update"`
> then commit the `*-linux.png` files.

## Layout

```
playwright.config.ts     projects (chromium/firefox/webkit/mobile), baseURL, reporters
fixtures/network.ts      deterministic third-party mocks for functional suites
pages/                   Page Objects (Home, Continent, Country, Place, Assistant)
tests/smoke.spec.ts      @smoke — live P0 journeys (structure-based, tolerant)
```

## Notes

- **Smoke** runs against the real site with tolerant, structure-based assertions on
  stable (mostly bundled) data, so upstream API variance (World Bank, Overpass,
  Wikidata) does not cause flake.
- **Functional suites** should import `{ test, expect }` from `fixtures/network.ts`
  and set `test.use({ mockThirdParty: true })` for deterministic, offline-capable runs.
- Selectors are the app's existing classes + role/text locators. Adding
  `data-testid` hooks (see the test plan) will make them even more stable.
```
