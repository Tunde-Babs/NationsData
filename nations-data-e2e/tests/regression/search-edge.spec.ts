import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage';

test.describe('TS3 · Search edge cases @regression @edge', () => {
  test('TS3-08 · Escape closes the suggestion dropdown', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.heroSearchInput.fill('japan');
    await expect(home.heroSuggestions).toBeVisible();
    await home.heroSearchInput.press('Escape');
    await expect(home.heroSuggestions).toBeHidden();
  });

  test('TS3-12 · query is case-insensitive and trimmed', async ({ page }) => {
    await page.goto('/search?q=' + encodeURIComponent('  JaPaN  '));
    await expect(page.getByRole('heading', { name: 'Countries' })).toBeVisible();
    await expect(page.getByText('Japan', { exact: true }).first()).toBeVisible();
  });

  test('TS3-14 · HTML/script in query is inert (no XSS)', async ({ page }) => {
    let dialogFired = false;
    page.on('dialog', (d) => {
      dialogFired = true;
      d.dismiss().catch(() => {});
    });
    await page.goto('/search?q=' + encodeURIComponent('<script>alert(1)</script>'));
    await expect(page.locator('.summary, .empty').first()).toBeVisible();
    // Rendered as escaped text, and no alert dialog was triggered.
    await expect(page.getByText(/alert\(1\)/)).toBeVisible();
    expect(dialogFired).toBe(false);
  });

  test('TS3-15 · a very long query is handled gracefully', async ({ page }) => {
    await page.goto('/search?q=' + encodeURIComponent('lorem ipsum '.repeat(40)));
    // Renders an empty state without crashing.
    await expect(page.locator('.search-page')).toBeVisible();
    await expect(page.getByText(/No matches/i)).toBeVisible();
  });
});
