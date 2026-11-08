import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { records } from '../fixtures.js';
import { normalizeCollection } from '../../src/data/artworks.js';

const shippedCatalog = JSON.parse(readFileSync(new URL('../../public/gallery.json', import.meta.url), 'utf8'));

async function fixture(page, payload = records) {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route('**/gallery.json', route => route.fulfill({ json: payload }));
  await page.route('https://images.example.test/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#697c83"/><circle cx="600" cy="400" r="200" fill="#c7ae7b"/></svg>',
  }));
}
async function open(page, payload = records) {
  await fixture(page, payload);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  if (Array.isArray(payload) && payload.length) await expect(page.getByRole('img')).toBeVisible();
}
async function sequential(page, seconds) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Randomize images' }).uncheck();
  if (seconds) await page.getByRole('slider').fill(String(seconds));
  await page.getByRole('button', { name: 'Close Settings' }).click();
}
async function ready(page) { await expect(page.getByText('Loading image…', { exact: true })).toHaveCount(0); }
async function clock(page) { await page.clock.install({ time: new Date(0) }); await page.clock.pauseAt(new Date(1000)); }

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { expect(request.method()).toBe('GET'); });
  page.__applicationErrors = errors;
});
test.afterEach(async ({ page }) => expect(page.__applicationErrors).toEqual([]));

test('the production build loads its real local catalog without Firebase or a Harvard API key', async ({ page, request }) => {
  const response = await request.get('/gallery.json');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual(shippedCatalog);
  const images = normalizeCollection(shippedCatalog);
  test.setTimeout(Math.max(30000, images.length * 1500));
  const requested = [];
  page.on('request', request => requested.push(request.url()));
  // Keep this regression deterministic: serve the actual catalog and mock only remote image bytes.
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  for (const image of images) await page.route(image.url, route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#697c83"/></svg>' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Start viewing' }).click();
  await sequential(page);
  for (const image of images) {
    await expect(page.getByRole('img')).toHaveAttribute('alt', `${image.title} — ${image.artist}`);
    await ready(page);
    await page.getByRole('button', { name: 'Artwork details', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(image.credit);
    await page.getByRole('button', { name: 'Close Artwork details' }).click();
    await page.getByRole('button', { name: 'Next artwork' }).click();
  }
  await expect(page.getByRole('img')).toHaveAttribute('alt', `${images[0].title} — ${images[0].artist}`);
  expect(requested.some(url => /firebaseio|api\.harvardartmuseums|apikey/i.test(url))).toBe(false);
});

test('sequential navigation includes last image, wraps, and keeps details synchronized', async ({ page }) => {
  await open(page); await sequential(page);
  for (const index of [1, 2, 0]) {
    await page.getByRole('button', { name: 'Next artwork' }).click();
    await expect(page.getByRole('img')).toHaveAttribute('alt', `Artwork ${index} — Artist ${index}`);
  }
  await page.getByRole('button', { name: 'Previous artwork' }).click();
  await page.getByRole('button', { name: 'Artwork details', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Artwork 2');
  await expect(page.getByRole('dialog')).toContainText('Artist 2');
  await expect(page.getByRole('dialog')).not.toContainText('Previous owner');
});
test('random mode can select the last image', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.999999; });
  await open(page);
  await page.getByRole('button', { name: 'Next artwork' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 2 — Artist 2');
});
test('new timer, manual reset, pause/resume and dialog suspension', async ({ page }) => {
  await clock(page); await open(page);
  await page.evaluate(() => {
    const schedule = window.setTimeout;
    window.__playbackTimers = [];
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 5000) window.__playbackTimers.push({ delay, at: Date.now() });
      return schedule(callback, delay, ...args);
    };
  });
  const timerCount = () => page.evaluate(() => window.__playbackTimers.length);
  await sequential(page, 5); await ready(page);
  // A committed image can precede React's passive timer effect. Wait for actual scheduling before advancing a frozen clock.
  await expect.poll(timerCount).toBe(1);
  await page.clock.runFor(4999);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
  await page.clock.runFor(1);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 1 — Artist 1'); await ready(page);
  await expect.poll(timerCount).toBe(2);
  await page.clock.runFor(4000);
  await page.getByRole('button', { name: 'Next artwork' }).click();
  // Observe the new image before waiting for its load; the old image may still be ready immediately after a click.
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 2 — Artist 2');
  await ready(page);
  await expect.poll(timerCount).toBe(3);
  await page.clock.runFor(4999);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 2 — Artist 2');
  await page.clock.runFor(1);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0'); await ready(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.clock.runFor(60000);
  const scheduledBeforeClose = await timerCount();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect.poll(timerCount).toBeGreaterThan(scheduledBeforeClose);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
  await page.clock.runFor(5000);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 1 — Artist 1');
});
test('keyboard can dismiss the splash, operate settings, and restore focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard focus order is tested in desktop browsers.');
  await fixture(page); await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('slider')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('slider')).toHaveValue('61');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'View sample artwork' })).toBeFocused();
  await page.keyboard.press('Tab');
  // Native dialogs keep focus inside; body may briefly receive the wrap sentinel.
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
});
test('offline fallback uses all five real bundled images', async ({ page }, testInfo) => {
  await fixture(page);
  await page.route('**/gallery.json', route => route.fulfill({ status: 503, json: { error: 'Catalog unavailable' } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Start viewing' }).click();
  await page.getByRole('button', { name: 'View sample artwork' }).click();
  await sequential(page);
  for (let index = 1; index <= 5; index++) {
    await expect(page.getByRole('img')).toHaveAttribute('alt', `Sample artwork ${index} — Artist unknown`);
    await ready(page);
    expect(await page.getByRole('img').evaluate(image => image.naturalWidth > 0)).toBe(true);
    if (index === 2) await page.screenshot({ path: testInfo.outputPath('real-artwork.png') });
    await page.getByRole('button', { name: 'Next artwork' }).click();
  }
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Sample artwork 1 — Artist unknown');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Return to catalog' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
test('metadata remains inert text in the production build', async ({ page }) => {
  const title = '<img src=x onerror="window.auditExecuted=true">';
  await open(page, [{ ...records[0], title, creditline: title }]);
  await page.getByRole('button', { name: 'Artwork details', exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(2);
  await expect(page.locator('dialog img')).toHaveCount(0);
  expect(await page.evaluate(() => window.auditExecuted)).toBeUndefined();
});
test('empty gallery recovers through retry', async ({ page }) => {
  await open(page, null);
  await expect(page.getByRole('alert')).toContainText('No viewable artwork');
  await expect(page.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  await page.route('**/gallery.json', route => route.fulfill({ json: records }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
});
test('request failures show a recoverable error', async ({ page }) => {
  await fixture(page);
  await page.route('**/gallery.json', route => route.fulfill({ status: 403, json: { error: 'Permission denied' } }));
  await page.goto('/'); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
test('a stalled request times out without a navigation crash', async ({ page }) => {
  await clock(page); await fixture(page);
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  await page.route('**/gallery.json', async route => { await stalled; await route.abort(); });
  await page.goto('/'); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  await page.clock.runFor(15001);
  await expect(page.getByRole('alert')).toContainText('took too long');
  release();
});
test('broken images are skipped and total failure can be retried', async ({ page }) => {
  await fixture(page);
  await page.route('https://images.example.test/**', route => route.abort());
  await page.goto('/'); await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByRole('alert')).toContainText('artwork images could not be loaded');
  await expect(page.getByRole('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
test('a stalled image is skipped after fifteen seconds', async ({ page }) => {
  await clock(page); await fixture(page);
  let release;
  const stalled = new Promise(resolve => { release = resolve; });
  await page.route('https://images.example.test/art-0.jpg', async route => { await stalled; await route.abort(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Start viewing' }).click();
  await expect(page.getByText('Loading image…', { exact: true })).toBeVisible();
  await page.clock.runFor(15001);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 1 — Artist 1');
  await ready(page);
  release();
});
test('single-image galleries have safe disabled navigation', async ({ page }) => {
  await clock(page); await open(page, [records[0]]); await ready(page);
  await expect(page.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous artwork' })).toBeDisabled();
  await page.clock.runFor(180000);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
});
test('reduced motion defaults to paused playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await clock(page); await open(page); await ready(page);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(120000);
  await expect(page.getByRole('img')).toHaveAttribute('alt', 'Artwork 0 — Artist 0');
});
test('dialogs and viewer pass accessibility scans', async ({ page }) => {
  await fixture(page); await page.goto('/');
  for (const state of ['welcome', 'viewer', 'settings', 'details']) {
    if (state === 'viewer') await page.getByRole('button', { name: 'Start viewing' }).click();
    if (state === 'settings') await page.getByRole('button', { name: 'Settings', exact: true }).click();
    if (state === 'details') {
      await page.getByRole('button', { name: 'Close Settings' }).click();
      await page.getByRole('button', { name: 'Artwork details', exact: true }).click();
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(result.violations, state).toEqual([]);
  }
});
test('responsive layouts retain readable text, targets and viewport bounds', async ({ page }, testInfo) => {
  await open(page);
  for (const width of [320, 390, 600, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const artworkBounds = await page.getByRole('img').boundingBox();
    const headerBounds = await page.locator('header').boundingBox();
    const footerBounds = await page.locator('footer').boundingBox();
    expect(artworkBounds.y).toBeGreaterThanOrEqual(headerBounds.y + headerBounds.height);
    expect(artworkBounds.y + artworkBounds.height).toBeLessThanOrEqual(footerBounds.y);
    const targets = await page.getByRole('button').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect(); return { width: rect.width, height: rect.height };
    }));
    expect(targets.every(rect => rect.width >= 44 && rect.height >= 44)).toBe(true);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    expect(await page.locator('.hint').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(15);
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('mobile-settings.png') });
    await page.getByRole('button', { name: 'Close Settings' }).click();
  }
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await page.addStyleTag({ content: '* { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.5 !important; } p { margin-bottom: 2em !important; }' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
