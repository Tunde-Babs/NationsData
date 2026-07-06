import { test, expect } from '../../fixtures/mocked';
import { PlacePage } from '../../pages/PlacePage';

test.describe('TS6 · Streets edge (mocked) @regression @edge', () => {
  test('TS6-08 · street filter narrows the list', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await expect(place.streetItems).toHaveCount(5);
    await page.locator('.streets-head input').fill('Main');
    await expect(place.streetItems).toHaveCount(1);
    await expect(place.street('Main Street')).toBeVisible();
  });

  test('TS6-10 · back link returns to the country page', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await page.locator('.back').click();
    await expect(page).toHaveURL(/\/country\/NGA/);
  });

  test('TS6-15 · non-numeric coordinates show a notice, no fetch', async ({ page }) => {
    await page.goto('/place/abc/def');
    await expect(page.locator('.notice.warn')).toContainText(/No coordinates/i);
  });
});
