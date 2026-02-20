import { test, expect } from '@playwright/test';

test.describe('App', () => {
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

  test('should load with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PD Radio/i);
  });

  test('should show station grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#stations')).toBeVisible();
  });

  test('should show play button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#play-btn')).toBeVisible();
  });

  test('should show volume control', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#volume')).toBeVisible();
  });
});
