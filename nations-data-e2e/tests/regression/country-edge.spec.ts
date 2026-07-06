import { test, expect } from '@playwright/test';
import { CountryPage } from '../../pages/CountryPage';

test.describe('TS5 · Country edge cases @regression', () => {
  test('TS5-09 · "View streets" opens the capital map', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    const viewStreets = page.locator('.stat .ministreets');
    await expect(viewStreets).toBeVisible({ timeout: 20_000 });
    await viewStreets.click();
    await expect(page).toHaveURL(/\/place\//);
  });

  test('TS5-10 · OpenStreetMap link opens safely in a new tab', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    const osm = page.getByRole('link', { name: /Open in OpenStreetMap/i });
    await expect(osm).toHaveAttribute('href', /openstreetmap\.org/);
    await expect(osm).toHaveAttribute('target', '_blank');
    await expect(osm).toHaveAttribute('rel', /noopener/);
  });

  test('TS5-15 · lowercase country code resolves', async ({ page }) => {
    const country = new CountryPage(page);
    await page.goto('/country/nga');
    await expect(country.name).toHaveText('Nigeria', { timeout: 20_000 });
  });
});
