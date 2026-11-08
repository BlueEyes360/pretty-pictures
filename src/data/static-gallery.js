import { normalizeArtwork } from './artworks.js';
import { defaultFilters, hasControlCharacters, starterPresets, validateFilters } from './gallery-filters.js';

const creator = role => /^(Artist\b|Maker\b|Photographer\b|Sculptor\b|Painter\b|Draftsman\b)/i.test(role || '');
const lower = value => typeof value === 'string' ? value.toLocaleLowerCase() : '';
const people = record => Array.isArray(record.people) ? record.people.filter(person => person && creator(person.role)) : [];
export function filterCatalog(records, filters) {
  return records.filter(record => {
    if (filters.types.length && !filters.types.includes(record.classification)) return false;
    if (filters.artistId && !people(record).some(person => person.personid === filters.artistId)) return false;
    if (['culture', 'medium', 'technique'].some(key => filters[key] && !lower(record[key]).includes(lower(filters[key])))) return false;
    if (filters.fromYear !== null || filters.toYear !== null) {
      if (!Number.isInteger(record.datebegin) || !Number.isInteger(record.dateend) || !record.datebegin || !record.dateend) return false;
      if (record.dateend < (filters.fromYear ?? -Infinity) || record.datebegin > (filters.toYear ?? Infinity)) return false;
    }
    const text = [record.title, record.classification, record.culture, record.medium, record.technique, ...people(record).map(person => person.displayname), ...(Array.isArray(record.searchTags) ? record.searchTags : [])].map(lower).join(' ');
    return lower(filters.keyword).split(/\s+/).filter(Boolean).every(term => text.includes(term));
  });
}

export function createStaticGalleryService({ base = import.meta.env.BASE_URL || '/', fetchImpl = (...args) => fetch(...args), storage = () => window.localStorage, random = Math.random } = {}) {
  const prefix = `pretty-pictures:${base}:`;
  let cached;
  async function catalog(signal) {
    signal?.throwIfAborted();
    if (cached) return cached;
    const response = await fetchImpl(`${base}discovery.json`, { signal, credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error('The published collection could not be loaded. Reload the page and try again.');
    const data = await response.json();
    if (data?.schemaVersion !== 1 || !Array.isArray(data.records)) throw new Error('The published collection is invalid.');
    const ids = new Set(), urls = new Set();
    const records = data.records.filter(record => {
      const image = normalizeArtwork(record);
      if (!image || !Number.isSafeInteger(record.objectid) || record.objectid < 1 || ids.has(record.objectid) || urls.has(image.url)) return false;
      ids.add(record.objectid); urls.add(image.url); return true;
    });
    if (!records.length) throw new Error('The published collection contains no viewable artwork.');
    signal?.throwIfAborted();
    cached = { ...data, records }; return cached;
  }
  function read(key, fallback) {
    try { return JSON.parse(storage().getItem(prefix + key)) ?? fallback; } catch { return fallback; }
  }
  function write(key, value) {
    try { storage().setItem(prefix + key, JSON.stringify(value)); }
    catch { throw new Error('Browser storage is unavailable or full. Allow site storage to save your presets.'); }
  }
  function presets() {
    const value = read('presets', []);
    const ids = new Set(starterPresets.map(preset => preset.id)), names = new Set(starterPresets.map(preset => lower(preset.name)));
    if (!Array.isArray(value) || value.length > 30) return [];
    try {
      return value.map(preset => {
        if (!preset || typeof preset.id !== 'string' || !/^[\w-]{1,80}$/.test(preset.id) || ids.has(preset.id) || typeof preset.name !== 'string' || !preset.name.trim() || preset.name.length > 60 || hasControlCharacters(preset.name) || names.has(lower(preset.name))) throw new Error();
        ids.add(preset.id); names.add(lower(preset.name));
        return { id: preset.id, name: preset.name, filters: validateFilters(preset.filters), builtIn: false };
      });
    } catch { return []; }
  }
  async function restore(signal) {
    const selection = read('gallery', null);
    if (!Array.isArray(selection?.ids) || !selection.ids.length || selection.ids.length > 500) return null;
    const data = await catalog(signal);
    const byId = new Map(data.records.map(record => [record.objectid, record]));
    const records = [...new Set(selection.ids)].map(id => byId.get(id)).filter(Boolean);
    return records.length ? { ...data, records } : null;
  }
  async function request(path, { signal, method = 'GET', body } = {}) {
    signal?.throwIfAborted();
    if (method === 'GET' && ['config', 'types'].includes(path)) {
      const data = await catalog(signal);
      const types = [...new Set(data.records.map(record => record.classification).filter(type => typeof type === 'string' && type))].sort();
      return { configured: true, mode: 'catalog', count: data.records.length, refreshedAt: data.refreshedAt, types, presets: [...starterPresets, ...presets()] };
    }
    if (method === 'GET' && path.startsWith('artists?')) {
      const term = new URLSearchParams(path.split('?')[1]).get('q');
      if (!term || term.trim().length < 2 || term.length > 120 || hasControlCharacters(term)) throw new Error('Enter between 2 and 120 characters to find an artist.');
      const data = await catalog(signal), found = new Map();
      for (const record of data.records) for (const person of people(record)) {
        const name = person.displayname || person.name;
        if (Number.isSafeInteger(person.personid) && person.personid > 0 && lower(name).includes(lower(term.trim()))) found.set(person.personid, { id: person.personid, name, dates: '', culture: '' });
      }
      return { artists: [...found.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20) };
    }
    if (path === 'build' && method === 'POST') {
      const filters = validateFilters(body), data = await catalog(signal);
      const matching = filterCatalog(data.records, filters);
      if (!matching.length) throw new Error('No artwork in the published collection matched these filters. Try fewer filters. Your saved gallery is unchanged.');
      const records = [...matching];
      for (let index = records.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [records[index], records[other]] = [records[other], records[index]];
      }
      records.length = Math.min(filters.limit, records.length);
      signal?.throwIfAborted();
      let saved = true;
      try { write('gallery', { ids: records.map(record => record.objectid) }); } catch { saved = false; }
      return { catalog: { ...data, source: { ...data.source, filters }, records }, summary: { requested: filters.limit, returned: records.length, matched: matching.length, truncated: false, saved } };
    }
    const current = presets();
    if (path === 'presets' && method === 'POST') {
      if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 60 || hasControlCharacters(body.name)) throw new Error('Give the preset a name between 1 and 60 characters.');
      const name = body.name.trim();
      if (body.id && !current.some(preset => preset.id === body.id)) throw new Error('That saved preset no longer exists.');
      if (!body.id && current.length >= 30) throw new Error('You can save up to 30 presets. Delete one before adding another.');
      if ([...starterPresets, ...current].some(preset => preset.id !== body.id && lower(preset.name) === lower(name))) throw new Error('A preset already has that name. Choose another name.');
      const preset = { id: body.id || crypto.randomUUID(), name, filters: validateFilters(body.filters ?? defaultFilters), builtIn: false };
      const updated = [...current.filter(item => item.id !== preset.id), preset];
      write('presets', updated); return { preset, presets: [...starterPresets, ...updated] };
    }
    if (path.startsWith('presets/') && method === 'DELETE') {
      const id = decodeURIComponent(path.slice('presets/'.length));
      if (!current.some(preset => preset.id === id)) throw new Error('Saved preset not found.');
      const updated = current.filter(preset => preset.id !== id);
      write('presets', updated); return { presets: [...starterPresets, ...updated] };
    }
    throw new Error('Gallery action not found.');
  }
  return { request, restore };
}
export const staticGallery = createStaticGalleryService();
