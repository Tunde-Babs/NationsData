import { Page, Locator, expect } from '@playwright/test';

/** The floating "Ask NationsData" chat assistant. */
export class AssistantWidget {
  readonly fab: Locator;
  readonly panel: Locator;
  readonly input: Locator;
  readonly send: Locator;
  readonly botBubbles: Locator;

  constructor(private readonly page: Page) {
    this.fab = page.locator('.fab');
    this.panel = page.locator('.panel');
    this.input = page.locator('.composer input');
    this.send = page.locator('.composer .send');
    this.botBubbles = page.locator('.msg.bot .bubble');
  }

  /**
   * Open the widget in a hydration-safe way. The FAB markup is server-rendered,
   * so a click before Angular hydrates is a no-op. We (1) wait for the app to go
   * idle (hydrated), then (2) click once and wait generously for the composer —
   * only re-clicking if it's still closed, never mid-animation (which would
   * toggle it shut again).
   */
  async open(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(this.fab).toBeVisible();
    for (let attempt = 0; attempt < 5; attempt++) {
      if (await this.input.isVisible().catch(() => false)) return;
      await this.fab.click({ timeout: 5000 }).catch(() => {});
      try {
        await expect(this.input).toBeVisible({ timeout: 4000 });
        return;
      } catch {
        /* pre-hydration no-op or slow load — try again */
      }
    }
    await expect(this.input).toBeVisible();
  }

  async ask(question: string): Promise<void> {
    await this.input.fill(question);
    await this.send.click();
  }

  lastAnswer(): Locator {
    return this.botBubbles.last();
  }
}
