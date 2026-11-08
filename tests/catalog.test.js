// @vitest-environment node
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { atomicWrite, catalogRecord, manifestRecord, refreshCatalog, main, defaultOutput } from '../scripts/refresh-catalog.mjs';
import { loadArtworks, normalizeCollection } from '../src/data/artworks.js';
import { records as fixtures, response } from './fixtures.js';

const records = fixtures.map((record, index) => ({ ...record, objectid: index + 1 }));
const manifest = id => ({
  '@id': `https://iiif.harvardartmuseums.org/manifests/object/${id}`, label: `Harvard artwork ${id}`,
  metadata: [{ label: 'Date', value: '1888' }, { label: 'Credit Line', value: 'Harvard credit' }, { label: 'People', value: ['Artist: ? An artist', 'Collector: A collector'] }],
  license: 'Rights information',
  sequences: [{ canvases: [{ images: [{ resource: { service: { '@id': 'https://nrs.harvard.edu/urn-3:HUAM:123/' } } }] }] }],
});
let directory;
let output;
let previous;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pretty-pictures-catalog-'));
  output = join(directory, 'gallery.json');
  previous = JSON.stringify({ schemaVersion: 1, records });
  await writeFile(output, previous);
});
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
const apiPage = (page, pages, records) => response({ info: { page, pages, next: 'https://untrusted.example/?apikey=do-not-follow' }, records });
async function unchanged() {
  expect(await readFile(output, 'utf8')).toBe(previous);
  expect(await readdir(directory)).not.toContain('gallery.json.lock');
  expect((await readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([]);
}

it('ships a nonempty catalog with unique IDs and source credits compatible with the viewer', async () => {
  const catalog = JSON.parse(await readFile(defaultOutput, 'utf8'));
  expect(catalog.schemaVersion).toBe(1);
  expect(Number.isFinite(Date.parse(catalog.refreshedAt))).toBe(true);
  expect(catalog.records.length).toBeGreaterThan(1);
  expect(normalizeCollection(catalog)).toHaveLength(catalog.records.length);
  expect(new Set(catalog.records.map(record => record.objectid)).size).toBe(catalog.records.length);
  for (const record of catalog.records) expect(record.creditline).toContain('Harvard');
});
it('keeps attribution, uncertainty and rights, strips extra fields, and validates IDs', () => {
  expect(catalogRecord({ ...records[0], objectid: '001', apikey: 'secret', people: [null, {}, { name: ' Name ', role: 'Artist' }], copyright: ' Rights ' })).toMatchObject({ objectid: 1, copyright: 'Rights', people: [{ displayname: 'Name', role: 'Artist' }] });
  expect(catalogRecord({ ...records[0], apikey: 'secret' })).not.toHaveProperty('apikey');
  expect(catalogRecord({ ...records[0], objectid: 0 })).toBeNull();
  expect(catalogRecord({ ...records[0], objectid: null, id: 8, people: null }).objectid).toBe(8);
  expect(catalogRecord({ ...records[0], objectid: 'Infinity' })).toBeNull();
  expect(catalogRecord(null)).toBeNull();
});
it('maps public IIIF metadata with bounded image sizes and preserves uncertain attribution', () => {
  const record = manifestRecord(manifest(1), 1);
  expect(record).toMatchObject({ objectid: 1, dated: '1888', creditline: 'Harvard credit', copyright: 'Rights information' });
  expect(record.primaryimageurl).toBe('https://nrs.harvard.edu/urn-3:HUAM:123/full/!1600,1600/0/default.jpg');
  expect(normalizeCollection([record])[0].artist).toBe('? An artist');
});
it('handles sparse IIIF metadata and direct image URLs without guessing credits', () => {
  const data = manifest(1);
  data.metadata = [{ label: 'People', value: 'Anonymous' }];
  data.attribution = 'Harvard Art Museums';
  data.sequences[0].canvases[0].images[0].resource = { '@id': 'http://images.example.test/a.jpg' };
  expect(manifestRecord(data, 1)).toMatchObject({ primaryimageurl: 'https://images.example.test/a.jpg', people: [{ displayname: 'Anonymous', role: 'Artist' }], creditline: 'Harvard Art Museums' });
  data.metadata = null;
  expect(manifestRecord(data, 1).people).toEqual([]);
});
it.each([null, {}, { '@id': 'wrong', label: 'Wrong object' }])('rejects malformed or mismatched manifests %j', data => {
  expect(() => manifestRecord(data, 1)).toThrow(/Invalid Harvard manifest/);
});
it('rejects manifests without usable images', () => {
  const data = manifest(1);
  data.sequences[0].canvases[0].images[0].resource = { '@id': 'javascript:alert(1)' };
  expect(() => manifestRecord(data, 1)).toThrow(/No usable image/);
});
it('refreshes the current selection without a key and backs up the exact previous bytes', async () => {
  const fetchImpl = vi.fn(async url => response(manifest(Number(url.pathname.split('/').at(-1)))));
  const result = await refreshCatalog({ output, fetchImpl });
  expect(result).toMatchObject({ written: 3, skipped: 0, duplicates: 0, backup: true });
  expect(await readFile(`${output}.bak`, 'utf8')).toBe(previous);
  expect(normalizeCollection(JSON.parse(await readFile(output, 'utf8'))).map(record => record.id)).toEqual(['1', '2', '3']);
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  for (const [url, options] of fetchImpl.mock.calls) {
    expect(url.origin).toBe('https://iiif.harvardartmuseums.org');
    expect(url.search).toBe('');
    expect(options).toEqual({ signal: expect.any(AbortSignal), credentials: 'omit', redirect: 'error' });
  }
});
it('supports an explicit, deduplicated selection and recovers from an invalid existing catalog', async () => {
  await writeFile(output, 'not json');
  const result = await refreshCatalog({ output, ids: ' 1,1,2 ', fetchImpl: async url => response(manifest(Number(url.pathname.split('/').at(-1)))) });
  expect(result).toMatchObject({ written: 2, duplicates: 1 });
  expect(await readFile(`${output}.bak`, 'utf8')).toBe('not json');
});
it('can create the first catalog and refresh legacy arrays', async () => {
  await rm(output);
  const fetchImpl = async () => response(manifest(1));
  expect(await refreshCatalog({ output, ids: '1', fetchImpl })).toMatchObject({ written: 1, backup: false });
  await writeFile(output, JSON.stringify([records[0]]));
  expect(await refreshCatalog({ output, fetchImpl })).toMatchObject({ written: 1, backup: true });
});
it.each(['', 'x', '0', '-5', '1,,2'])('rejects invalid IIIF selections: %s', async ids => {
  if (ids === '') await rm(output);
  await expect(refreshCatalog({ output, ids, fetchImpl: vi.fn() })).rejects.toThrow(/Provide --ids/);
});
it('refuses an unbounded IIIF refresh', async () => {
  await expect(refreshCatalog({ output, ids: Array.from({ length: 1001 }, (_, i) => i + 1).join(',') })).rejects.toThrow(/at most 1000/);
  await unchanged();
});
it('preserves the catalog if any manifest in the selection fails', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(response(manifest(1))).mockResolvedValueOnce({ ok: false, status: 404 });
  await expect(refreshCatalog({ output, fetchImpl })).rejects.toThrow(/Harvard request failed/);
  await unchanged();
  expect(await readdir(directory)).not.toContain('gallery.json.bak');
});
it('discovers across pages, skips invalid records, deduplicates, and stops at the limit', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(apiPage(1, 3, [records[0], records[0], null]))
    .mockResolvedValueOnce(apiPage(2, 3, [records[1], records[2]]));
  const result = await refreshCatalog({ output, source: 'api', apiKey: 'test-key', limit: 2, fetchImpl });
  expect(result).toMatchObject({ written: 2, skipped: 1, duplicates: 1, pages: 2 });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(JSON.parse(await readFile(output, 'utf8')).records.map(record => record.objectid)).toEqual([1, 2]);
  for (const [index, [url, options]] of fetchImpl.mock.calls.entries()) {
    expect(url.origin + url.pathname).toBe('https://api.harvardartmuseums.org/object');
    expect(url.searchParams.get('page')).toBe(String(index + 1));
    expect(url.searchParams.get('sort')).toBe('objectid');
    expect(url.searchParams.get('sortorder')).toBe('asc');
    expect(url.searchParams.get('hasimage')).toBe('1');
    expect(url.searchParams.get('classification')).toBe('Paintings');
    expect(url.searchParams.get('apikey')).toBe('test-key');
    expect(options.redirect).toBe('error');
    expect(options.method).toBeUndefined();
  }
});
it('stops at the last available API page when fewer than the requested number exist', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(apiPage(1, 1, records));
  expect(await refreshCatalog({ output, source: 'api', apiKey: 'test-key', fetchImpl })).toMatchObject({ written: 3, pages: 1 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});
it('never replaces the current catalog with a partial API refresh', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(apiPage(1, 2, records)).mockRejectedValueOnce(new Error('secret-key in URL'));
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl })).rejects.toThrow(/^Harvard request failed/);
  await unchanged();
});
it.each([401, 429, 500])('preserves catalog and backup on Harvard HTTP %i', async status => {
  await writeFile(`${output}.bak`, 'older good catalog');
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl: async () => ({ ok: false, status }) })).rejects.toThrow(/Harvard request failed/);
  await unchanged();
  expect(await readFile(`${output}.bak`, 'utf8')).toBe('older good catalog');
});
it('redacts response body errors and timeout errors', async () => {
  for (const failure of [new SyntaxError('secret-key'), new DOMException('secret-key', 'TimeoutError')]) {
    await expect(refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl: async () => ({ ok: true, json: async () => { throw failure; } }) })).rejects.toThrow(/^Harvard request failed/);
    await unchanged();
  }
});
it('actually aborts a stalled Harvard request at the deadline', async () => {
  const deadline = new AbortController();
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  const fetchImpl = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')), { once: true });
    started();
  });
  const result = refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl });
  const check = expect(result).rejects.toThrow(/Harvard request failed/);
  await waiting;
  expect(timeout).toHaveBeenCalledWith(15000);
  deadline.abort();
  await check;
  await unchanged();
});
it.each([{}, { records }, { records, info: { page: 2, pages: 3 } }, { records: [], info: { page: 1, pages: 0 } }, { records, info: { page: 1, pages: '2' } }])('rejects malformed API pagination %j', async data => {
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'key', fetchImpl: async () => response(data) })).rejects.toThrow(/Invalid Harvard pagination/);
  await unchanged();
});
it('bounds API requests when the provider keeps supplying invalid records', async () => {
  const fetchImpl = vi.fn(async url => apiPage(Number(url.searchParams.get('page')), 101, []));
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'key', fetchImpl })).rejects.toThrow(/exceeded 100 pages/);
  expect(fetchImpl).toHaveBeenCalledTimes(100);
  await unchanged();
});
it('refuses empty results, missing keys, and unexpected secrets in public output', async () => {
  await expect(refreshCatalog({ output, source: 'api' })).rejects.toThrow(/HARVARD_API_KEY/);
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl: async () => apiPage(1, 1, []) })).rejects.toThrow(/No valid artwork/);
  await expect(refreshCatalog({ output, source: 'api', apiKey: 'secret-key', fetchImpl: async () => apiPage(1, 1, [{ ...records[0], title: 'secret-key' }]) })).rejects.toThrow(/unexpectedly contained the API key/);
  await unchanged();
});
it.each([{ source: 'unknown' }, { limit: 0 }, { limit: 1001 }, { limit: 'NaN' }, { limit: 1.5 }, { input: 'x', ids: '1' }, { input: 'x', source: 'api' }, { ids: '1', source: 'api' }])('validates CLI options before doing any work %j', async options => {
  const fetchImpl = vi.fn();
  await expect(refreshCatalog({ output, fetchImpl, ...options })).rejects.toThrow();
  expect(fetchImpl).not.toHaveBeenCalled();
  await unchanged();
});
it('imports local arrays, Harvard responses and catalogs without network requests', async () => {
  const input = join(directory, 'input.json');
  const fetchImpl = vi.fn();
  for (const payload of [records, { records }, { schemaVersion: 1, records }]) {
    await writeFile(input, JSON.stringify(payload));
    expect(await refreshCatalog({ output, input, fetchImpl })).toMatchObject({ written: 3 });
  }
  expect(fetchImpl).not.toHaveBeenCalled();
});
it('rejects malformed local input or unknown schema versions without damaging the catalog', async () => {
  const input = join(directory, 'input.json');
  for (const payload of ['broken JSON', '{}', '[]', '{"schemaVersion":2,"records":[]}']) {
    await writeFile(input, payload);
    await expect(refreshCatalog({ output, input })).rejects.toThrow();
    await unchanged();
  }
  await writeFile(output, '{"schemaVersion":2,"records":[]}');
  await expect(refreshCatalog({ output })).rejects.toThrow(/Unsupported catalog/);
});
it('prevents concurrent refreshes and never removes another process lock', async () => {
  await writeFile(`${output}.lock`, 'other process');
  await expect(refreshCatalog({ output })).rejects.toThrow(/lock already exists/);
  expect(await readFile(`${output}.lock`, 'utf8')).toBe('other process');
  expect(await readFile(output, 'utf8')).toBe(previous);
});
it('preserves the original if the backup cannot be published and cleans temporary files', async () => {
  await mkdir(`${output}.bak`);
  const input = join(directory, 'input.json');
  await writeFile(input, JSON.stringify(records));
  await expect(refreshCatalog({ output, input })).rejects.toThrow();
  await unchanged();
});
it('reports filesystem read/open failures and releases its own lock', async () => {
  await expect(refreshCatalog({ output: join(directory, 'missing', 'gallery.json'), ids: '1' })).rejects.toMatchObject({ code: 'ENOENT' });
  await rm(output); await mkdir(output);
  await expect(refreshCatalog({ output })).rejects.toThrow();
  expect(await readdir(directory)).not.toContain('gallery.json.lock');
});
it('atomically replaces full contents and leaves no temporary files', async () => {
  await atomicWrite(output, 'complete replacement');
  expect(await readFile(output, 'utf8')).toBe('complete replacement');
  expect(await readdir(directory)).toEqual(['gallery.json']);
});
it('serves a freshly published catalog through the actual viewer fetch path', async () => {
  const input = join(directory, 'input.json');
  await writeFile(input, JSON.stringify(records));
  await refreshCatalog({ output, input });
  const server = createServer(async (_request, reply) => { reply.setHeader('Content-Type', 'application/json'); reply.end(await readFile(output)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const images = await loadArtworks(`http://127.0.0.1:${server.address().port}/gallery.json`);
    expect(images.map(image => image.id)).toEqual(['1', '2', '3']);
    await writeFile(input, JSON.stringify([{ ...records[0], title: 'New catalog title' }]));
    await refreshCatalog({ output, input });
    expect((await loadArtworks(`http://127.0.0.1:${server.address().port}/gallery.json`))[0].title).toBe('New catalog title');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
it('runs and documents the CLI without printing secrets', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await main(['--help']);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('public IIIF (no key)'));
  const input = join(directory, 'input.json');
  await writeFile(input, JSON.stringify(records));
  await main(['--input', input, '--output', output]);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('Refreshed 3 artworks'));
  await rm(output);
  await main(['--input', input, '--output', output]);
  await expect(main(['--unknown'])).rejects.toThrow();
});

it.each([false, true])('loads a private local env file in the real CLI; shell override: %s', async override => {
  const env = { ...process.env };
  delete env.HARVARD_API_KEY;
  if (override) env.HARVARD_API_KEY = 'shell-test-key';
  await writeFile(join(directory, '.env.harvard'), 'HARVARD_API_KEY=file-test-key\n');
  const preload = join(directory, 'provider.mjs');
  await writeFile(preload, `
    import assert from 'node:assert/strict';
    globalThis.fetch = async url => {
      assert.equal(url.origin, 'https://api.harvardartmuseums.org');
      assert.equal(url.searchParams.get('apikey'), '${override ? 'shell-test-key' : 'file-test-key'}');
      return { ok: true, json: async () => (${JSON.stringify({ info: { page: 1, pages: 1 }, records })}) };
    };
  `);
  const result = await promisify(execFile)(process.execPath, [
    '--env-file-if-exists=.env.harvard', '--import', pathToFileURL(preload).href,
    fileURLToPath(new URL('../scripts/refresh-catalog.mjs', import.meta.url)), '--source', 'api', '--output', output,
  ], { cwd: directory, env });
  expect(result.stdout).toContain('Refreshed 3 artworks');
  const serialized = await readFile(output, 'utf8');
  expect(normalizeCollection(JSON.parse(serialized))).toHaveLength(3);
  for (const value of [result.stdout, result.stderr, serialized]) expect(value).not.toMatch(/file-test-key|shell-test-key/);
});
it('keeps offline import available without the optional local key file', async () => {
  const input = join(directory, 'input.json');
  await writeFile(input, JSON.stringify(records));
  const result = await promisify(execFile)(process.execPath, [
    '--env-file-if-exists=.env.harvard', fileURLToPath(new URL('../scripts/refresh-catalog.mjs', import.meta.url)),
    '--input', input, '--output', output,
  ], { cwd: directory });
  expect(result.stdout).toContain('Refreshed 3 artworks');
  expect(normalizeCollection(JSON.parse(await readFile(output, 'utf8')))).toHaveLength(3);
});
