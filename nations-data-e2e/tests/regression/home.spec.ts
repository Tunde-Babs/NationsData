import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('TS1 · Home @regression', () => {
  test('TS1-03 · hero shows global stats', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const stats = page.locator('.hero-stats');
    await expect(stats).toBeVisible();
    await expect(stats).toContainText(/continents/i);
    // Countries total is bundled data → always a real number.
    await expect(stats.locator('.hstat b').first()).toHaveText(/\d/);
  });

  test('TS1-05/06 · featured cards render and navigate to a country', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.featuredCards).toHaveCount(8);
    await expect(home.featuredCards.first().locator('.flag')).toBeVisible();
    await home.featuredCards.first().click();
    await expect(page).toHaveURL(/\/country\/[A-Z]{3}/);
  });
});
