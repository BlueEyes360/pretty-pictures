import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { normalizeArtwork } from '../src/data/artworks.js';

export function prepareImport(payload) {
  const records = Array.isArray(payload) ? payload : payload?.records;
  if (!Array.isArray(records)) throw new Error('Expected an array of artwork or a Harvard response with a records array.');
  const images = [];
  for (const record of records) {
    const normalized = normalizeArtwork(record);
    if (normalized) images.push({ ...record, primaryimageurl: normalized.url });
  }
  return { images, skipped: records.length - images.length };
}

export async function exportImages({ input, output, apiKey, fetchImpl = globalThis.fetch }) {
  if (!output) throw new Error('Provide --output with a new local JSON filename.');
  let payload;
  if (input) {
    payload = JSON.parse(await readFile(input, 'utf8'));
  } else {
    if (!apiKey) throw new Error('Set HARVARD_API_KEY in the shell, or provide --input for an offline export.');
    const url = new URL('https://api.harvardartmuseums.org/object');
    url.search = new URLSearchParams({ apikey: apiKey, sort: 'random', classification: 'Paintings', size: '10' });
    // Keep secrets and provider response bodies out of command output.
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000), credentials: 'omit' });
      if (!response.ok) throw new Error('request failed');
      payload = await response.json();
    } catch { throw new Error('The Harvard request failed. Check your API key and connection, then try again.'); }
  }
  const result = prepareImport(payload);
  if (!result.images.length) throw new Error('No valid images were found; no export was written.');
  // Exclusive creation avoids silently overwriting an existing dataset.
  await writeFile(output, JSON.stringify(result.images, null, 2) + '\n', { flag: 'wx' });
  return { written: result.images.length, skipped: result.skipped };
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { input: { type: 'string' }, output: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('npm run import:images -- --input response.json --output gallery.json\nOmit --input to fetch ten paintings using HARVARD_API_KEY. Exports local JSON only.');
    return;
  }
  const result = await exportImages({ ...values, apiKey: process.env.HARVARD_API_KEY });
  console.log(`Exported ${result.written} images; skipped ${result.skipped} invalid records. No database writes were made.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
