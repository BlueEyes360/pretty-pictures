import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { imageUrl, normalizeArtwork } from '../src/data/artworks.js';

export const defaultOutput = fileURLToPath(new URL('../public/gallery.json', import.meta.url));
const defaultBackup = fileURLToPath(new URL('../output/gallery.json.bak', import.meta.url));
const cleanText = value => typeof value === 'string' ? value.trim() : '';
const objectId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

// Publish only the public fields the gallery needs, never an entire provider response.
export function catalogRecord(record) {
  const normalized = normalizeArtwork(record);
  const id = objectId(record?.objectid ?? record?.id);
  if (!normalized || !id) return null;
  return {
    objectid: id, title: normalized.title, primaryimageurl: normalized.url,
    people: (Array.isArray(record.people) ? record.people : []).filter(person => person && (cleanText(person.displayname) || cleanText(person.name)))
      .map(person => ({ displayname: cleanText(person.displayname) || cleanText(person.name), role: cleanText(person.role), ...(Number.isSafeInteger(person.personid) ? { personid: person.personid } : {}) })),
    dated: normalized.dated, creditline: normalized.credit,
    copyright: cleanText(record.copyright),
    classification: cleanText(record.classification), culture: cleanText(record.culture),
    medium: cleanText(record.medium), technique: cleanText(record.technique),
    datebegin: Number.isInteger(record.datebegin) ? record.datebegin : null,
    dateend: Number.isInteger(record.dateend) ? record.dateend : null,
    url: `https://harvardartmuseums.org/collections/object/${id}`,
  };
}

async function requestJSON(url, fetchImpl) {
  // Never follow a provider-supplied next URL or redirect with an API key attached.
  // The timeout also covers reading/parsing the response body.
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), credentials: 'omit', redirect: 'error' });
    if (!response.ok) throw new Error('request failed');
    return await response.json();
  } catch {
    throw new Error('Harvard request failed (network, timeout, HTTP error or invalid JSON). The current catalog was not replaced.');
  }
}

export function manifestRecord(manifest, id) {
  const expected = `https://iiif.harvardartmuseums.org/manifests/object/${id}`;
  const resource = manifest?.sequences?.[0]?.canvases?.[0]?.images?.[0]?.resource;
  if (manifest?.['@id'] !== expected || !cleanText(manifest.label) || !resource) throw new Error(`Invalid Harvard manifest for object ${id}.`);
  const metadata = Array.isArray(manifest.metadata) ? manifest.metadata : [];
  const value = label => metadata.find(item => item?.label === label)?.value;
  const people = value('People');
  const base = imageUrl(resource.service?.['@id']);
  const record = catalogRecord({
    objectid: id, title: manifest.label,
    primaryimageurl: base ? `${base.replace(/\/$/, '')}/full/!1600,1600/0/default.jpg` : resource['@id'],
    people: (Array.isArray(people) ? people : [people]).filter(item => typeof item === 'string').map(item => {
      const colon = item.indexOf(':');
      return { role: colon < 0 ? 'Artist' : item.slice(0, colon), displayname: colon < 0 ? item : item.slice(colon + 1).trim() };
    }),
    dated: value('Date'), creditline: value('Credit Line') || manifest.attribution,
    copyright: manifest.license,
  });
  if (!record) throw new Error(`No usable image in Harvard manifest for object ${id}.`);
  return record;
}

function uniqueRecords(records) {
  const result = new Map();
  let skipped = 0;
  let duplicates = 0;
  for (const raw of records) {
    const record = catalogRecord(raw);
    if (!record) { skipped++; continue; }
    if (result.has(record.objectid)) { duplicates++; continue; }
    result.set(record.objectid, record);
  }
  return { records: [...result.values()], skipped, duplicates };
}

async function discover(apiKey, limit, fetchImpl) {
  if (!cleanText(apiKey)) throw new Error('Set HARVARD_API_KEY in .env.harvard or the shell for --source api. The default IIIF refresh needs no key.');
  const raw = [];
  for (let page = 1; page <= 100; page++) {
    const url = new URL('https://api.harvardartmuseums.org/object');
    url.search = new URLSearchParams({ apikey: apiKey, classification: 'Paintings', hasimage: '1', size: '100', page: String(page), sort: 'objectid', sortorder: 'asc', fields: 'objectid,title,primaryimageurl,baseimageurl,people,dated,creditline,copyright' });
    const data = await requestJSON(url, fetchImpl);
    if (!Array.isArray(data?.records) || !Number.isSafeInteger(data?.info?.pages) || data.info.pages < page || data.info.page !== page) {
      throw new Error(`Invalid Harvard pagination on page ${page}. The current catalog was not replaced.`);
    }
    raw.push(...data.records);
    const result = uniqueRecords(raw);
    if (result.records.length >= limit || page === data.info.pages) return { ...result, records: result.records.slice(0, limit), pages: page };
  }
  throw new Error('Harvard refresh exceeded 100 pages. The current catalog was not replaced.');
}

export async function atomicWrite(filename, content) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx');
    try { await handle.writeFile(content, 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    // Same-directory rename keeps readers on the old complete file until publication.
    await rename(temporary, filename);
  } finally { await rm(temporary, { force: true }); }
}

export async function refreshCatalog({ output = defaultOutput, source = 'iiif', ids, input, limit = 100, apiKey, fetchImpl = globalThis.fetch } = {}) {
  if (!['iiif', 'api'].includes(source)) throw new Error('--source must be iiif or api.');
  if (!Number.isSafeInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 1000) throw new Error('--limit must be an integer from 1 to 1000.');
  if ((input && (ids || source === 'api')) || (ids && source === 'api')) throw new Error('Use --input, --ids, or --source api separately.');
  output = resolve(output);
  const lockPath = `${output}.lock`;
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error('A catalog refresh lock already exists. Check for another running refresh before removing the .lock file.', { cause: error });
    throw error;
  }
  try {
    let previous;
    try { previous = await readFile(output, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    let result;
    if (input) {
      const payload = JSON.parse(await readFile(input, 'utf8'));
      if (payload?.schemaVersion !== undefined && payload.schemaVersion !== 1) throw new Error('Unsupported catalog schemaVersion.');
      const records = Array.isArray(payload) ? payload : payload?.records;
      if (!Array.isArray(records)) throw new Error('Input must be an artwork array, Harvard response, or version 1 catalog.');
      result = uniqueRecords(records);
    } else if (source === 'api') {
      result = await discover(apiKey, Number(limit), fetchImpl);
    } else {
      const current = !ids && previous ? JSON.parse(previous) : null;
      if (current?.schemaVersion !== undefined && current.schemaVersion !== 1) throw new Error('Unsupported catalog schemaVersion.');
      const selected = ids ? ids.split(',').map(id => id.trim()) : (Array.isArray(current) ? current : current?.records)?.map(record => record?.objectid);
      if (!selected?.length || selected.some(id => !objectId(id))) throw new Error('Provide --ids with comma-separated Harvard object IDs, or start with a catalog containing objectid values.');
      const unique = [...new Set(selected.map(Number))];
      if (unique.length > 1000) throw new Error('IIIF refresh supports at most 1000 selected objects.');
      const records = [];
      for (const id of unique) records.push(manifestRecord(await requestJSON(new URL(`https://iiif.harvardartmuseums.org/manifests/object/${id}`), fetchImpl), id));
      result = { records, skipped: 0, duplicates: selected.length - unique.length };
    }
    if (!result.records.length) throw new Error('No valid artwork was found. The current catalog was not replaced.');
    const catalog = { schemaVersion: 1, refreshedAt: new Date().toISOString(), source: { provider: 'Harvard Art Museums', method: input ? 'file' : source }, records: result.records };
    const serialized = JSON.stringify(catalog, null, 2) + '\n';
    if (apiKey && serialized.includes(apiKey)) throw new Error('Provider data unexpectedly contained the API key. The current catalog was not replaced.');
    // Keep the default backup outside public/: Vite copies that directory into builds.
    const backupPath = output === resolve(defaultOutput) ? defaultBackup : `${output}.bak`;
    if (previous !== undefined) {
      await mkdir(dirname(backupPath), { recursive: true });
      await atomicWrite(backupPath, previous);
    }
    await atomicWrite(output, serialized);
    return { written: result.records.length, skipped: result.skipped, duplicates: result.duplicates, pages: result.pages, output, backup: previous !== undefined, backupPath: previous === undefined ? null : backupPath };
  } finally { await lock.close(); await rm(lockPath, { force: true }); }
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    source: { type: 'string' }, ids: { type: 'string' }, input: { type: 'string' }, output: { type: 'string' }, limit: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (values.help) {
    console.log('npm run refresh:catalog [-- --source api --limit 100]\nDefault: refresh existing Harvard object IDs through public IIIF (no key).\n--ids 299843,230941 selects objects explicitly. --source api discovers paintings using HARVARD_API_KEY.\n--input response.json imports local records without networking. --output defaults to public/gallery.json.\nSuccessful refreshes replace local JSON and keep the previous file as .bak. Nothing is deployed.');
    return;
  }
  const result = await refreshCatalog({ ...values, apiKey: process.env.HARVARD_API_KEY });
  console.log(`Refreshed ${result.written} artworks; skipped ${result.skipped} invalid records and ${result.duplicates} duplicates. ${result.backup ? `Previous catalog: ${result.backupPath}. ` : ''}Local output: ${result.output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
