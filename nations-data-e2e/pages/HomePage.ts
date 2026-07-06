import { Page, Locator } from '@playwright/test';

/** Landing page: hero, search, continent widgets, theme toggle, assistant FAB. */
export class HomePage {
  readonly continentCards: Locator;
  readonly featuredCards: Locator;
  readonly heroHeading: Locator;
  readonly heroSearchInput: Locator;
  readonly heroSuggestions: Locator;
  readonly themeToggle: Locator;
  readonly assistantFab: Locator;

  constructor(private readonly page: Page) {
    this.continentCards = page.locator('.continent-card');
    this.featuredCards = page.locator('.mini-card');
    this.heroHeading = page.getByRole('heading', { name: /Explore the planet/i });
    this.heroSearchInput = page.locator('.hero-search input');
    this.heroSuggestions = page.locator('.hero-search .dropdown');
    this.themeToggle = page.getByRole('button', { name: /toggle theme/i });
    this.assistantFab = page.locator('.fab');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async openContinent(name: string): Promise<void> {
    await this.continentCards.filter({ hasText: name }).first().click();
  }

  async searchAndSubmit(query: string): Promise<void> {
    await this.heroSearchInput.fill(query);
    await this.heroSearchInput.press('Enter');
  }
}
