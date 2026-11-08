import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { atomicWrite } from '../scripts/refresh-catalog.mjs';
import { artTypes, hasControlCharacters, starterPresets, validateFilters } from '../src/data/gallery-filters.js';
import { buildGallery, findArtists, harvardClient } from './harvard.mjs';

const defaultDirectory = fileURLToPath(new URL('../output/local-gallery/', import.meta.url));
const json = (response, status, value) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin' });
  response.end(JSON.stringify(value));
};
async function readJSON(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw new Error('A local gallery file could not be read. Restore its backup before trying again.', { cause: error }); }
}
async function bodyJSON(request) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') throw new Error('Send gallery requests as JSON.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 16384) { request.resume(); throw new Error('Gallery request is too large.'); }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Gallery request contains invalid JSON.'); }
}

export function createGalleryService({ apiKey = process.env.HARVARD_API_KEY, fetchImpl = globalThis.fetch, directory = defaultDirectory, buildTimeoutMs = 90000 } = {}) {
  const requestHarvard = harvardClient({ apiKey, fetchImpl });
  const catalogPath = join(directory, 'gallery.json');
  const presetsPath = join(directory, 'presets.json');
  const lockPath = join(directory, '.mutation.lock');
  let busy = false;
  let classificationCache;
  let classificationTime = 0;
  const readPresets = async () => {
    const presets = await readJSON(presetsPath, []);
    const ids = new Set(starterPresets.map(preset => preset.id));
    const names = new Set(starterPresets.map(preset => preset.name.toLowerCase()));
    try {
      if (!Array.isArray(presets) || presets.length > 30) throw new Error();
      return presets.map(preset => {
        if (!preset || typeof preset.id !== 'string' || !/^[\w-]{1,80}$/.test(preset.id) || ids.has(preset.id) || typeof preset.name !== 'string' || !preset.name.trim() || preset.name.length > 60 || hasControlCharacters(preset.name) || names.has(preset.name.trim().toLowerCase())) throw new Error();
        ids.add(preset.id); names.add(preset.name.trim().toLowerCase());
        return { id: preset.id, name: preset.name.trim(), filters: validateFilters(preset.filters), builtIn: false };
      });
    } catch { throw new Error('The saved presets file is invalid. Restore its backup.'); }
  };
  const publicJSON = (response, status, value) => {
    if (apiKey && JSON.stringify(value).includes(apiKey)) return json(response, 502, { error: 'Provider data contained private configuration. Nothing was published.' });
    return json(response, status, value);
  };
  const safeWrite = async (path, value) => {
    const serialized = JSON.stringify(value, null, 2) + '\n';
    if (apiKey && serialized.includes(apiKey)) throw new Error('Provider data contained private configuration. Nothing was saved.');
    await mkdir(directory, { recursive: true });
    let previous;
    try { previous = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== undefined) await atomicWrite(`${path}.bak`, previous);
    await atomicWrite(path, serialized);
  };

  return async function middleware(request, response, next) {
    const path = (request.url || '').split('?')[0];
    if (!path.startsWith('/api/gallery') && path !== '/gallery.json') return next();
    const host = request.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host) || (request.headers.origin && request.headers.origin !== `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site') {
      return json(response, 403, { error: 'The gallery service only accepts requests from this local site.' });
    }
    const controller = new AbortController();
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', disconnected);
    let mutation = false;
    let lock;
    const releaseMutation = async () => {
      if (lock) {
        const handle = lock; lock = undefined;
        try { await handle.close(); } finally { await rm(lockPath, { force: true }); }
      }
      if (mutation) busy = false;
    };
    const finishMutation = async (status, value) => { await releaseMutation(); return publicJSON(response, status, value); };
    try {
      if (path === '/gallery.json') {
        if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed.' });
        const catalog = await readJSON(catalogPath, null);
        return catalog ? publicJSON(response, 200, catalog) : next();
      }
      if (request.method === 'GET' && path === '/api/gallery/config') {
        const custom = await readPresets();
        return publicJSON(response, 200, { configured: !!apiKey, types: classificationCache || artTypes, presets: [...starterPresets, ...custom] });
      }
      if (request.method === 'GET' && path === '/api/gallery/types') {
        if (!classificationCache || Date.now() - classificationTime > 3600000) {
          const data = await requestHarvard('classification', { size: '100', sort: 'name', sortorder: 'asc' }, controller.signal);
          const types = data.records.map(item => item?.name).filter(name => typeof name === 'string' && /^[\w &'(),-]{1,80}$/.test(name) && name !== '(not assigned)');
          if (!types.length) throw new Error('Harvard returned no art types. Try again.');
          classificationCache = [...new Set(types)]; classificationTime = Date.now();
        }
        return publicJSON(response, 200, { types: classificationCache });
      }
      if (request.method === 'GET' && path === '/api/gallery/artists') {
        const term = new URL(request.url, `http://${host}`).searchParams.get('q');
        return publicJSON(response, 200, { artists: await findArtists(requestHarvard, term, controller.signal) });
      }
      const isBuild = path === '/api/gallery/build' && request.method === 'POST';
      const isSave = path === '/api/gallery/presets' && request.method === 'POST';
      const isDelete = /^\/api\/gallery\/presets\/[^/]+$/.test(path) && request.method === 'DELETE';
      if (!isBuild && !isSave && !isDelete) return json(response, 404, { error: 'Gallery route not found.' });
      if (busy) return json(response, 409, { error: 'Another gallery change is in progress. Please wait and try again.' });
      busy = true; mutation = true;
      const body = isDelete ? null : await bodyJSON(request);
      await mkdir(directory, { recursive: true });
      try { lock = await open(lockPath, 'wx'); }
      catch (error) {
        if (error.code === 'EEXIST') return json(response, 409, { error: 'Another local service is changing the gallery. If no service is running a change, remove the stale .mutation.lock file and retry.' });
        throw error;
      }
      if (isBuild) {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(buildTimeoutMs)]);
        const result = await buildGallery(requestHarvard, body, { signal });
        signal.throwIfAborted();
        await safeWrite(catalogPath, result.catalog);
        return await finishMutation(200, result);
      }
      const presets = await readPresets();
      if (isDelete) {
        const id = path.split('/').at(-1);
        if (!presets.some(preset => preset.id === id)) return await finishMutation(404, { error: 'Saved preset not found.' });
        const remaining = presets.filter(preset => preset.id !== id);
        await safeWrite(presetsPath, remaining);
        return await finishMutation(200, { presets: [...starterPresets, ...remaining] });
      }
      if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60 || hasControlCharacters(body.name)) throw new Error('Give the preset a name between 1 and 60 characters.');
      const name = body.name.trim();
      if (body.id && !presets.some(preset => preset.id === body.id)) throw new Error('That saved preset no longer exists.');
      if (!body.id && presets.length >= 30) throw new Error('You can save up to 30 presets. Delete one before adding another.');
      if ([...starterPresets, ...presets].some(preset => preset.id !== body.id && preset.name.toLowerCase() === name.toLowerCase())) throw new Error('A preset already has that name. Choose another name.');
      const preset = { id: body.id || randomUUID(), name, filters: validateFilters(body.filters), builtIn: false };
      const updated = [...presets.filter(item => item.id !== preset.id), preset];
      await safeWrite(presetsPath, updated);
      return await finishMutation(200, { preset, presets: [...starterPresets, ...updated] });
    } catch (error) {
      await releaseMutation();
      if (controller.signal.aborted || response.destroyed) return;
      const message = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'The gallery request timed out. Your saved gallery is unchanged.' : error.message;
      // File-system errors contain local paths; never return those or raw provider errors.
      publicJSON(response, 400, { error: typeof error.code === 'string' ? 'Local storage is unavailable. Your saved gallery is unchanged.' : message });
    } finally {
      await releaseMutation();
      response.removeListener('close', disconnected);
    }
  };
}

export function galleryServicePlugin(options) {
  const install = server => { server.middlewares.use(createGalleryService(options)); };
  return { name: 'local-gallery-service', configureServer: install, configurePreviewServer: install };
}
