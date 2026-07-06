import { test, expect } from '@playwright/test';

test.describe('TS2 · Theme & state edge cases @regression @edge', () => {
  test('TS2-07 · a corrupt saved theme falls back gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('wd:theme', 'banana');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    // App loads normally and never applies the invalid value.
    await expect(page.locator('.continent-card')).toHaveCount(7);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'banana');
  });

  test('TS2-08 · header stays pinned while scrolling', async ({ page }) => {
    await page.goto('/country/NGA');
    await expect(page.locator('.hero-main h1')).toBeVisible({ timeout: 20_000 });
    // window.scrollTo works on every engine (mouse.wheel is unsupported on mobile WebKit).
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('.site-header')).toBeInViewport();
  });
});
