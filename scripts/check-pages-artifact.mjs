import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

let files = 0;
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!/^\.|\.(bak|tmp|lock|map)$/.test(entry.name), 'Private or intermediate file found in Pages artifact.');
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { await inspect(path); continue; }
    const content = await readFile(path); files++;
    assert(!process.env.HARVARD_API_KEY || !content.includes(Buffer.from(process.env.HARVARD_API_KEY)), 'Private Harvard key found in Pages artifact.');
    if (entry.name.endsWith('.js')) assert(!content.includes(Buffer.from('api.harvardartmuseums.org')), 'Authenticated provider client found in browser bundle.');
  }
}
await inspect('build-pages');
const html = await readFile('build-pages/index.html', 'utf8');
assert(html.includes('/pretty-pictures/assets/'), 'The Pages build must use the repository URL base.');
const catalog = JSON.parse(await readFile('build-pages/discovery.json', 'utf8'));
assert(catalog.schemaVersion === 1 && catalog.records.length > 0, 'A valid discovery catalog is required.');
console.log(`Pages artifact verified: ${files} files; ${catalog.records.length} discovery artworks; no private key or server API client.`);
