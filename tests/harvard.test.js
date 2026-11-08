// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { buildGallery, findArtists, harvardClient, harvardQuery, creatorRole } from '../server/harvard.mjs';
import { defaultFilters, validateFilters } from '../src/data/gallery-filters.js';

const record = (id, extra = {}) => ({ objectid: id, primaryimageurl: `https://images.example.test/${id}.jpg`, title: `Artwork ${id}`, ...extra });
const page = (records, current = 1, pages = 1, totalrecords = records.length) => ({ records, info: { page: current, pages, totalrecords } });
it('builds controlled combined filters, stable random pages, and escaped literal terms', () => {
  const filters = validateFilters({ types: ['Prints', 'Drawings'], artistId: 42, artistName: 'An artist', culture: 'Japanese', fromYear: 1800, toYear: 1899, medium: 'ink "red" OR *', technique: 'woodcut', keyword: 'mountains', limit: 25 });
  const query = harvardQuery(filters, 123, 2);
  expect(Object.fromEntries(query)).toMatchObject({ classification: 'Prints|Drawings', person: '42', sort: 'random:123', page: '2', technique: 'woodcut', keyword: 'mountains', hasimage: '1' });
  expect(query.get('q')).toContain('culture:"Japanese"');
  expect(query.get('q')).toContain('medium:"ink \\"red\\" OR \\*"');
  expect(query.get('q')).toContain('datebegin:[* TO 1899] AND dateend:[1800 TO *]');
  expect(query.has('apikey')).toBe(false);
  expect(harvardQuery({ ...defaultFilters, types: [], fromYear: -200 }, 1).get('q')).toContain('dateend:[-200 TO *]');
  expect(harvardQuery({ ...defaultFilters, toYear: 1900 }, 1).get('q')).toContain('dateend:[* TO *]');
  expect(harvardQuery(defaultFilters, 1).has('q')).toBe(false);
});
it('reads only fixed Harvard endpoints with a key, abort signal, and no redirects', async () => {
  const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => page([]) });
  const request = harvardClient({ apiKey: 'test-private-key', fetchImpl });
  await request('object', { page: '1' });
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url.origin).toBe('https://api.harvardartmuseums.org'); expect(url.searchParams.get('apikey')).toBe('test-private-key');
  expect(options).toEqual({ credentials: 'omit', redirect: 'error', signal: expect.any(AbortSignal) });
});
it.each([{ ok: false }, { ok: true, json: async () => ({ error: 'private-key' }) }, { ok: true, json: async () => { throw new SyntaxError('private-key'); } }, { ok: true, json: async () => ({ records: [], info: { totalrecords: -1 } }) }])('redacts malformed or failed provider responses', async reply => {
  await expect(harvardClient({ apiKey: 'private-key', fetchImpl: async () => reply })('object', {})).rejects.toThrow('Harvard could not complete');
});
it('handles absent keys, aborted work and network failures', async () => {
  await expect(harvardClient({})('object', {})).rejects.toThrow(/not configured/);
  const controller = new AbortController(); controller.abort();
  await expect(harvardClient({ apiKey: 'key', fetchImpl: async () => { throw new Error('private'); } })('object', {}, controller.signal)).rejects.toThrow(/cancelled/);
  await expect(harvardClient({ apiKey: 'key', fetchImpl: async () => { throw new Error('private'); } })('object', {})).rejects.toThrow(/Harvard could not complete/);
});
it('resolves artists to IDs and excludes non-creator roles and malformed results', async () => {
  const request = vi.fn().mockResolvedValue(page([
    null, {}, { id: 3, displayname: 'Owner', roles: [{ role: 'Owner' }] }, { id: 4, displayname: 'Unknown', roles: {} },
    { personid: 42, displayname: 'Claude Monet', roles: [{ role: 'Artist' }], displaydate: '1840–1926', culture: 'French' },
    { id: 42, displayname: 'Claude Monet', roles: [{ role: 'Artist' }] },
    { id: 43, displayname: 'Maker', roles: [{ role: 'Maker' }, null] },
  ]));
  expect(await findArtists(request, 'Monet')).toEqual([{ id: 42, name: 'Claude Monet', dates: '', culture: '' }, { id: 43, name: 'Maker', dates: '', culture: '' }]);
  expect(request.mock.calls[0][1].q).toBe('displayname:"Monet"');
  expect(creatorRole('Photographer')).toBe(true); expect(creatorRole()).toBe(false);
});
it.each([null, 'x', 'x'.repeat(121), 'hi\nthere'])('validates artist searches %j', term => expect(findArtists(vi.fn(), term)).rejects.toThrow(/Enter between/));
it('paginates, deduplicates both IDs and images, and preserves metadata', async () => {
  const request = vi.fn().mockResolvedValueOnce(page([null, record(1), record(1), record(2, { primaryimageurl: 'https://images.example.test/1.jpg' })], 1, 2, 6))
    .mockResolvedValueOnce(page([record(3, { classification: 'Prints', culture: 'Japanese', medium: 'Ink', datebegin: 1800, dateend: 1850 }), record(4)], 2, 2, 6));
  const result = await buildGallery(request, { ...defaultFilters, limit: 2 }, { seed: 99 });
  expect(result.catalog.records.map(item => item.objectid)).toEqual([1, 3]);
  expect(result.catalog.records[1]).toMatchObject({ classification: 'Prints', culture: 'Japanese', datebegin: 1800 });
  expect(result.summary).toMatchObject({ returned: 2, skipped: 1, duplicates: 2, pages: 2, matched: 6, truncated: false });
  expect(request.mock.calls.map(call => call[1].get('sort'))).toEqual(['random:99', 'random:99']);
});
it('matches the selected person in a creator role, never just a related name', async () => {
  const request = vi.fn().mockResolvedValue(page([
    record(1, { people: [{ personid: 42, role: 'Owner' }] }), record(2), record(3, { people: {} }),
    record(4, { people: [{ personid: 43, role: 'Artist' }] }),
    record(5, { people: [null, { personid: 42, role: 'Artist after', name: 'After Monet' }] }),
  ]));
  const result = await buildGallery(request, { ...defaultFilters, artistId: 42 });
  expect(result.catalog.records.map(item => item.objectid)).toEqual([5]); expect(result.summary.skipped).toBe(4);
});
it('reports empty results, malformed pagination, page limits and cancellation', async () => {
  await expect(buildGallery(async () => page([], 1, 0), defaultFilters)).rejects.toThrow(/No viewable artwork/);
  await expect(buildGallery(async () => page([record(1)], 2), defaultFilters)).rejects.toThrow(/incomplete/);
  const limited = await buildGallery(async () => page([record(1)], 1, 3, 300), defaultFilters, { maxPages: 1 });
  expect(limited.summary.truncated).toBe(true);
  const controller = new AbortController(); controller.abort();
  await expect(buildGallery(vi.fn(), defaultFilters, { signal: controller.signal })).rejects.toThrow();
  const late = new AbortController();
  await expect(buildGallery(async () => { late.abort(); return page([record(1)]); }, defaultFilters, { signal: late.signal })).rejects.toThrow();
});
