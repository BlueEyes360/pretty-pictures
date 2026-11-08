import { expect, it, vi } from 'vitest';
import { galleryRequest } from './gallery-service.js';
it('sends local JSON requests without a Harvard key and handles provider errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ okay: true }) }));
  expect(await galleryRequest('build', { method: 'POST', body: { limit: 5 } })).toEqual({ okay: true });
  expect(fetch.mock.calls[0]).toEqual(['/api/gallery/build', { method: 'POST', signal: undefined, cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{"limit":5}' }]);
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); await expect(galleryRequest('config')).rejects.toThrow(/gallery request failed/);
  fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Friendly error' }) }); await expect(galleryRequest('config')).rejects.toThrow('Friendly error');
  fetch.mockResolvedValueOnce({ json: async () => { throw new SyntaxError(); } }); await expect(galleryRequest('config')).rejects.toThrow(/local gallery service/);
  fetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError')); await expect(galleryRequest('config')).rejects.toMatchObject({ name: 'AbortError' });
});
