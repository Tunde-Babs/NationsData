import { test, expect } from '@playwright/test';

test.describe('TS8 · Routing edge cases @regression @edge', () => {
  test('TS8-05 · trailing slash resolves the country', async ({ page }) => {
    await page.goto('/country/NGA/');
    await expect(page.locator('.hero-main h1')).toHaveText('Nigeria', { timeout: 20_000 });
  });

  test('TS8-07 · reloading a place URL preserves the city', async ({ page }) => {
    await page.goto('/place/9.0765/7.3986?name=Abuja&country=Nigeria&cca3=NGA');
    await expect(page.locator('.side-head h1')).toHaveText('Abuja');
    await page.reload();
    await expect(page.locator('.side-head h1')).toHaveText('Abuja');
  });

  test('TS8-08 · URL-encoded place name renders decoded', async ({ page }) => {
    await page.goto('/place/48.8566/2.3522?name=Paris%20City&country=France&cca3=FRA');
    await expect(page.locator('.side-head h1')).toHaveText('Paris City');
  });
});
