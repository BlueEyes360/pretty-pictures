const text = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;

export function imageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  // Root-relative images support local datasets without allowing protocol-relative hosts.
  if (/^\/(?![/\\])/.test(candidate) && !candidate.includes('\\')) return candidate;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.protocol = 'https:';
    return url.href;
  } catch { return null; }
}

export function thumbnailUrl(value) {
  const safe = imageUrl(value);
  if (!safe || safe.startsWith('/')) return safe;
  const url = new URL(safe);
  const harvardImage = url.hostname === 'nrs.harvard.edu' && url.pathname.match(/^(\/urn-3:HUAM:[^/]+)(?:\/full\/[^/]+\/0\/default\.jpg)?$/);
  return harvardImage ? `${url.origin}${harvardImage[1]}/full/!320,320/0/default.jpg` : safe;
}

export function normalizeArtwork(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const primary = imageUrl(record.primaryimageurl);
  const base = imageUrl(record.baseimageurl);
  const url = primary || (base ? `${base.replace(/\/$/, '')}/full/!1600,1600/0/default.jpg` : null);
  if (!url) return null;
  const people = Array.isArray(record.people) ? record.people : [];
  const creators = people.filter(person => person && person.role !== 'Owner' && person.role !== 'Collector')
    .map(person => text(person.displayname, text(person.name, ''))).filter(Boolean);
  return {
    id: String(record.objectid ?? record.id ?? url),
    url,
    thumbnail: thumbnailUrl(url),
    museumUrl: typeof record.url === 'string' && /^https:\/\/(www\.)?harvardartmuseums\.org\/collections\/object\/\d+$/.test(record.url) ? record.url : '',
    title: text(record.title, 'Untitled artwork'),
    artist: [...new Set(creators)].join(', ') || 'Artist unknown',
    dated: text(record.dated, 'Date unknown'),
    credit: text(record.creditline, 'Credit not provided'),
    classification: text(record.classification, ''), culture: text(record.culture, ''),
    medium: text(record.medium, ''), technique: text(record.technique, ''),
  };
}

export function normalizeCollection(data) {
  if (!data || typeof data !== 'object') return [];
  if ('schemaVersion' in data) {
    if (data.schemaVersion !== 1 || !Array.isArray(data.records)) return [];
    return data.records.map(normalizeArtwork).filter(Boolean);
  }
  return Object.values(data).map(normalizeArtwork).filter(Boolean);
}

export async function loadArtworks(url, { signal, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error('The gallery could not be loaded. Please try again.');
    const images = normalizeCollection(await response.json());
    if (!images.length) throw new Error('No viewable artwork is available. Please try again later.');
    return images;
  } catch (error) {
    if (timedOut) throw new Error('The gallery took too long to respond. Please try again.', { cause: error });
    if (error.name === 'AbortError') throw error;
    if (error instanceof SyntaxError) throw new Error('The gallery returned invalid data. Please try again.', { cause: error });
    if (error instanceof TypeError) throw new Error('Unable to connect to the gallery. Check your connection and try again.', { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
