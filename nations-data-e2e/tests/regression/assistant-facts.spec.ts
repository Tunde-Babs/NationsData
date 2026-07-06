import { test, expect } from '@playwright/test';
import { AssistantWidget } from '../../pages/AssistantWidget';

/** Assistant answers sourced from bundled data — no external network needed. */
test.describe('TS7 · Assistant facts @regression', () => {
  test('TS7-04 · currency', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('What currency does Nigeria use?');
    await expect(bot.lastAnswer()).toContainText(/Nigerian naira/i);
  });

  test('TS7-05 · state count', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('How many states does Nigeria have?');
    await expect(bot.lastAnswer()).toContainText(/states\/regions/i);
  });

  test('TS7-06 · city count', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('How many cities are in France?');
    await expect(bot.lastAnswer()).toContainText(/cities/i);
  });

  test('TS7-14 · alias resolution (USA)', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('What is the capital of the USA?');
    await expect(bot.lastAnswer()).toContainText(/Washington/i);
  });

  test('TS7-15 · suggestion chip sends a question', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await page.locator('.suggestions .chip', { hasText: 'Capital of Japan' }).click();
    await expect(bot.lastAnswer()).toContainText('Tokyo');
  });

  test('TS7-16 · "Open page" link routes to the country', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('What currency does Nigeria use?');
    const link = bot.lastAnswer().locator('.go');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/country\/NGA/);
  });
});
