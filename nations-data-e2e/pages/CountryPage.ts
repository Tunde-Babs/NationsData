import { Page, Locator } from '@playwright/test';

/** Country detail page: hero, stat tiles, neighbours, regions & cities. */
export class CountryPage {
  readonly name: Locator;
  readonly statTiles: Locator;
  readonly cityLinks: Locator;
  readonly neighbours: Locator;

  constructor(private readonly page: Page) {
    this.name = page.locator('.hero-main h1');
    this.statTiles = page.locator('.stat');
    this.cityLinks = page.locator('.city');
    this.neighbours = page.locator('.border');
  }

  async goto(cca3: string): Promise<void> {
    await this.page.goto(`/country/${cca3}`);
  }
}
