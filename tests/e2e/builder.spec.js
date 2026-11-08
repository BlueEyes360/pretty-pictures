import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }, testInfo) => {
  await page.context().setExtraHTTPHeaders({ 'X-Gallery-Test': testInfo.testId });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message)); page.__errors = errors;
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#768a97"/></svg>' });
    return route.abort();
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Start viewing' }).click();
});
test.afterEach(async ({ page }) => expect(page.__errors).toEqual([]));
async function builder(page) {
  await page.getByRole('button', { name: 'Build a gallery', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Build gallery', exact: true })).toBeEnabled();
}
async function build(page, count = 8) {
  await builder(page); await page.getByLabel('Maximum artworks').fill(String(count));
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 1 — Claude Monet');
}

test('combines filters through the real Node service and persists the generated JSON', async ({ page }) => {
  await builder(page);
  await page.getByRole('button', { name: 'Clear art types' }).click();
  await page.getByRole('checkbox', { name: 'Prints', exact: true }).check();
  await page.getByLabel('Find an artist').fill('Monet');
  await expect(page.getByRole('button', { name: 'Build gallery', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Find artist', exact: true }).click();
  await page.getByRole('button', { name: 'Claude Monet · 1840–1926 · French' }).click();
  await page.getByLabel('Culture', { exact: true }).fill('Japanese');
  await page.getByLabel('From year').fill('1800'); await page.getByLabel('To year').fill('1899');
  await page.getByLabel('Medium', { exact: true }).fill('watercolor'); await page.getByLabel('Technique').fill('woodcut');
  await page.getByLabel('Subject or keyword').fill('mountains'); await page.getByLabel('Maximum artworks').fill('8');
  const publishing = page.waitForResponse(response => response.url().endsWith('/api/gallery/build'));
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  const response = await publishing; expect(response.status()).toBe(200);
  const data = await response.json(); expect(data.catalog.source.filters).toMatchObject({ types: ['Prints'], artistId: 27651, culture: 'Japanese', fromYear: 1800, toYear: 1899, medium: 'watercolor', technique: 'woodcut', keyword: 'mountains', limit: 8 });
  await expect(page.getByText('Your gallery is ready: 8 artworks.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build a gallery', exact: true })).toBeFocused();
  await page.reload(); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 1 — Claude Monet');
  const saved = await (await page.request.get('/gallery.json')).json(); expect(saved.records).toHaveLength(8);
  expect(JSON.stringify(saved)).not.toContain('browser-test-only');
});
test('creates, reloads, updates and deletes a named preset', async ({ page }) => {
  await builder(page); await page.getByLabel('Named preset').selectOption('japanese');
  await expect(page.getByLabel('From year')).toHaveValue('1800');
  await page.getByLabel('Preset name').fill('My Japanese prints'); await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByText('Saved “My Japanese prints”.')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Start viewing' }).click(); await builder(page);
  await page.getByLabel('Named preset').selectOption({ label: 'My Japanese prints' });
  await page.getByLabel('Maximum artworks').fill('12'); await page.getByLabel('Preset name').fill('My print collection');
  await page.getByRole('button', { name: 'Update preset' }).click(); await expect(page.getByText('Saved “My print collection”.')).toBeVisible();
  await page.getByRole('button', { name: 'Delete preset' }).click();
  await expect(page.getByText('Preset deleted. Your current gallery is unchanged.')).toBeVisible();
  await expect(page.getByRole('option', { name: 'My print collection' })).toHaveCount(0);
});
test('thumbnail browsing includes later pages, searching and direct playback selection', async ({ page }) => {
  await build(page, 35); await page.getByRole('button', { name: 'Browse artwork', exact: true }).click();
  await expect(page.getByRole('button', { name: /^View Discovered artwork/ })).toHaveCount(24);
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByLabel('Search this gallery').fill('no matching work'); await expect(page.getByText(/No artworks match/)).toBeVisible();
  await page.getByLabel('Search this gallery').fill('Discovered artwork 35');
  await page.getByRole('button', { name: 'View Discovered artwork 35', exact: true }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 35 — Claude Monet');
  await expect(page.getByRole('button', { name: 'Browse artwork', exact: true })).toBeFocused();
});
test('shuffle completes each pass without repeats and Previous follows history', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await build(page, 5);
  const visited = [];
  for (let index = 0; index < 10; index++) {
    const current = await page.getByRole('img').getAttribute('alt'); visited.push(current);
    await page.getByRole('button', { name: 'Next artwork' }).click();
    await expect(page.getByRole('img')).not.toHaveAttribute('alt', current);
  }
  expect(new Set(visited.slice(0, 5)).size).toBe(5); expect(new Set(visited.slice(5)).size).toBe(5);
  const forward = await page.getByRole('img').getAttribute('alt');
  await page.getByRole('button', { name: 'Previous artwork' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', visited[9]);
  await page.getByRole('button', { name: 'Next artwork' }).click(); await expect(page.getByRole('img')).toHaveAttribute('alt', forward);
});
test('empty searches and provider failures preserve the previous gallery and recover', async ({ page }) => {
  await build(page, 5);
  for (const keyword of ['NO_RESULTS', 'FAIL_PROVIDER']) {
    await builder(page); await page.getByLabel('Subject or keyword').fill(keyword);
    await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('unchanged');
    await page.getByRole('button', { name: 'Close Build a gallery' }).click();
    await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 1 — Claude Monet');
  }
  await page.reload(); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 1 — Claude Monet');
  await build(page, 6); await expect(page.getByText('Your gallery is ready: 6 artworks.')).toBeVisible();
});
test('cancels slow searches and keeps playback available', async ({ page }) => {
  await build(page, 5); await builder(page); await page.getByLabel('Subject or keyword').fill('SLOW_PROVIDER');
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  await expect(page.getByText('Finding artwork and saving your gallery…')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel request' }).click();
  await expect(page.getByText(/Request cancelled/)).toBeVisible();
  await page.getByRole('button', { name: 'Close Build a gallery' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Discovered artwork 1 — Claude Monet');
});
test('builder and thumbnails remain accessible and fit mobile screens', async ({ page }, testInfo) => {
  await builder(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.getByRole('dialog').boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`builder-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Close Build a gallery' }).click();
  await page.getByRole('button', { name: 'Browse artwork', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('thumbnail-mobile.png') });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Browse artwork', exact: true })).toBeFocused();
});
