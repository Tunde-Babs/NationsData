import { test, expect } from '../../fixtures/mocked';
import { PlacePage } from '../../pages/PlacePage';

/** Streets map driven by a deterministic Overpass fixture (see fixtures/mocked.ts). */
test.describe('TS6 · Streets map (mocked) @regression', () => {
  test('TS6-02/03/04 · network, coverage and street list render', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await expect(place.mapContainer).toBeVisible();
    await expect(place.coverageNote).toContainText('5 of 6 road segments have a name');
    await expect(place.coveragePct).toContainText('83%');
    await expect(place.street('Main Street')).toBeVisible();
    await expect(place.streetItems).toHaveCount(5); // 5 named/labelled roads
  });

  test('TS6-06 · selecting a street shows its interconnections', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await place.selectStreet('Main Street');
    await expect(place.selectedPanel).toContainText(/Interconnects with/i);
    await expect(place.connectList.locator('.connect')).toHaveCount(3);
    await expect(place.connectList).toContainText('Second Avenue');
    await expect(place.connectList).toContainText('Third Road');
  });

  test('TS6-05 · changing the radius refetches the network', async ({ page }) => {
    const place = new PlacePage(page);
    let overpassCalls = 0;
    page.on('request', (req) => {
      if (/overpass/.test(req.url())) overpassCalls++;
    });
    await place.gotoAbuja();
    await expect(place.coverage).toBeVisible();
    const before = overpassCalls;
    await place.setRadius('2.2km');
    await expect.poll(() => overpassCalls).toBeGreaterThan(before);
  });

  test('TS6-07 · junction toggle flips state', async ({ page }) => {
    const place = new PlacePage(page);
    await place.gotoAbuja();
    await expect(place.coverage).toBeVisible();
    await expect(place.junctionToggle).toBeChecked();
    await place.junctionToggle.uncheck();
    await expect(place.junctionToggle).not.toBeChecked();
  });
});
