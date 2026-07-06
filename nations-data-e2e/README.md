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
