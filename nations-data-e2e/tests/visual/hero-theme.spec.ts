import { test, expect } from '@playwright/test';
import { HeaderComponent } from '../../pages/HeaderComponent';

/**
 * VIS · Hero background — theme visual regression @visual
 *
 * `section.hero` has no background of its own, so it shows the theme's page
 * background through it. We lock down that colour for both themes by comparing a
 * fresh screenshot against a committed baseline:
 *
 *   - hero-light.png  → data-theme="light"
 *   - hero-dark.png   → data-theme="dark"  (the app default)
 *
 * The 10% pixel tolerance (playwright.config.ts → expect.toHaveScreenshot) means
 * the live hero stats (country/population totals) can change without breaking the
 * test, while a real background-colour regression — which repaints ~every pixel —
 * still fails.
 *
 * Baselines are platform-specific (font antialiasing differs by OS), so they are
 * captured on the machine that runs the test and this suite is skipped on CI until
 * matching Linux baselines are committed (see README → Visual testing).
 */
test.describe('VIS · Hero background — theme visual regression @visual', () => {
  test.skip(!!process.env.CI, 'Commit Linux baselines to enable @visual on CI — see README.');

  test.beforeEach(async ({ page }, testInfo) => {
    // One maintained baseline set (Chromium). Other engines render pixels
    // differently and would need their own baselines.
    test.skip(testInfo.project.name !== 'chromium', 'Visual baseline maintained on Chromium only.');
    await page.goto('/');
    await expect(page.locator('.continent-card').first()).toBeVisible({ timeout: 20_000 });
  });

  test('VIS-01 · light theme shows the light hero background', async ({ page }) => {
    const header = new HeaderComponent(page);
    await header.ensureLight();
    await expect(page.locator('section.hero')).toHaveScreenshot('hero-light.png');
  });

  test('VIS-02 · dark theme shows the dark hero background', async ({ page }) => {
    const header = new HeaderComponent(page);
    await header.ensureDark();
    await expect(page.locator('section.hero')).toHaveScreenshot('hero-dark.png');
  });
});
