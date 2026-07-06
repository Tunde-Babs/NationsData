import { test, expect } from '../../fixtures/mocked';
import { AssistantWidget } from '../../pages/AssistantWidget';

/** Guards the exact keyword-collision bugs found & fixed during development. */
test.describe('TS7 · Assistant edge / collisions (mocked) @regression @edge', () => {
  test('TS7-22a · "presidents" is not treated as a population query', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Who is the president of the United States of America?');
    await expect(bot.lastAnswer()).toContainText('Donald Trump');
    await expect(bot.lastAnswer()).not.toContainText(/population/i);
  });

  test('TS7-22b · "States of America" is not treated as a states-count query', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('How many states does the United States of America have?');
    await expect(bot.lastAnswer()).toContainText(/states\/regions/i);
    await expect(bot.lastAnswer()).not.toContainText(/president/i);
  });

  test('TS7-23 · rapid multi-send yields distinct answers', async ({ page }) => {
    await page.goto('/');
    const bot = new AssistantWidget(page);
    await bot.open();
    await bot.ask('Capital of Japan');
    await bot.ask('What currency does Nigeria use?');
    await bot.ask('Capital of France');
    await expect(bot.botBubbles.filter({ hasText: 'Tokyo' })).toHaveCount(1);
    await expect(bot.botBubbles.filter({ hasText: /Nigerian naira/ })).toHaveCount(1);
    await expect(bot.botBubbles.filter({ hasText: 'Paris' })).toHaveCount(1);
  });
});
