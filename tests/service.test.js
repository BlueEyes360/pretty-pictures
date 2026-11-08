// @vitest-environment node
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createGalleryService, galleryServicePlugin } from '../server/gallery-service.mjs';
import { defaultFilters } from '../src/data/gallery-filters.js';

let directory, server, baseURL, fetchImpl;
const record = { objectid: 42, title: 'A painting', primaryimageurl: 'https://images.example.test/42.jpg', people: [{ personid: 27651, role: 'Artist', name: 'Claude Monet' }], creditline: 'Harvard' };
const reply = records => ({ ok: true, json: async () => ({ records, info: { totalrecords: records.length, page: 1, pages: records.length ? 1 : 0 } }) });
async function start(options = {}) {
  const service = createGalleryService({ apiKey: 'private-test-key', fetchImpl, directory, ...options });
  server = createServer((request, response) => service(request, response, () => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{"fallback":true}'); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
}
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'pretty-pictures-service-'));
  fetchImpl = vi.fn(async url => reply(url.pathname === '/classification' ? [{ name: 'Paintings' }, { name: 'Prints' }, { name: '(not assigned)' }, null] : url.pathname === '/person' ? [{ id: 27651, displayname: 'Claude Monet', roles: [{ role: 'Artist' }] }] : [record]));
  await start();
});
afterEach(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
const call = (path, { body, method = 'GET', headers, ...options } = {}) => fetch(baseURL + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: baseURL }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options });
const build = filters => call('/api/gallery/build', { method: 'POST', body: { ...defaultFilters, ...filters } });

it('installs the service in both local dev and preview servers', () => {
  const middleware = { middlewares: { use: vi.fn() } };
  const plugin = galleryServicePlugin({ apiKey: '' });
  plugin.configureServer(middleware); plugin.configurePreviewServer(middleware);
  expect(middleware.middlewares.use).toHaveBeenCalledTimes(2);
});
it('serves static fallback, configuration and cached type lookup without exposing a key', async () => {
  expect(await (await call('/gallery.json')).json()).toEqual({ fallback: true });
  expect(await (await call('/other')).json()).toEqual({ fallback: true });
  const config = await (await call('/api/gallery/config')).json();
  expect(config.configured).toBe(true); expect(config.presets).toHaveLength(5); expect(JSON.stringify(config)).not.toContain('private-test-key');
  for (let i = 0; i < 2; i++) expect(await (await call('/api/gallery/types')).json()).toEqual({ types: ['Paintings', 'Prints'] });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect((await (await call('/api/gallery/config')).json()).types).toEqual(['Paintings', 'Prints']);
  expect((await call('/gallery.json', { method: 'POST' })).status).toBe(405);
  expect((await call('/api/gallery/missing')).status).toBe(404);
});
it('finds artists and safely rejects malformed or secret-bearing lookup data', async () => {
  expect((await (await call('/api/gallery/artists?q=Monet')).json()).artists[0].id).toBe(27651);
  expect((await call('/api/gallery/artists?q=x')).status).toBe(400);
  fetchImpl.mockResolvedValueOnce(reply([{ id: 1, displayname: 'private-test-key', roles: [{ role: 'Artist' }] }]));
  const denied = await call('/api/gallery/artists?q=Monet'); expect(denied.status).toBe(502); expect(await denied.text()).not.toContain('private-test-key');
  fetchImpl.mockResolvedValueOnce(reply([])); expect((await call('/api/gallery/types')).status).toBe(400);
});
it.each([{ Origin: 'https://other.example' }, { 'Sec-Fetch-Site': 'cross-site' }])('blocks requests from other sites: %j', async headers => {
  const result = await call('/api/gallery/build', { method: 'POST', body: defaultFilters, headers });
  expect(result.status).toBe(403); expect(fetchImpl).not.toHaveBeenCalled(); expect(await readdir(directory)).toEqual([]);
});
it('rejects a spoofed host header at the HTTP boundary', async () => {
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(baseURL + '/api/gallery/config', { headers: { Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject); request.end();
  });
  expect(status).toBe(403); expect(fetchImpl).not.toHaveBeenCalled();
});
it('builds, persists, reloads, and backs up galleries using JSON only', async () => {
  const result = await build({ types: ['Prints'], culture: 'Japanese', fromYear: 1800, toYear: 1899 });
  expect(result.status).toBe(200);
  const data = await result.json(); expect(data.summary.returned).toBe(1);
  const saved = await readFile(join(directory, 'gallery.json'), 'utf8');
  expect(JSON.parse(saved)).toEqual(data.catalog); expect(saved).not.toContain('private-test-key');
  expect(await (await call('/gallery.json')).json()).toEqual(data.catalog);
  expect((await call('/gallery.json')).headers.get('cache-control')).toBe('no-store');
  fetchImpl.mockResolvedValueOnce(reply([{ ...record, objectid: 43, title: 'New gallery' }]));
  expect((await build()).status).toBe(200);
  expect(await readFile(join(directory, 'gallery.json.bak'), 'utf8')).toBe(saved);
  expect((await readdir(directory)).some(name => name.endsWith('.tmp'))).toBe(false);
});
it('preserves a saved gallery on provider failure, no results, invalid filters, and key contamination', async () => {
  await build(); const saved = await readFile(join(directory, 'gallery.json'), 'utf8');
  for (const result of [{ ok: false }, reply([]), reply([{ ...record, title: 'private-test-key' }])]) {
    fetchImpl.mockResolvedValueOnce(result);
    const response = await build(); expect(response.status).toBe(400); expect(await response.text()).not.toContain('private-test-key');
    expect(await readFile(join(directory, 'gallery.json'), 'utf8')).toBe(saved);
  }
  expect((await build({ limit: 10000 })).status).toBe(400);
  expect((await call('/api/gallery/build', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: defaultFilters })).status).toBe(400);
  const malformed = await fetch(baseURL + '/api/gallery/build', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  expect(malformed.status).toBe(400);
});
it('saves, updates, and deletes named presets, preserving built-ins', async () => {
  const created = await (await call('/api/gallery/presets', { method: 'POST', body: { name: 'My prints', filters: { ...defaultFilters, types: ['Prints'] } } })).json();
  expect(created.presets).toHaveLength(6);
  const id = created.preset.id;
  const updated = await (await call('/api/gallery/presets', { method: 'POST', body: { id, name: 'My drawings', filters: { ...defaultFilters, types: ['Drawings'] } } })).json();
  expect(updated.preset.id).toBe(id); expect(updated.presets).toHaveLength(6);
  expect(JSON.parse(await readFile(join(directory, 'presets.json'), 'utf8'))[0].name).toBe('My drawings');
  expect((await call('/api/gallery/presets/paintings', { method: 'DELETE' })).status).toBe(404);
  const deleted = await (await call(`/api/gallery/presets/${id}`, { method: 'DELETE' })).json(); expect(deleted.presets).toHaveLength(5);
  expect((await call(`/api/gallery/presets/${id}`, { method: 'DELETE' })).status).toBe(404);
});
it('rejects oversized bodies with a useful response and permits the next request', async () => {
  const response = await call('/api/gallery/build', { method: 'POST', body: { keyword: 'x'.repeat(17000) } });
  expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: 'Gallery request is too large.' });
  expect(fetchImpl).not.toHaveBeenCalled(); expect(await readdir(directory)).toEqual([]);
  expect((await build()).status).toBe(200);
});
it.each([[null], [{ id: 'paintings', name: 'Replacement', filters: defaultFilters }], [{ id: 'mine', name: 'Valid', filters: { limit: -1 } }], [{ id: 'mine', name: 'Painting discoveries', filters: defaultFilters }], [{ id: 'mine', name: 'Name', filters: defaultFilters }, { id: 'mine', name: 'Other name', filters: defaultFilters }]].map(presets => ({ presets })))('rejects malformed saved presets without returning broken UI data: %j', async ({ presets }) => {
  await writeFile(join(directory, 'presets.json'), JSON.stringify(presets));
  const response = await call('/api/gallery/config');
  expect(response.status).toBe(400); expect((await response.json()).error).toContain('Restore its backup');
});
it('shares the mutation lock between independent service instances and leaves another owner’s lock intact', async () => {
  const otherService = createGalleryService({ apiKey: 'private-test-key', fetchImpl, directory });
  const otherServer = createServer((request, response) => otherService(request, response, () => response.end()));
  await new Promise(resolve => otherServer.listen(0, '127.0.0.1', resolve));
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  fetchImpl.mockImplementationOnce(async (_url, { signal }) => new Promise((_resolve, reject) => { started(); signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }); }));
  const controller = new AbortController();
  const rejected = expect(call('/api/gallery/build', { method: 'POST', body: defaultFilters, signal: controller.signal })).rejects.toThrow();
  try {
    await waiting;
    const other = await fetch(`http://127.0.0.1:${otherServer.address().port}/api/gallery/presets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Race', filters: defaultFilters }) });
    expect(other.status).toBe(409); expect(await readdir(directory)).toEqual(['.mutation.lock']);
    controller.abort(); await rejected;
    await vi.waitFor(async () => expect(await readdir(directory)).toEqual([]));
    expect((await build()).status).toBe(200);
  } finally { controller.abort(); otherServer.closeAllConnections(); await new Promise(resolve => otherServer.close(resolve)); }
});
it.each([null, {}, { name: '' }, { name: 'a'.repeat(61) }, { name: 'a\nb' }, { name: 'New', id: 'missing' }, { name: 'Painting discoveries' }, { name: 'New', filters: { limit: 0 } }])('rejects invalid preset requests %j', async body => {
  expect((await call('/api/gallery/presets', { method: 'POST', body })).status).toBe(400);
});
it('bounds preset storage and rejects corrupt local files', async () => {
  await writeFile(join(directory, 'presets.json'), JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: String(i), filters: defaultFilters }))));
  expect((await call('/api/gallery/presets', { method: 'POST', body: { name: 'Another', filters: defaultFilters } })).status).toBe(400);
  await writeFile(join(directory, 'presets.json'), '{}');
  expect((await call('/api/gallery/config')).status).toBe(400);
  expect((await call('/api/gallery/presets/x', { method: 'DELETE' })).status).toBe(400);
  await writeFile(join(directory, 'gallery.json'), 'not json');
  expect((await call('/gallery.json')).status).toBe(400);
});
it('handles unavailable storage and failed backup publication without exposing paths', async () => {
  await mkdir(join(directory, 'gallery.json'));
  const denied = await build(); expect(denied.status).toBe(400); expect(await denied.text()).not.toContain(directory);
  await rm(join(directory, 'gallery.json'), { recursive: true });
  await build(); const original = await readFile(join(directory, 'gallery.json'), 'utf8');
  await mkdir(join(directory, 'gallery.json.bak'));
  expect((await build()).status).toBe(400); expect(await readFile(join(directory, 'gallery.json'), 'utf8')).toBe(original);
});
it('serializes mutations and stops disconnected builds without publishing partial data', async () => {
  let started;
  const waiting = new Promise(resolve => { started = resolve; });
  fetchImpl.mockImplementationOnce(async (_url, { signal }) => new Promise((_resolve, reject) => { started(); signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }); }));
  const controller = new AbortController();
  const pending = call('/api/gallery/build', { method: 'POST', body: defaultFilters, signal: controller.signal });
  const rejected = expect(pending).rejects.toThrow();
  await waiting;
  expect((await build()).status).toBe(409);
  controller.abort(); await rejected;
  await vi.waitFor(async () => expect((await build()).status).toBe(200));
  expect(JSON.parse(await readFile(join(directory, 'gallery.json'), 'utf8')).records).toHaveLength(1);
});
it('times out a stalled build and works without a configured key', async () => {
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await start({ buildTimeoutMs: 25 });
  fetchImpl.mockImplementationOnce(async (_url, { signal }) => new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }); }));
  const timeout = await build();
  expect(timeout.status).toBe(400); expect((await timeout.json()).error).toMatch(/timed out.*unchanged/); expect(await readdir(directory)).toEqual([]);
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await start({ apiKey: '' });
  expect((await (await call('/api/gallery/config')).json()).configured).toBe(false);
  expect((await build()).status).toBe(400);
});
