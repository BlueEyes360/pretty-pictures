// @vitest-environment node
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { exportImages, main, prepareImport } from '../scripts/import-images.mjs';
import { records, response } from './fixtures.js';

let directory;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'pretty-pictures-test-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
it('processes all ten records including the first and last', () => {
  const ten = Array.from({ length: 10 }, (_, i) => ({ ...records[0], objectid: i }));
  const result = prepareImport({ records: ten });
  expect(result.images.map(x => x.objectid)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(result.skipped).toBe(0);
});
it('handles short batches, null records and optional metadata', () => {
  const result = prepareImport([null, {}, records[0], { baseimageurl: 'https://example.test/iiif/1' }]);
  expect(result.images).toHaveLength(2);
  expect(result.skipped).toBe(2);
  expect(result.images[1].primaryimageurl).toContain('/full/!1600,1600/0/default.jpg');
});
it.each([undefined, null, {}, { records: {} }])('rejects malformed envelopes %j', payload => expect(() => prepareImport(payload)).toThrow(/Expected an array/));
it('exports a local file without any network call and refuses overwrites', async () => {
  const input = join(directory, 'input.json'); const output = join(directory, 'output.json');
  await writeFile(input, JSON.stringify({ records }));
  const fetchImpl = vi.fn();
  expect(await exportImages({ input, output, fetchImpl })).toEqual({ written: 3, skipped: 0 });
  expect(JSON.parse(await readFile(output, 'utf8'))).toHaveLength(3);
  expect(fetchImpl).not.toHaveBeenCalled();
  await expect(exportImages({ input, output, fetchImpl })).rejects.toMatchObject({ code: 'EEXIST' });
});
it('fetches one read-only batch and exports locally when explicitly requested', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(response({ records }));
  await exportImages({ output: join(directory, 'out.json'), apiKey: 'test-only', fetchImpl });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url, options] = fetchImpl.mock.calls[0];
  expect(url.origin).toBe('https://api.harvardartmuseums.org');
  expect(url.searchParams.get('size')).toBe('10');
  expect(options.method).toBeUndefined();
  expect(options.credentials).toBe('omit');
});
it('does not disclose a key through provider errors', async () => {
  await expect(exportImages({ output: join(directory, 'out.json'), apiKey: 'secret', fetchImpl: async () => { throw new Error('secret in URL'); } })).rejects.toThrow('The Harvard request failed.');
  await expect(exportImages({ output: join(directory, 'out.json'), apiKey: 'secret', fetchImpl: async () => ({ ok: false }) })).rejects.toThrow('The Harvard request failed.');
});
it('requires output and credentials for network imports', async () => {
  await expect(exportImages({})).rejects.toThrow(/--output/);
  await expect(exportImages({ output: 'unused' })).rejects.toThrow(/HARVARD_API_KEY/);
});
it('does not write empty exports', async () => {
  const input = join(directory, 'empty.json');
  await writeFile(input, '[]');
  await expect(exportImages({ input, output: join(directory, 'out.json') })).rejects.toThrow(/no export was written/);
});
it('documents and runs the CLI with an offline input', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await main(['--help']);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('local JSON only'));
  const input = join(directory, 'input.json');
  await writeFile(input, JSON.stringify(records));
  await main(['--input', input, '--output', join(directory, 'out.json')]);
  expect(log).toHaveBeenCalledWith(expect.stringContaining('Exported 3 images'));
  await expect(main(['--unknown'])).rejects.toThrow();
});
