import { test, expect } from '@playwright/test';
import { ContinentPage } from '../../pages/ContinentPage';

test.describe('TS4 · Continent @regression', () => {
  test('TS4-02 · default sort is population (Nigeria leads Africa)', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('africa');
    await expect(c.countryCards.first()).toBeVisible();
    const names = await c.cardNames();
    expect(names[0]).toBe('Nigeria');
  });

  test('TS4-03 · sort by land area (Algeria leads Africa)', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('africa');
    await expect(c.countryCards.first()).toBeVisible();
    await c.sortBy('area');
    const names = await c.cardNames();
    expect(names[0]).toBe('Algeria');
  });

  test('TS4-04 · sort by name is alphabetical', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('africa');
    await expect(c.countryCards.first()).toBeVisible();
    await c.sortBy('name');
    const names = await c.cardNames();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('TS4-07 · country card navigates', async ({ page }) => {
    const c = new ContinentPage(page);
    await c.goto('europe');
    await c.countryCards.first().click();
    await expect(page).toHaveURL(/\/country\/[A-Z]{3}/);
  });

  test('TS4-08 · all 7 continents render a grid', async ({ page }) => {
    const c = new ContinentPage(page);
    for (const id of ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania', 'antarctica']) {
      await c.goto(id);
      await expect(c.bannerTitle).toBeVisible();
      await expect(c.countryCards.first()).toBeVisible();
    }
  });
});
