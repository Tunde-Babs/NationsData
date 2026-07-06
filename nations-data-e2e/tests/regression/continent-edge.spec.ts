import { test, expect } from '@playwright/test';
import { ContinentPage } from '../../pages/ContinentPage';

test.describe('TS4 · Continent edge cases @regression @edge', () => {
  test('TS4-11 · Antarctica renders its sparse grid without breaking', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('antarctica');
    await expect(c.bannerTitle).toHaveText('Antarctica');
    await expect(c.countryCards.first()).toBeVisible();
  });

  test('TS4-12 · filter and sort compose correctly', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('africa');
    await expect(c.countryCards.first()).toBeVisible();
    await c.filter('niger'); // name-specific → Niger + Nigeria (not capital matches)
    await c.sortBy('name');
    const names = await c.cardNames();
    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThanOrEqual(3);
    // Still filtered (every card matches) and now alphabetical.
    expect(names.every((n) => /niger/i.test(n))).toBe(true);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
