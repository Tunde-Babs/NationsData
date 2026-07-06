import { test, expect } from '@playwright/test';
import { CountryPage } from '../../pages/CountryPage';

test.describe('TS5 · Country @regression', () => {
  test('TS5-03 · breadcrumb navigates to continent', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.name).toHaveText('Nigeria', { timeout: 20_000 });
    await page.locator('.crumbs').getByRole('link', { name: /Africa/i }).click();
    await expect(page).toHaveURL(/\/continent\/africa/);
  });

  test('TS5-04 · neighbouring country links', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.neighbours.first()).toBeVisible({ timeout: 20_000 });
    await country.neighbours.filter({ hasText: 'Benin' }).click();
    await expect(page).toHaveURL(/\/country\/BEN/);
  });

  test('TS5-06 · selecting a state marks it active', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    const firstState = page.locator('.state').nth(1); // nth(0) is "All cities"
    await expect(firstState).toBeVisible({ timeout: 20_000 });
    await firstState.click();
    await expect(firstState).toHaveClass(/active/);
  });

  test('TS5-07 · city filter narrows the grid', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.cityLinks.first()).toBeVisible({ timeout: 20_000 });
    await page.locator('.cities-head input').fill('lagos');
    await expect(page.locator('.city', { hasText: 'Lagos' }).first()).toBeVisible();
  });

  test('TS5-08 · a city links to the streets map', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.cityLinks.first()).toBeVisible({ timeout: 20_000 });
    await expect(country.cityLinks.first()).toHaveAttribute('href', /\/place\//);
  });

  test('TS5-11 · island nation shows no land borders', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('JPN');
    await expect(country.name).toHaveText('Japan', { timeout: 20_000 });
    await expect(page.getByText(/No land borders/i)).toBeVisible();
  });
});
