import { preview } from 'vite';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { createGalleryService } from '../../server/gallery-service.mjs';
import { artTypes } from '../../src/data/gallery-filters.js';

const output = resolve('output');
await mkdir(output, { recursive: true });
const directory = await mkdtemp(join(output, 'browser-service-'));
const services = new Map();
const fixtureFetch = async (url, { signal }) => {
  const person = { personid: 27651, id: 27651, displayname: 'Claude Monet', displaydate: '1840–1926', culture: 'French', roles: [{ role: 'Artist' }] };
  if (url.pathname === '/classification') return { ok: true, json: async () => ({ info: { totalrecords: artTypes.length }, records: artTypes.map(name => ({ name })) }) };
  if (url.pathname === '/person') return { ok: true, json: async () => ({ info: { totalrecords: 1 }, records: [person] }) };
  const keyword = url.searchParams.get('keyword');
  if (keyword === 'FAIL_PROVIDER') return { ok: false };
  if (keyword === 'SLOW_PROVIDER') return new Promise((_resolve, reject) => { signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }); });
  const records = keyword === 'NO_RESULTS' ? [] : Array.from({ length: 35 }, (_, index) => ({
    objectid: 1000 + index, title: `Discovered artwork ${index + 1}`, primaryimageurl: `https://images.example.test/discovered-${index}.svg`,
    classification: url.searchParams.get('classification') || 'Drawings', culture: 'Japanese', dated: '1888', medium: 'Watercolor',
    people: [{ displayname: 'Claude Monet', personid: 27651, role: 'Artist' }], creditline: 'Harvard Art Museums',
  }));
  return { ok: true, json: async () => ({ info: { page: Number(url.searchParams.get('page')), pages: records.length ? 1 : 0, totalrecords: records.length }, records }) };
};
const plugin = { name: 'test-gallery-service', configurePreviewServer(server) {
  server.middlewares.use((request, response, next) => {
    const scope = String(request.headers['x-gallery-test'] || 'default');
    const id = createHash('sha256').update(scope).digest('hex');
    if (!services.has(id)) services.set(id, createGalleryService({ apiKey: 'browser-test-only', fetchImpl: fixtureFetch, directory: join(directory, id) }));
    return services.get(id)(request, response, next);
  });
} };
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
const server = await preview({ configFile: false, root: resolve('.'), plugins: [plugin], build: { outDir: 'build' }, preview: { host: '127.0.0.1', port, strictPort: true } });
const shutdown = async () => {
  await new Promise(resolveClose => server.httpServer.close(resolveClose));
  if (resolve(directory).startsWith(output + '/') || resolve(directory).startsWith(output + '\\')) await rm(directory, { recursive: true, force: true });
  process.exit(0);
};
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
