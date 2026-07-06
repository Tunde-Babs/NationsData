import { test as base, expect } from '@playwright/test';

/**
 * Deterministic third-party mocks for functional (non-@live) suites.
 *
 * Import `{ test, expect }` from this file instead of '@playwright/test' to get
 * every external host stubbed, so tests are fast, offline-capable, and immune to
 * upstream rate limits. The @smoke suite deliberately does NOT use this — it
 * exercises the real production integrations.
 *
 * Enable per-file with:  test.use({ mockThirdParty: true });
 */

// 1x1 transparent PNG (flags + map tiles) so layout stays stable offline.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export const test = base.extend<{ mockThirdParty: boolean }>({
  mockThirdParty: [false, { option: true }],

  page: async ({ page, mockThirdParty }, use) => {
    if (mockThirdParty) {
      // World Bank — population / GDP indicators (empty but well-formed).
      await page.route(/api\.worldbank\.org/, (r) =>
        r.fulfill({ json: [{ page: 1, pages: 1, total: 0 }, []] })
      );
      // Overpass — road network (empty elements).
      await page.route(/overpass-api\.de|overpass\.kumi\.systems/, (r) =>
        r.fulfill({ json: { elements: [] } })
      );
      // Wikidata SPARQL + entity API, Wikipedia summaries.
      await page.route(/query\.wikidata\.org/, (r) =>
        r.fulfill({ json: { results: { bindings: [] } } })
      );
      await page.route(/wikidata\.org\/w\/api\.php/, (r) =>
        r.fulfill({ json: { entities: {} } })
      );
      await page.route(/wikipedia\.org\/api\/rest/, (r) =>
        r.fulfill({ json: { extract: '' } })
      );
      // Images: flags + CARTO map tiles.
      await page.route(/flagcdn\.com|basemaps\.cartocdn\.com/, (r) =>
        r.fulfill({ contentType: 'image/png', body: PNG_1x1 })
      );
    }
    await use(page);
  }
});

export { expect };
