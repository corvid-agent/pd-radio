import { test, expect } from '@playwright/test';

/** Reusable mock data */
const MOCK_SEARCH_RESPONSE = {
  response: {
    docs: [
      { identifier: 'test-album-001', title: 'Test Album', creator: 'Test Artist' },
      { identifier: 'test-album-002', title: 'Second Album', creator: 'Another Artist' },
    ],
  },
};

const MOCK_METADATA_RESPONSE = {
  files: [
    { name: 'track01.mp3', title: 'First Track', length: '180.5' },
    { name: 'track02.mp3', title: 'Second Track', length: '245.0' },
    { name: 'track03.mp3', title: 'Third Track', length: '312.7' },
    { name: 'cover.jpg' },  // non-audio file, should be filtered out
  ],
};

test.describe('Player — station list display', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/archive.org/advancedsearch.php**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESPONSE),
      })
    );
    await page.route('**/archive.org/metadata/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_METADATA_RESPONSE),
      })
    );
    await page.goto('/');
  });

  test('should render all 6 stations with correct names', async ({ page }) => {
    const expectedNames = ['Classical', 'Jazz', 'Blues', 'Folk', 'World', 'Ambient'];
    for (const name of expectedNames) {
      await expect(page.locator('.station-name', { hasText: name })).toBeVisible();
    }
  });

  test('each station card should have icon, name, and description', async ({ page }) => {
    const stations = page.locator('#stations .station');
    const count = await stations.count();
    expect(count).toBe(6);

    for (let i = 0; i < count; i++) {
      const station = stations.nth(i);
      await expect(station.locator('.station-icon')).toBeVisible();
      await expect(station.locator('.station-name')).toBeVisible();
      await expect(station.locator('.station-desc')).toBeVisible();
    }
  });

  test('station descriptions should match expected text', async ({ page }) => {
    const descriptions: Record<string, string> = {
      Classical: 'Orchestral & chamber',
      Jazz: 'Swing, bop & cool',
      Blues: 'Delta & Chicago',
      Folk: 'Traditional & roots',
      World: 'Global sounds',
      Ambient: 'Atmospheric textures',
    };

    for (const [name, desc] of Object.entries(descriptions)) {
      const station = page.locator('.station', { has: page.locator('.station-name', { hasText: name }) });
      await expect(station.locator('.station-desc')).toHaveText(desc);
    }
  });

  test('each station should have a data-id attribute', async ({ page }) => {
    const expectedIds = ['classical', 'jazz', 'blues', 'folk', 'world', 'ambient'];
    for (const id of expectedIds) {
      await expect(page.locator(`.station[data-id="${id}"]`)).toBeAttached();
    }
  });

  test('clicking a station should mark it as active', async ({ page }) => {
    const jazzStation = page.locator('.station[data-id="jazz"]');
    await jazzStation.click();

    await expect(jazzStation).toHaveClass(/active/);
    // Others should not be active
    await expect(page.locator('.station[data-id="classical"]')).not.toHaveClass(/active/);
  });

  test('clicking a different station should switch the active class', async ({ page }) => {
    const jazz = page.locator('.station[data-id="jazz"]');
    const blues = page.locator('.station[data-id="blues"]');

    await jazz.click();
    await expect(jazz).toHaveClass(/active/);

    await blues.click();
    await expect(blues).toHaveClass(/active/);
    await expect(jazz).not.toHaveClass(/active/);
  });

  test('clicking a station should update the now-playing label to Loading', async ({ page }) => {
    // Use a delayed route so we can catch the loading state
    await page.route('**/archive.org/advancedsearch.php**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SEARCH_RESPONSE),
        });
      }, 500);
    });

    await page.locator('.station[data-id="classical"]').click();
    await expect(page.locator('#np-label-text')).toHaveText('Loading');
  });
});

test.describe('Player — play controls and tracklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/archive.org/advancedsearch.php**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESPONSE),
      })
    );
    await page.route('**/archive.org/metadata/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_METADATA_RESPONSE),
      })
    );
    // Mock the actual audio download to prevent network errors
    await page.route('**/archive.org/download/**', route =>
      route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.alloc(0) })
    );
    await page.goto('/');
  });

  test('play button should show play icon initially (pause icon hidden)', async ({ page }) => {
    await expect(page.locator('#icon-play')).toBeVisible();
    await expect(page.locator('#icon-pause')).toBeHidden();
  });

  test('selecting a station should render a tracklist table', async ({ page }) => {
    await page.locator('.station[data-id="classical"]').click();

    const table = page.locator('.track-table');
    await expect(table).toBeVisible();

    // Should have header row with #, Title, Duration
    await expect(table.locator('thead th')).toHaveCount(3);
  });

  test('tracklist should show only audio files (not cover.jpg)', async ({ page }) => {
    await page.locator('.station[data-id="folk"]').click();

    const rows = page.locator('.track-table tbody tr');
    await expect(rows).toHaveCount(3); // 3 mp3 files, not 4
  });

  test('tracklist rows should display track numbers, titles, and durations', async ({ page }) => {
    await page.locator('.station[data-id="jazz"]').click();

    const rows = page.locator('.track-table tbody tr');
    await expect(rows).toHaveCount(3);

    // First row
    const firstRow = rows.nth(0);
    await expect(firstRow.locator('.num')).toHaveText('1');
    await expect(firstRow.locator('td').nth(1)).toHaveText('First Track');

    // Second row
    const secondRow = rows.nth(1);
    await expect(secondRow.locator('.num')).toHaveText('2');
    await expect(secondRow.locator('td').nth(1)).toHaveText('Second Track');
  });

  test('now-playing should update with track info after station select', async ({ page }) => {
    await page.locator('.station[data-id="blues"]').click();

    // After loading completes, now-playing label should show "Now Playing"
    await expect(page.locator('#np-label-text')).toHaveText('Now Playing');
    // The title should contain the first track name
    await expect(page.locator('#np-title')).toHaveText('First Track');
  });

  test('one tracklist row should be marked active after station select', async ({ page }) => {
    await page.locator('.station[data-id="world"]').click();

    // Wait for tracklist to render
    await expect(page.locator('.track-table')).toBeVisible();

    const activeRow = page.locator('.track-table tr.active');
    await expect(activeRow).toHaveCount(1);
  });

  test('volume slider should have correct default value', async ({ page }) => {
    const volume = page.locator('#volume');
    await expect(volume).toHaveValue('0.7');
  });

  test('pulsing dot should be hidden before playback', async ({ page }) => {
    const dot = page.locator('#np-dot');
    await expect(dot).toBeHidden();
  });

  test('Previous and Next buttons should have correct titles', async ({ page }) => {
    await expect(page.locator('.player button[title="Previous"]')).toBeVisible();
    await expect(page.locator('.player button[title="Next"]')).toBeVisible();
    await expect(page.locator('.player button[title="Play / Pause"]')).toBeVisible();
  });

  test('clicking a tracklist row should update the active row', async ({ page }) => {
    // Stub Audio constructor before page loads to prevent error-driven auto-advance
    await page.addInitScript(() => {
      const OrigAudio = window.Audio;
      (window as any).Audio = function() {
        const a = new OrigAudio();
        let fakeSrc = '';
        Object.defineProperty(a, 'src', {
          get() { return fakeSrc; },
          set(v: string) { fakeSrc = v; },
          configurable: true,
        });
        a.play = () => Promise.resolve();
        return a;
      };
    });

    // Re-navigate so the init script takes effect (beforeEach already navigated once)
    await page.goto('/');

    await page.locator('.station[data-id="ambient"]').click();
    await expect(page.locator('.track-table')).toBeVisible();

    // Click the second track row
    const secondRow = page.locator('.track-table tbody tr[data-idx="1"]');
    await secondRow.click();

    await expect(secondRow).toHaveClass(/active/);
    // First row should no longer be active
    await expect(page.locator('.track-table tbody tr[data-idx="0"]')).not.toHaveClass(/active/);
  });

  test('now-playing title should update when clicking a different track', async ({ page }) => {
    // Stub Audio constructor before page loads to prevent error-driven auto-advance
    await page.addInitScript(() => {
      const OrigAudio = window.Audio;
      (window as any).Audio = function() {
        const a = new OrigAudio();
        let fakeSrc = '';
        Object.defineProperty(a, 'src', {
          get() { return fakeSrc; },
          set(v: string) { fakeSrc = v; },
          configurable: true,
        });
        a.play = () => Promise.resolve();
        return a;
      };
    });

    // Re-navigate so the init script takes effect
    await page.goto('/');

    await page.locator('.station[data-id="classical"]').click();
    await expect(page.locator('.track-table')).toBeVisible();

    // Click the second track
    await page.locator('.track-table tbody tr[data-idx="1"]').click();
    await expect(page.locator('#np-title')).toHaveText('Second Track');

    // Click the third track
    await page.locator('.track-table tbody tr[data-idx="2"]').click();
    await expect(page.locator('#np-title')).toHaveText('Third Track');
  });
});

test.describe('Player — error handling', () => {
  test('should show error message when API fails', async ({ page }) => {
    await page.route('**/archive.org/advancedsearch.php**', route =>
      route.fulfill({ status: 500, body: 'Server Error' })
    );
    await page.goto('/');

    await page.locator('.station[data-id="jazz"]').click();
    await expect(page.locator('#np-title')).toContainText('Error');
  });

  test('should show "No results" when API returns empty docs', async ({ page }) => {
    await page.route('**/archive.org/advancedsearch.php**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: { docs: [] } }),
      })
    );
    await page.goto('/');

    await page.locator('.station[data-id="folk"]').click();
    await expect(page.locator('#np-title')).toHaveText('No results found');
  });
});
