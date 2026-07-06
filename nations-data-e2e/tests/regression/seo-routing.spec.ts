import { test, expect } from '@playwright/test';

test.describe('TS8/TS9 · Routing & SEO @regression', () => {
  test('TS9-03 · per-route document titles', async ({ page }) => {
    await page.goto('/continent/asia');
    await expect(page).toHaveTitle(/Continent — NationsData/i);
    await page.goto('/country/JPN');
    await expect(page).toHaveTitle(/Country — NationsData/i);
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search — NationsData/i);
  });

  test('TS9-04 · no uncaught JS / hydration errors on key pages', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('/');
    await expect(page.locator('.continent-card').first()).toBeVisible();
    await page.goto('/country/NGA');
    await expect(page.locator('.hero-main h1')).toBeVisible();
    await page.goto('/continent/africa');
    await expect(page.locator('.country-card').first()).toBeVisible();

    // Ignore transient third-party / chunk-load network noise (the app handles
    // these gracefully); fail only on real uncaught JS / hydration errors.
    const noise =
      /worldbank|flagcdn|overpass|wikidata|wikipedia|cartocdn|Failed to load resource|net::|ERR_|Importing a module script failed|Country load failed|Loading chunk|ChunkLoadError|dynamically imported module/i;
    const real = errors.filter((e) => !noise.test(e));
    expect(real).toEqual([]);
  });

  test('TS8-02 · browser back navigates through history', async ({ page }) => {
    await page.goto('/');
    await page.locator('.continent-card', { hasText: 'Africa' }).first().click();
    await expect(page).toHaveURL(/\/continent\/africa/);
    await page.locator('.country-card').first().click();
    await expect(page).toHaveURL(/\/country\/[A-Z]{3}/);
    await page.goBack();
    await expect(page).toHaveURL(/\/continent\/africa/);
    await page.goBack();
    await expect(page.locator('.continent-card')).toHaveCount(7);
  });

  test('TS8-01 · deep link renders (SSR) for a country', async ({ request }) => {
    const res = await request.get('/country/JPN');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Japan');
  });
});
