// @vitest-environment node
import { mkdtemp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { discoveryGroups, refreshDiscovery } from '../scripts/refresh-discovery.mjs';
import { defaultFilters, validateFilters } from '../src/data/gallery-filters.js';

let directory, output;
const record = { objectid: 1, title: 'A view', primaryimageurl: 'https://images.example.test/1.jpg', people: [{ personid: 1, role: 'Artist', name: 'An artist' }], classification: 'Paintings' };
const reply = records => ({ ok: true, json: async () => ({ records, info: { page: 1, pages: records.length ? 1 : 0, totalrecords: records.length } }) });
const options = () => ({ output, apiKey: 'private-test-key', groups: [{ name: 'Paintings', filters: defaultFilters }], fetchImpl: async () => reply([record]) });
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'pp-discovery-')); output = join(directory, 'discovery.json'); });
afterEach(async () => rm(directory, { recursive: true, force: true }));
it('validates all publication selections', () => { expect(discoveryGroups.length).toBe(14); for (const group of discoveryGroups) expect(validateFilters(group.filters).limit).toBeGreaterThan(0); });
it('publishes deduplicated public records with search tags and a complete backup', async () => {
  await writeFile(output, 'prior catalog');
  const config = options();
  config.groups.push({ name: 'Landscapes', filters: { ...defaultFilters, keyword: 'landscape' } });
  const result = await refreshDiscovery(config); expect(result.written).toBe(1);
  expect(await readFile(output + '.bak', 'utf8')).toBe('prior catalog');
  const saved = await readFile(output, 'utf8'); expect(saved).not.toContain('private-test-key');
  expect(JSON.parse(saved).records[0].searchTags).toEqual(['landscape']);
  expect((await readdir(directory)).some(name => /\.lock$|\.tmp$/.test(name))).toBe(false);
});
it('allows an empty category when another selection has viewable works', async () => {
  let count = 0;
  const result = await refreshDiscovery({ ...options(), groups: [...options().groups, ...options().groups], fetchImpl: async () => reply(count++ ? [record] : []) });
  expect(result.written).toBe(1); expect(result.selections[0].returned).toBe(0);
});
it('preserves the prior catalog on provider errors, all-empty results, key contamination, or failed backup', async () => {
  await writeFile(output, 'prior');
  for (const fetchImpl of [async () => ({ ok: false }), async () => reply([]), async () => reply([{ ...record, title: 'private-test-key' }])]) {
    await expect(refreshDiscovery({ ...options(), fetchImpl })).rejects.toThrow(); expect(await readFile(output, 'utf8')).toBe('prior');
  }
  await mkdir(output + '.bak'); await expect(refreshDiscovery(options())).rejects.toThrow(); expect(await readFile(output, 'utf8')).toBe('prior');
});
it('rejects missing credentials and overlapping refreshes without removing another lock', async () => {
  await expect(refreshDiscovery({ ...options(), apiKey: '' })).rejects.toThrow(/HARVARD_API_KEY/);
  await writeFile(output + '.lock', 'other owner');
  await expect(refreshDiscovery(options())).rejects.toThrow(/already running/);
  expect(await readFile(output + '.lock', 'utf8')).toBe('other owner');
});
