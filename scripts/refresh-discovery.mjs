import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { atomicWrite } from './refresh-catalog.mjs';
import { artTypes, defaultFilters, starterPresets } from '../src/data/gallery-filters.js';
import { buildGallery, harvardClient } from '../server/harvard.mjs';

const defaultOutput = fileURLToPath(new URL('../public/discovery.json', import.meta.url));
const defaultBackup = fileURLToPath(new URL('../output/discovery.json.bak', import.meta.url));
export const discoveryGroups = [
  ...artTypes.map(type => ({ name: type, filters: { ...defaultFilters, types: [type], limit: 100 } })),
  ...starterPresets.filter(preset => ['landscapes', 'japanese', 'watercolors'].includes(preset.id)).map(preset => ({ name: preset.name, filters: { ...preset.filters, limit: 150 } })),
  { name: 'Claude Monet', filters: { ...defaultFilters, artistId: 27651, artistName: 'Claude Monet', limit: 30 } },
];
export async function refreshDiscovery({ output = defaultOutput, apiKey = process.env.HARVARD_API_KEY, fetchImpl = globalThis.fetch, groups = discoveryGroups } = {}) {
  if (!apiKey) throw new Error('Set HARVARD_API_KEY to refresh the published discovery catalog.');
  output = resolve(output);
  await mkdir(dirname(output), { recursive: true });
  const lockPath = `${output}.lock`;
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('A discovery refresh is already running. Check the .lock file before retrying.', { cause: error }); throw error; }
  try {
    const request = harvardClient({ apiKey, fetchImpl });
    const records = new Map(), urls = new Map(), selections = [];
    for (const group of groups) {
      let result;
      try { result = await buildGallery(request, group.filters, { signal: AbortSignal.timeout(90000) }); }
      catch (error) { if (error.message.startsWith('No viewable artwork')) { selections.push({ name: group.name, returned: 0 }); continue; } throw error; }
      selections.push({ name: group.name, ...result.summary });
      for (const record of result.catalog.records) {
        const previous = records.get(record.objectid) || urls.get(record.primaryimageurl);
        const tags = group.filters.keyword ? [group.filters.keyword] : [];
        if (previous) { previous.searchTags = [...new Set([...previous.searchTags, ...tags])]; continue; }
        const entry = { ...record, searchTags: tags };
        records.set(entry.objectid, entry); urls.set(entry.primaryimageurl, entry);
      }
    }
    if (!records.size) throw new Error('No viewable artwork was found. The published collection is unchanged.');
    const catalog = { schemaVersion: 1, refreshedAt: new Date().toISOString(), source: { provider: 'Harvard Art Museums', method: 'curated-api', selections }, records: [...records.values()] };
    const serialized = JSON.stringify(catalog, null, 2) + '\n';
    if (serialized.includes(apiKey)) throw new Error('Private configuration appeared in provider data. Nothing was saved.');
    let previous;
    try { previous = await readFile(output, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== undefined) {
      const backup = output === defaultOutput ? defaultBackup : `${output}.bak`;
      await mkdir(dirname(backup), { recursive: true }); await atomicWrite(backup, previous);
    }
    await atomicWrite(output, serialized);
    return { written: records.size, selections, output };
  } finally { await lock.close(); await rm(lockPath, { force: true }); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { output: { type: 'string' } } });
    const result = await refreshDiscovery(values);
    console.log(`Published discovery catalog refreshed: ${result.written} unique artworks from ${result.selections.length} selections.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
