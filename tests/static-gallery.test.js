import { beforeEach, expect, it, vi } from 'vitest';
import { createStaticGalleryService, filterCatalog } from '../src/data/static-gallery.js';
import { defaultFilters, starterPresets } from '../src/data/gallery-filters.js';

const painting = { objectid: 1, title: 'Garden', classification: 'Paintings', culture: 'French', medium: 'Oil on canvas', technique: 'Painting', datebegin: 1880, dateend: 1890, primaryimageurl: 'https://images.example.test/1.jpg', people: [{ personid: 27651, role: 'Artist', displayname: 'Claude Monet' }], searchTags: ['landscape'] };
const print = { ...painting, objectid: 2, title: 'Mountains', classification: 'Prints', culture: 'Japanese', medium: 'Ink', technique: 'Woodcut', primaryimageurl: 'https://images.example.test/2.jpg', people: [{ personid: 2, role: 'Artist', name: 'A printmaker' }], searchTags: [] };
const data = { schemaVersion: 1, refreshedAt: '2026-11-08', records: [painting, print] };
let storage, service, fetchImpl;
const key = 'pretty-pictures:/pretty-pictures/:';
beforeEach(() => {
  const values = new Map();
  storage = { getItem: name => values.get(name) ?? null, setItem: (name, value) => values.set(name, value) };
  fetchImpl = vi.fn(async () => ({ ok: true, json: async () => data }));
  service = createStaticGalleryService({ base: '/pretty-pictures/', storage: () => storage, fetchImpl, random: () => 0 });
});
it('loads and caches a validated discovery catalog under the project base path', async () => {
  fetchImpl.mockResolvedValueOnce({ ok: true, json: async () => ({ ...data, records: [null, {}, ...data.records, painting, { ...painting, objectid: 3 }] }) });
  const config = await service.request('config');
  expect(config).toMatchObject({ configured: true, mode: 'catalog', count: 2, types: ['Paintings', 'Prints'] });
  expect(config.presets).toEqual(starterPresets);
  expect(fetchImpl.mock.calls[0][0]).toBe('/pretty-pictures/discovery.json');
  await service.request('types'); expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it('combines types, artist identity, dates, materials and literal keywords', () => {
  expect(filterCatalog(data.records, { ...defaultFilters, artistId: 27651, culture: 'french', fromYear: 1885, toYear: 1900, medium: 'oil', technique: 'painting', keyword: 'LANDSCAPE garden' })).toEqual([painting]);
  expect(filterCatalog(data.records, { ...defaultFilters, types: [], keyword: 'mountains' })).toEqual([print]);
  for (const patch of [{ artistId: 2 }, { fromYear: 1900 }, { toYear: 1800 }, { keyword: '* OR *' }]) expect(filterCatalog([painting], { ...defaultFilters, ...patch })).toEqual([]);
  for (const dates of [{ datebegin: null }, { dateend: 0 }]) expect(filterCatalog([{ ...painting, ...dates }], { ...defaultFilters, fromYear: 1800 })).toEqual([]);
  expect(filterCatalog([{ ...painting, people: null, searchTags: null }], defaultFilters)).toHaveLength(1);
});
it('finds only creators represented in the catalog and validates search input', async () => {
  const response = await service.request('artists?q=Monet');
  expect(response.artists).toEqual([{ id: 27651, name: 'Claude Monet', dates: '', culture: '' }]);
  expect((await service.request('artists?q=printmaker')).artists[0].id).toBe(2);
  expect((await service.request('artists?q=unrepresented')).artists).toEqual([]);
  for (const query of ['', 'x', 'x'.repeat(121), 'ab%0A']) await expect(service.request('artists?q=' + query)).rejects.toThrow(/Enter between/);
});
it('builds a randomized selection, saves IDs only, and restores its order across sessions', async () => {
  const built = await service.request('build', { method: 'POST', body: { ...defaultFilters, types: [], limit: 2 } });
  expect(built.catalog.records.map(record => record.objectid)).toEqual([2, 1]);
  expect(built.summary).toMatchObject({ saved: true, returned: 2, matched: 2 });
  expect(JSON.parse(storage.getItem(key + 'gallery'))).toEqual({ ids: [2, 1] });
  const next = createStaticGalleryService({ base: '/pretty-pictures/', storage: () => storage, fetchImpl });
  expect((await next.restore()).records.map(record => record.objectid)).toEqual([2, 1]);
  await expect(service.request('build', { method: 'POST', body: { ...defaultFilters, keyword: 'nonexistent' } })).rejects.toThrow(/unchanged/);
  expect((await next.restore()).records.map(record => record.objectid)).toEqual([2, 1]);
});
it('handles stale and malformed saved IDs without breaking the starter gallery', async () => {
  for (const value of ['broken', '{}', '{"ids":[]}', JSON.stringify({ ids: Array(501).fill(1) }), '{"ids":[999]}']) {
    storage.setItem(key + 'gallery', value); expect(await service.restore()).toBeNull();
  }
  storage.setItem(key + 'gallery', '{"ids":[2,2,999]}'); expect((await service.restore()).records).toEqual([print]);
});
it('supports preset create, update, delete and reload while preserving starter presets', async () => {
  const created = await service.request('presets', { method: 'POST', body: { name: 'My art', filters: defaultFilters } });
  const id = created.preset.id;
  expect((await service.request('config')).presets).toHaveLength(6);
  const updated = await service.request('presets', { method: 'POST', body: { id, name: 'My prints', filters: { ...defaultFilters, types: ['Prints'] } } });
  expect(updated.preset.id).toBe(id);
  expect((await service.request('presets/' + id, { method: 'DELETE' })).presets).toHaveLength(5);
  await expect(service.request('presets/paintings', { method: 'DELETE' })).rejects.toThrow(/not found/);
});
it.each([null, {}, { name: '' }, { name: 'x'.repeat(61) }, { name: 'a\nb' }, { name: 'Painting discoveries' }, { name: 'Name', id: 'missing' }, { name: 'Name', filters: { limit: 0 } }])('rejects invalid preset saves %j', async body => {
  await expect(service.request('presets', { method: 'POST', body })).rejects.toThrow();
});
it('recovers from corrupted presets and enforces the preset count', async () => {
  for (const value of ['{bad', '{}', '[null]', '[{"id":"paintings","name":"Overwritten"}]']) {
    storage.setItem(key + 'presets', value); expect((await service.request('config')).presets).toHaveLength(5);
  }
  storage.setItem(key + 'presets', JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Name ${i}`, filters: defaultFilters }))));
  await expect(service.request('presets', { method: 'POST', body: { name: 'Extra' } })).rejects.toThrow(/up to 30/);
});
it('keeps gallery filtering available when browser persistence is blocked', async () => {
  const blocked = createStaticGalleryService({ fetchImpl, storage: () => { throw new Error('denied'); } });
  expect(await blocked.restore()).toBeNull();
  expect((await blocked.request('build', { method: 'POST', body: defaultFilters })).summary.saved).toBe(false);
  await expect(blocked.request('presets', { method: 'POST', body: { name: 'My art' } })).rejects.toThrow(/storage is unavailable/);
});
it('rejects bad catalogs, unknown actions, and cancelled requests', async () => {
  for (const payload of [{ ok: false }, { ok: true, json: async () => ({ schemaVersion: 2 }) }, { ok: true, json: async () => ({ schemaVersion: 1, records: [] }) }]) {
    fetchImpl.mockResolvedValueOnce(payload); await expect(service.request('config')).rejects.toThrow();
  }
  await expect(service.request('unknown')).rejects.toThrow(/not found/);
  const controller = new AbortController(); controller.abort(); await expect(service.request('config', { signal: controller.signal })).rejects.toThrow();
});
