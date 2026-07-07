import { Page, Locator, expect } from '@playwright/test';

/** The site header: brand, Atlas/Search nav, and the theme toggle. */
export class HeaderComponent {
  readonly brand: Locator;
  readonly atlas: Locator;
  readonly search: Locator;
  readonly themeToggle: Locator;
  readonly html: Locator;

  constructor(private readonly page: Page) {
    this.brand = page.locator('.site-header .brand');
    this.atlas = page.getByRole('link', { name: 'Atlas' });
    this.search = page.getByRole('link', { name: 'Search' });
    this.themeToggle = page.getByRole('button', { name: /toggle theme/i });
    this.html = page.locator('html');
  }

  /**
   * Switch to the light theme, hydration-safely. The toggle button is
   * server-rendered, so a click before Angular hydrates does nothing — retry
   * until `data-theme="light"` actually sticks. (Default theme is dark, rendered
   * without the attribute, so we click at most once effectively.)
   */
  async ensureLight(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(async () => {
      const theme = await this.html.getAttribute('data-theme');
      if (theme !== 'light') {
        await this.themeToggle.click({ timeout: 3000 }).catch(() => {});
      }
      await expect(this.html).toHaveAttribute('data-theme', 'light', { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Switch to the dark theme, hydration-safely — the mirror of {@link ensureLight}.
   * Dark is the app default, so on a fresh page this usually needs no click; retry
   * until `data-theme="dark"` sticks in case a previous state (or a persisted
   * preference) left it on light.
   */
  async ensureDark(): Promise<void> {
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await expect(async () => {
      const theme = await this.html.getAttribute('data-theme');
      if (theme !== 'dark') {
        await this.themeToggle.click({ timeout: 3000 }).catch(() => {});
      }
      await expect(this.html).toHaveAttribute('data-theme', 'dark', { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
  }
}
