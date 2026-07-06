import { Page, Locator } from '@playwright/test';

/** Streets / roads map page (Leaflet + Overpass). */
export class PlacePage {
  readonly mapContainer: Locator;
  readonly title: Locator;
  readonly radiusButtons: Locator;
  readonly streetItems: Locator;
  readonly miniStats: Locator;
  readonly coverage: Locator;
  readonly coveragePct: Locator;
  readonly coverageNote: Locator;
  readonly streetList: Locator;
  readonly selectedPanel: Locator;
  readonly connectList: Locator;
  readonly junctionToggle: Locator;
  readonly loadingOverlay: Locator;

  constructor(private readonly page: Page) {
    this.mapContainer = page.locator('.leaflet-container');
    this.title = page.locator('.side-head h1');
    this.radiusButtons = page.locator('.segmented button');
    this.streetItems = page.locator('.street');
    this.miniStats = page.locator('.mini-stats');
    this.coverage = page.locator('.coverage');
    this.coveragePct = page.locator('.cov-head b');
    this.coverageNote = page.locator('.cov-note');
    this.streetList = page.locator('.street-list');
    this.selectedPanel = page.locator('.selected');
    this.connectList = page.locator('.connect-list');
    this.junctionToggle = page.locator('.toggle input[type="checkbox"]');
    this.loadingOverlay = page.locator('.map-overlay');
  }

  async goto(lat: number, lng: number, params = ''): Promise<void> {
    await this.page.goto(`/place/${lat}/${lng}${params}`);
  }

  /** Abuja — a well-mapped capital used across the map specs. */
  async gotoAbuja(): Promise<void> {
    await this.goto(9.0765, 7.3986, '?name=Abuja&country=Nigeria&cca3=NGA');
  }

  street(name: string): Locator {
    return this.streetList.locator('.street', { hasText: name });
  }

  async selectStreet(name: string): Promise<void> {
    await this.street(name).click();
  }

  async setRadius(label: string): Promise<void> {
    await this.radiusButtons.filter({ hasText: label }).click();
  }
}
