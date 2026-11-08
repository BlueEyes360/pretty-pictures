import { staticGallery } from './static-gallery.js';

export async function galleryRequest(path, { signal, method = 'GET', body } = {}) {
  if (import.meta.env.VITE_GALLERY_MODE === 'static') return staticGallery.request(path, { signal, method, body });
  let response;
  try {
    response = await fetch(`/api/gallery/${path}`, { method, signal, cache: 'no-store', credentials: 'same-origin', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('The local gallery service is unavailable. Start the app with npm start and try again.', { cause: error });
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('The local gallery service is unavailable. Start the app with npm start and try again.'); }
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'The gallery request failed. Please try again.');
  return data;
}
