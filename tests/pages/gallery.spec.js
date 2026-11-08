import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  page.__errors = []; page.__requests = [];
  page.on('pageerror', error => page.__errors.push(error.message));
  page.on('request', request => { page.__requests.push(request.url()); expect(request.method()).toBe('GET'); });
  await page.route('**/*', route => {
    const request = route.request();
    if (new URL(request.url()).hostname === '127.0.0.1') return route.continue();
    if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="600"><rect width="500" height="600" fill="#768a97"/></svg>' });
    return route.abort();
  });
  await page.goto('./'); await page.getByRole('button', { name: 'Start viewing' }).click();
});
test.afterEach(async ({ page }) => {
  expect(page.__errors).toEqual([]);
  expect(page.__requests.some(url => /api\/gallery|api\.harvardartmuseums|apikey|firebaseio/.test(url))).toBe(false);
  expect(page.__requests.filter(url => new URL(url).hostname === '127.0.0.1').every(url => new URL(url).pathname.startsWith('/pretty-pictures/'))).toBe(true);
});
async function builder(page) {
  await page.getByRole('button', { name: 'Build a gallery', exact: true }).click();
  await expect(page.getByText(/artworks in the published Harvard collection/)).toBeVisible();
}
async function build(page, preset = 'japanese', limit = 8) {
  await builder(page); await page.getByLabel('Named preset').selectOption(preset);
  await page.getByLabel('Maximum artworks').fill(String(limit));
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(`Your gallery is ready: ${limit} artworks.`)).toBeVisible();
}
test('works at the repository URL, filters the real catalog, and restores a selection', async ({ page }) => {
  await expect(page.getByRole('img')).toBeVisible(); await build(page);
  const first = await page.getByRole('img').getAttribute('alt');
  await page.getByRole('button', { name: 'Artwork details' }).click();
  await expect(page.getByRole('dialog')).toContainText('Prints'); await expect(page.getByRole('dialog')).toContainText('Japanese');
  await expect(page.getByRole('link', { name: 'View at Harvard Art Museums' })).toHaveAttribute('href', /harvardartmuseums.org\/collections\/object/);
  await page.reload(); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', first);
});
test('all five starter presets find available works in the published catalog', async ({ page }) => {
  for (const preset of ['paintings', 'landscapes', 'japanese', 'watercolors', 'photography']) await build(page, preset, 5);
});
test('finds an exact artist and combines material and date filters', async ({ page }) => {
  await builder(page); await page.getByLabel('Find an artist').fill('Claude Monet');
  await page.getByRole('button', { name: 'Find artist', exact: true }).click();
  await page.getByRole('button', { name: 'Claude Monet', exact: true }).click();
  await page.getByLabel('Culture', { exact: true }).fill('French'); await page.getByLabel('Medium', { exact: true }).fill('oil');
  await page.getByLabel('From year').fill('1800'); await page.getByLabel('To year').fill('1926'); await page.getByLabel('Maximum artworks').fill('5');
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('img')).toHaveAttribute('alt', /Claude Monet/);
});
test('saves, reloads, updates, and deletes browser presets', async ({ page }) => {
  await builder(page); await page.getByLabel('Named preset').selectOption('watercolors'); await page.getByLabel('Preset name').fill('My watercolors');
  await page.getByRole('button', { name: 'Save preset' }).click(); await expect(page.getByText('Saved “My watercolors”.')).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Start viewing' }).click(); await builder(page);
  await page.getByLabel('Named preset').selectOption({ label: 'My watercolors' }); await expect(page.getByLabel('Medium', { exact: true })).toHaveValue('watercolor');
  await page.getByLabel('Preset name').fill('Watercolors to revisit'); await page.getByRole('button', { name: 'Update preset' }).click();
  await expect(page.getByText('Saved “Watercolors to revisit”.')).toBeVisible(); await page.getByRole('button', { name: 'Delete preset' }).click();
  await expect(page.getByRole('option', { name: 'Watercolors to revisit' })).toHaveCount(0);
});
test('browses and selects later thumbnails and shuffles without repeats', async ({ page }) => {
  await build(page, 'japanese', 30); await page.getByRole('button', { name: 'Browse artwork', exact: true }).click();
  await page.getByRole('button', { name: 'Next page' }).click(); await expect(page.getByText('Page 2 of 2')).toBeVisible();
  const thumbnail = page.locator('.thumbnail').last(), title = await thumbnail.getAttribute('aria-label');
  await thumbnail.click(); await expect(page.getByRole('img')).toHaveAttribute('alt', new RegExp(title.slice(5).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await build(page, 'paintings', 5);
  const seen = [];
  for (let index = 0; index < 5; index++) {
    const current = await page.getByRole('img').getAttribute('alt'); seen.push(current);
    await page.getByRole('button', { name: 'Next artwork' }).click(); await expect(page.getByRole('img')).not.toHaveAttribute('alt', current);
  }
  expect(new Set(seen).size).toBe(5);
});
test('empty filters preserve the current gallery and browser storage failures remain usable', async ({ page }) => {
  await build(page, 'paintings', 5); const previous = await page.getByRole('img').getAttribute('alt');
  await builder(page); await page.getByLabel('Subject or keyword').fill('impossible-collection-result-999');
  await page.getByRole('button', { name: 'Build gallery', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('unchanged');
  await page.getByRole('button', { name: 'Close Build a gallery' }).click(); await expect(page.getByRole('img')).toHaveAttribute('alt', previous);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('storage blocked'); }; });
  await builder(page); await page.getByLabel('Maximum artworks').fill('4'); await page.getByRole('button', { name: 'Build gallery', exact: true }).click();
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible(); await expect(page.getByRole('img')).toBeVisible();
});
test('published filters and thumbnails are accessible on mobile and desktop', async ({ page }, testInfo) => {
  await builder(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('pages-builder.png') });
  await page.getByRole('button', { name: 'Close Build a gallery' }).click(); await page.getByRole('button', { name: 'Browse artwork', exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
});
