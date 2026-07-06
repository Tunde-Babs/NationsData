import { Page, Locator } from '@playwright/test';

/** Streets / roads map page (Leaflet + Overpass). */
export class PlacePage {
  readonly mapContainer: Locator;
  readonly title: Locator;
  readonly radiusButtons: Locator;
  readonly streetItems: Locator;

  constructor(private readonly page: Page) {
    this.mapContainer = page.locator('.leaflet-container');
    this.title = page.locator('.side-head h1');
    this.radiusButtons = page.locator('.segmented button');
    this.streetItems = page.locator('.street');
  }

  /** Abuja — a well-mapped capital used for the smoke check. */
  async gotoAbuja(): Promise<void> {
    await this.page.goto(
      '/place/9.0765/7.3986?name=Abuja&country=Nigeria&cca3=NGA'
    );
  }
}
