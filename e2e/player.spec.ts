import { test, expect } from '@playwright/test';

test.describe('Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/archive.org/**', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ response: { docs: [
          { identifier: 'test-item', title: 'Test Album', creator: 'Test Artist' }
        ] } }),
      })
    );
  });

  test('should show now playing card', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#np-card')).toBeAttached();
  });

  test('should show progress bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#progress-bar')).toBeVisible();
  });

  test('should show time display', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#time-cur')).toBeVisible();
  });

  test('should show tracklist area', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tracklist')).toBeAttached();
  });

  test('should have station buttons', async ({ page }) => {
    await page.goto('/');
    const stations = page.locator('#stations button, #stations .station, #stations > *');
    const count = await stations.count();
    expect(count).toBeGreaterThan(0);
  });
});
