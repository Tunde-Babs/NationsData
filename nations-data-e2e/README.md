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
