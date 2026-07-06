import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { HeaderComponent } from '../pages/HeaderComponent';
import { ContinentPage } from '../pages/ContinentPage';
import { CountryPage } from '../pages/CountryPage';
import { PlacePage } from '../pages/PlacePage';
import { AssistantWidget } from '../pages/AssistantWidget';

/**
 * @smoke — P0 journeys against the live production site.
 * Structure-based, tolerant assertions on stable (mostly bundled) data so the
 * suite stays green regardless of upstream API variance.
 */

const FALLBACK =
  'There are no found answers to your question, please try to ask another question or rephrase your questions for better understanding';

test.describe('NationsData · Smoke @smoke', () => {
  test('TS1-01/02 · home renders hero and exactly 7 continent cards', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.heroHeading).toBeVisible();
    await expect(home.continentCards).toHaveCount(7);
    await expect(home.continentCards.filter({ hasText: 'Africa' })).toBeVisible();
    await expect(home.featuredCards.first()).toBeVisible();
  });

  test('TS9-01 · home has the correct document title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NationsData — Explore the planet/i);
  });

  test('TS1-12 · footer names data sources and copyright', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/OpenStreetMap contributors/i)).toBeVisible();
    await expect(page.getByText(/©\s*\d{4}\s*NationsData/i)).toBeVisible();
  });

  test('TS2-04/05 · theme toggle switches and persists across reload', async ({ page }) => {
    await page.goto('/');
    const header = new HeaderComponent(page);
    await header.ensureLight();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('TS1-04 · continent card navigates to continent page', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.openContinent('Africa');
    await expect(page).toHaveURL(/\/continent\/africa/);
    await expect(page.locator('.banner-main h1')).toHaveText('Africa');
  });

  test('TS3-01/04/05 · search suggests, submits, and groups results', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.heroSearchInput.fill('japan');
    await expect(home.heroSuggestions).toContainText(/Japan/i);
    await home.heroSearchInput.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=japan/);
    await expect(page.getByRole('heading', { name: 'Countries' })).toBeVisible();
    await expect(page.getByText('Japan', { exact: true }).first()).toBeVisible();
  });

  test('TS4-01/05 · continent grid renders and filters', async ({ page }) => {
    const continent = new ContinentPage(page);
    await continent.goto('africa');
    await expect(continent.bannerTitle).toHaveText('Africa');
    await expect(continent.countryCards.first()).toBeVisible();
    expect(await continent.countryCards.count()).toBeGreaterThan(20);
    await continent.filter('nig');
    await expect(continent.countryCards.filter({ hasText: 'Nigeria' })).toBeVisible();
    expect(await continent.countryCards.count()).toBeLessThanOrEqual(5);
  });

  test('TS4-10 · unknown continent shows a graceful state', async ({ page }) => {
    await page.goto('/continent/atlantis');
    await expect(page.getByText(/Unknown continent/i)).toBeVisible();
  });

  test('TS5-01/02 · country page shows identity and core facts', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.name).toHaveText('Nigeria', { timeout: 20_000 });
    await expect(page.getByText('Abuja').first()).toBeVisible();
    await expect(page.getByText(/Nigerian naira/i)).toBeVisible();
  });

  test('TS5-05/08 · country lists cities that link to the streets map', async ({ page }) => {
    const country = new CountryPage(page);
    await country.goto('NGA');
    await expect(country.cityLinks.first()).toBeVisible({ timeout: 20_000 });
    await expect(country.cityLinks.first()).toHaveAttribute('href', /\/place\//);
  });

  test('TS8-04 · unknown route redirects home', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.locator('.continent-card')).toHaveCount(7);
  });

  test('TS9-02 · country identity is server-rendered (SEO)', async ({ request }) => {
    const res = await request.get('/country/KEN');
    expect(res.status()).toBe(200);
    // Country name is present in the raw (no-JS) HTML → crawlers see real content.
    expect(await res.text()).toContain('Kenya');
  });

  test('TS6-01 · streets map renders for a city', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await expect(place.title).toHaveText('Abuja');
    await expect(place.mapContainer).toBeVisible({ timeout: 20_000 });
    await expect(place.radiusButtons.first()).toBeVisible();
  });

  test('TS7-01/02 · assistant answers a bundled fact', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Capital of Japan');
    await expect(bot.lastAnswer()).toContainText('Tokyo', { timeout: 15_000 });
  });

  test('TS7-17 · assistant returns the exact fallback for gibberish', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('asldkfj zzz nonsense');
    await expect(bot.lastAnswer()).toHaveText(FALLBACK, { timeout: 15_000 });
  });
});
