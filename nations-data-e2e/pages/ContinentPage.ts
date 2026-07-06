import { Page, Locator } from '@playwright/test';

/** Continent page: banner, filter, sort control, country grid. */
export class ContinentPage {
  readonly bannerTitle: Locator;
  readonly countryCards: Locator;
  readonly filterInput: Locator;
  readonly sortSelect: Locator;

  constructor(private readonly page: Page) {
    this.bannerTitle = page.locator('.banner-main h1');
    this.countryCards = page.locator('.country-card');
    this.filterInput = page.locator('.toolbar input');
    this.sortSelect = page.locator('.sort select');
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`/continent/${id}`);
  }

  async filter(text: string): Promise<void> {
    await this.filterInput.fill(text);
  }

  /** value is one of 'population' | 'area' | 'name'. */
  async sortBy(value: string): Promise<void> {
    await this.sortSelect.selectOption(value);
  }

  /** Names of the country cards in current DOM order. */
  async cardNames(): Promise<string[]> {
    return this.countryCards.locator('h3').allInnerTexts();
  }
}
