import { test, expect } from '@playwright/test';

test.describe('TS1/TS9 · Home layout & metadata @regression', () => {
  test('TS1-07 · continent cards show a compact population figure', async ({ page }) => {
    await page.goto('/');
    const foot = page.locator('.continent-card .cc-foot').first();
    await expect(foot).toContainText(/[\d.]+[BMK]?/);
  });

  test('TS1-11 · no horizontal overflow on the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.continent-card').first()).toBeVisible();
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
    );
    expect(noOverflow).toBe(true);
  });

  test('TS9-06 · favicon and theme-color metadata present', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  });
});
