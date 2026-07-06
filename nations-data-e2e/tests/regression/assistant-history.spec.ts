import { test, expect } from '../../fixtures/mocked';
import { AssistantWidget } from '../../pages/AssistantWidget';

/** Assistant history answers driven by deterministic Wikidata/Wikipedia mocks. */
test.describe('TS7 · Assistant history (mocked) @regression', () => {
  test('TS7-08 · current head of state', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Who is the president of Kenya?');
    await expect(bot.lastAnswer()).toContainText('William Ruto');
  });

  test('TS7-07 · founding date', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('When was Brazil founded?');
    await expect(bot.lastAnswer()).toContainText('1822');
  });

  test('TS7-11 · ruler in a given year', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Who ruled the United Kingdom in 1940?');
    await expect(bot.lastAnswer()).toContainText('George VI');
  });

  test('TS7-13 · country overview from Wikipedia', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Tell me about Ghana');
    await expect(bot.lastAnswer()).toContainText(/West Africa/i);
  });
});
