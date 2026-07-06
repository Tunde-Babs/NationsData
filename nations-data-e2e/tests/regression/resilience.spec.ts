import { test, expect } from '@playwright/test';
import { AssistantWidget } from '../../pages/AssistantWidget';

const FALLBACK =
  'There are no found answers to your question, please try to ask another question or rephrase your questions for better understanding';

test.describe('TS12 · Resilience @regression @edge', () => {
  test('TS12-07 · Wikidata rate-limit (429) falls back gracefully', async ({ page }) => {
    await page.route(/query\.wikidata\.org/, (r) => r.fulfill({ status: 429, body: '' }));
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Who is the president of Kenya?');
    await expect(bot.lastAnswer()).toHaveText(FALLBACK, { timeout: 15_000 });
  });

  test('TS12-03 · core pages render with all third parties blocked', async ({ page }) => {
    // Bundled data (countries/states/cities) must still power the app offline.
    for (const host of [
      /api\.worldbank\.org/, /flagcdn\.com/, /overpass/, /wikidata\.org/,
      /wikipedia\.org/, /basemaps\.cartocdn\.com/
    ]) {
      await page.route(host, (r) => r.abort());
    }
    await page.goto('/country/NGA');
    await expect(page.locator('.hero-main h1')).toHaveText('Nigeria', { timeout: 20_000 });
    await expect(page.getByText('Abuja').first()).toBeVisible();
  });
});
