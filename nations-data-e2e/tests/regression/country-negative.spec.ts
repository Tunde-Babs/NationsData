import { test, expect } from '@playwright/test';

/**
 * Note on TS5-16 (GDP unavailable → dashes): on the deployed site the country
 * page is server-rendered and World Bank data is fetched server-side, then
 * transferred to the client via hydration cache. `page.route` only intercepts
 * browser requests, so it cannot force that path — TS5-16 belongs in a local
 * build where the server can be mocked. It is tracked as a manual/local case.
 */
test.describe('TS1 · Degraded data @regression', () => {
  test('TS1-10 · broken flag images keep the layout', async ({ page }) => {
    await page.route(/flagcdn\.com/, (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await expect(page.locator('.continent-card')).toHaveCount(7);
    await expect(page.locator('.mini-card')).toHaveCount(8);
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    );
    expect(noOverflow).toBe(true);
  });
});
