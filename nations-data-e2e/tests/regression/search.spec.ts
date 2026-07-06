import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('TS3 · Search @regression', () => {
  test('TS3-02 · clicking a country suggestion navigates', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.heroSearchInput.fill('portug');
    await home.heroSuggestions.locator('.row', { hasText: 'Portugal' }).first().click();
    await expect(page).toHaveURL(/\/country\/PRT/);
  });

  test('TS3-03 · a capital suggestion routes to its country', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.heroSearchInput.fill('nairobi');
    await expect(home.heroSuggestions).toContainText(/Nairobi/i);
    await home.heroSuggestions.locator('.row', { hasText: 'Nairobi' }).first().click();
    await expect(page).toHaveURL(/\/country\/KEN/);
  });

  test('TS3-07 · keyboard arrow + enter activates a suggestion', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.heroSearchInput.fill('japan');
    await expect(home.heroSuggestions).toContainText(/Japan/i);
    await home.heroSearchInput.press('ArrowDown');
    await home.heroSearchInput.press('Enter');
    await expect(page).toHaveURL(/\/country\/JPN/);
  });

  test('TS3-06 · a city result routes to the streets map', async ({ page }) => {
    await page.goto('/search?q=Tokyo');
    const cityResult = page.locator('.result.city').first();
    await expect(cityResult).toBeVisible();
    await cityResult.click();
    await expect(page).toHaveURL(/\/place\//);
  });

  test('TS3-10 · no-match query shows an empty state', async ({ page }) => {
    await page.goto('/search?q=zzzzzzzz');
    await expect(page.getByText(/No matches/i)).toBeVisible();
  });

  test('TS3-11 · empty submit does not navigate', async ({ page }) => {
    // Use the hero search — the header search is hidden on mobile widths by design.
    await page.goto('/');
    const search = page.locator('.hero-search input');
    await search.click();
    await search.press('Enter');
    await expect(page.locator('.continent-card')).toHaveCount(7);
  });

  test('TS3-16 · deep link to results renders groups', async ({ page }) => {
    await page.goto('/search?q=kenya');
    await expect(page.getByRole('heading', { name: 'Countries' })).toBeVisible();
    await expect(page.locator('.result').first()).toBeVisible();
  });
});
