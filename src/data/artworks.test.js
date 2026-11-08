import { describe, expect, it, vi } from 'vitest';
import { imageUrl, thumbnailUrl, loadArtworks, normalizeArtwork, normalizeCollection } from './artworks.js';
import { records, response } from '../../tests/fixtures.js';

describe('untrusted gallery data', () => {
  it.each([null, '', 5, 'javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/image', '/\\example.com/image', 'https://name:pass@example.com/img', 'not a url'])('rejects unsafe image URL %j', value => expect(imageUrl(value)).toBeNull());
  it('upgrades HTTP and retains local root paths', () => {
    expect(imageUrl('http://example.com/art.jpg')).toBe('https://example.com/art.jpg');
    expect(imageUrl('/art.jpg')).toBe('/art.jpg');
  });
  it('requests small Harvard IIIF thumbnails and preserves other image providers', () => {
    for (const value of ['https://nrs.harvard.edu/urn-3:HUAM:123_dynmc', 'https://nrs.harvard.edu/urn-3:HUAM:123_dynmc/full/!1600,1600/0/default.jpg']) expect(thumbnailUrl(value)).toBe('https://nrs.harvard.edu/urn-3:HUAM:123_dynmc/full/!320,320/0/default.jpg');
    for (const value of ['/local.jpg', 'https://images.example.test/art.jpg', 'https://nrs.harvard.edu/unknown.jpg']) expect(thumbnailUrl(value)).toBe(value);
    expect(thumbnailUrl('javascript:alert(1)')).toBeNull();
  });
  it('only links to valid Harvard museum object pages', () => {
    const url = 'https://harvardartmuseums.org/collections/object/42';
    expect(normalizeArtwork({ ...records[0], url }).museumUrl).toBe(url);
    for (const invalid of ['javascript:alert(1)', 'https://other.example/42', 'https://harvardartmuseums.org/collections/object/42?bad=true']) expect(normalizeArtwork({ ...records[0], url: invalid }).museumUrl).toBe('');
  });
  it('loads Firebase arrays and sparse keyed collections without a separate count', () => {
    expect(normalizeCollection([records[0], null, records[2]])).toHaveLength(2);
    expect(normalizeCollection({ 3: records[0], 12: records[2], broken: {} }).map(x => x.title)).toEqual(['Artwork 0', 'Artwork 2']);
  });
  it('reads the versioned JSON catalog and rejects unsupported envelopes', () => {
    expect(normalizeCollection({ schemaVersion: 1, refreshedAt: 'today', records }).map(x => x.id)).toEqual(['0', '1', '2']);
    expect(normalizeCollection({ schemaVersion: 2, records })).toEqual([]);
    expect(normalizeCollection({ schemaVersion: 1, records: {} })).toEqual([]);
  });
  it.each([null, 3, 'invalid', {}, [], [null, [], {}, true]])('handles empty/malformed collections %j', value => expect(normalizeCollection(value)).toEqual([]));
  it('uses creators, preserves attribution and never substitutes provenance', () => {
    expect(normalizeArtwork(records[0]).artist).toBe('Artist 0');
    expect(normalizeArtwork({ ...records[0], people: null }).artist).toBe('Artist unknown');
    expect(normalizeArtwork({ ...records[0], people: [null, { role: 'Owner', name: 'Owner' }, { role: 'Collector', name: 'Collector' }, { displayname: 'After Artist', name: 'Artist' }, { name: 'After Artist' }, {}] }).artist).toBe('After Artist');
  });
  it('normalizes missing text and base IIIF images', () => {
    const image = normalizeArtwork({ baseimageurl: 'https://images.example.test/iiif/item/', title: ' ', dated: 4 });
    expect(image).toMatchObject({ url: 'https://images.example.test/iiif/item/full/!1600,1600/0/default.jpg', title: 'Untitled artwork', artist: 'Artist unknown', dated: 'Date unknown', credit: 'Credit not provided' });
  });
  it('preserves metadata as text for React to escape', () => {
    const title = '<img src=x onerror="window.pwned=1">';
    expect(normalizeArtwork({ ...records[0], title }).title).toBe(title);
  });
});

describe('gallery requests', () => {
  it('reads only the image collection without credentials', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(records));
    expect(await loadArtworks('/gallery.json', { fetchImpl })).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith('/gallery.json', { signal: expect.any(AbortSignal), credentials: 'omit', cache: 'no-cache' });
  });
  it.each([
    [{ ok: false }, /could not be loaded/],
    [response(null), /No viewable artwork/],
    [{ ok: true, json: async () => { throw new SyntaxError(); } }, /invalid data/],
  ])('reports unusable responses', async (data, message) => {
    await expect(loadArtworks('/gallery.json', { fetchImpl: async () => data })).rejects.toThrow(message);
  });
  it('reports connection errors', async () => {
    await expect(loadArtworks('/gallery.json', { fetchImpl: async () => { throw new TypeError('network'); } })).rejects.toThrow(/Unable to connect/);
  });
  const pendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new DOMException('aborted', 'AbortError'));
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  it('aborts a stalled response and clears its timeout', async () => {
    vi.useFakeTimers();
    const task = loadArtworks('/gallery.json', { fetchImpl: pendingFetch, timeoutMs: 100 });
    const check = expect(task).rejects.toThrow(/took too long/);
    await vi.advanceTimersByTimeAsync(100);
    await check;
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each([true, false])('honors cancellation before or after fetching: %s', async alreadyAborted => {
    vi.useFakeTimers();
    const controller = new AbortController();
    if (alreadyAborted) controller.abort();
    const task = loadArtworks('/gallery.json', { signal: controller.signal, fetchImpl: pendingFetch });
    const check = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await check;
    expect(vi.getTimerCount()).toBe(0);
  });
});
