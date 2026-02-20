import { test, expect } from '@playwright/test';

test.describe('App — basic loading and structure', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all archive.org API calls to avoid network dependency
    await page.route('**/archive.org/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            docs: [
              { identifier: 'test-item', title: 'Test Album', creator: 'Test Artist' },
            ],
          },
        }),
      })
    );
    await page.goto('/');
  });

  test('should load with correct page title', async ({ page }) => {
    await expect(page).toHaveTitle('PD Radio \u2014 corvid-agent');
  });

  test('should display the header with logo', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('.logo')).toBeVisible();
    await expect(header.locator('.logo .pd')).toHaveText('PD');
    await expect(header.locator('.logo .radio')).toHaveText('Radio');
  });

  test('should display the tagline in header', async ({ page }) => {
    const tagline = page.locator('.tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText('Public Domain Streaming');
    await expect(tagline).toContainText('corvid-agent');
  });

  test('should display the "Stations" section title', async ({ page }) => {
    const sectionTitle = page.locator('.section-title');
    await expect(sectionTitle).toBeVisible();
    await expect(sectionTitle).toHaveText('Stations');
  });

  test('should display the station grid container', async ({ page }) => {
    const stations = page.locator('#stations');
    await expect(stations).toBeVisible();
    await expect(stations).toHaveClass(/stations/);
  });

  test('should render exactly 6 station cards', async ({ page }) => {
    const stationCards = page.locator('#stations .station');
    await expect(stationCards).toHaveCount(6);
  });

  test('should display the now-playing card', async ({ page }) => {
    const npCard = page.locator('#np-card');
    await expect(npCard).toBeVisible();
    await expect(npCard).toHaveClass(/now-playing/);
  });

  test('should show default now-playing state before station selection', async ({ page }) => {
    await expect(page.locator('#np-label-text')).toHaveText('Select a station to begin');
    // The em-dash entity renders as the character \u2014
    await expect(page.locator('#np-title')).toHaveText('\u2014');
  });

  test('should display the player controls bar', async ({ page }) => {
    const player = page.locator('.player');
    await expect(player).toBeVisible();
  });

  test('should display the play/pause button', async ({ page }) => {
    const playBtn = page.locator('#play-btn');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveClass(/play-btn/);
  });

  test('should display volume slider', async ({ page }) => {
    const volume = page.locator('#volume');
    await expect(volume).toBeVisible();
    await expect(volume).toHaveAttribute('type', 'range');
    await expect(volume).toHaveAttribute('min', '0');
    await expect(volume).toHaveAttribute('max', '1');
  });

  test('should display the progress bar', async ({ page }) => {
    await expect(page.locator('#progress-bar')).toBeVisible();
    await expect(page.locator('#progress-fill')).toBeAttached();
  });

  test('should display time indicators initialized to 0:00', async ({ page }) => {
    await expect(page.locator('#time-cur')).toHaveText('0:00');
    await expect(page.locator('#time-dur')).toHaveText('0:00');
  });

  test('should display the footer with attribution', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Internet Archive');
    await expect(footer).toContainText('public domain');
    await expect(footer).toContainText('corvid-agent');
  });

  test('should have footer links with correct hrefs', async ({ page }) => {
    const archiveLink = page.locator('footer a[href="https://archive.org"]');
    await expect(archiveLink).toBeVisible();
    await expect(archiveLink).toHaveText('Internet Archive');

    const authorLink = page.locator('footer a[href="https://github.com/corvid-agent"]');
    await expect(authorLink).toBeVisible();
    await expect(authorLink).toHaveText('corvid-agent');
  });

  test('should have the tracklist container present', async ({ page }) => {
    const tracklist = page.locator('#tracklist');
    await expect(tracklist).toBeAttached();
    // Empty before any station is selected
    await expect(tracklist).toBeEmpty();
  });

  test('should have main content area', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have Previous, Play, and Next buttons in player', async ({ page }) => {
    const buttons = page.locator('.player button');
    // Previous, Play/Pause, Next
    await expect(buttons).toHaveCount(3);
  });
});
