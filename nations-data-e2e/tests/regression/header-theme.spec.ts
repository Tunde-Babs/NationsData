import { test, expect } from '@playwright/test';
import { HeaderComponent } from '../../pages/HeaderComponent';

test.describe('TS2 · Header, nav & theme @regression', () => {
  test('TS2-01 · brand returns home from a deep page', async ({ page }) => {
    await page.goto('/country/NGA');
    await page.locator('.site-header .brand').click();
    await expect(page).toHaveURL(/thenationsdata\.com\/?$|localhost:\d+\/?$/);
    await expect(page.locator('.continent-card')).toHaveCount(7);
  });

  test('TS2-02/03 · Atlas and Search nav links', async ({ page }) => {
    await page.goto('/country/NGA');
    await page.getByRole('link', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/search/);
    await page.getByRole('link', { name: 'Atlas' }).click();
    await expect(page.locator('.continent-card')).toHaveCount(7);
  });

  test('TS2-06 · theme persists across navigation', async ({ page }) => {
    await page.goto('/');
    const header = new HeaderComponent(page);
    await header.ensureLight();
    await page.goto('/country/KEN');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/continent/asia');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
