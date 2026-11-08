import { randomInt } from 'node:crypto';
import { hasControlCharacters, validateFilters } from '../src/data/gallery-filters.js';
import { catalogRecord } from '../scripts/refresh-catalog.mjs';

export const creatorRole = role => /^(Artist\b|Maker\b|Photographer\b|Sculptor\b|Painter\b|Draftsman\b)/i.test(role || '');
const literal = value => `"${value.replace(/([+\-=&|><!(){}[\]^"~*?:\\/])/g, '\\$1')}"`;

export function harvardQuery(filters, seed, page = 1) {
  const query = new URLSearchParams({ hasimage: '1', size: '100', page: String(page), sort: `random:${seed}`,
    fields: 'objectid,title,primaryimageurl,baseimageurl,people,dated,creditline,copyright,classification,culture,medium,technique,datebegin,dateend' });
  if (filters.types.length) query.set('classification', filters.types.join('|'));
  if (filters.artistId) query.set('person', String(filters.artistId));
  if (filters.keyword) query.set('keyword', filters.keyword);
  if (filters.technique) query.set('technique', filters.technique);
  const clauses = [];
  if (filters.culture) clauses.push(`culture:${literal(filters.culture)}`);
  if (filters.medium) clauses.push(`medium:${literal(filters.medium)}`);
  if (filters.fromYear !== null || filters.toYear !== null) {
    clauses.push(`datebegin:[* TO ${filters.toYear ?? '*'}]`, `dateend:[${filters.fromYear ?? '*'} TO *]`, 'NOT datebegin:0', 'NOT dateend:0');
  }
  if (clauses.length) query.set('q', clauses.join(' AND '));
  return query;
}

export function harvardClient({ apiKey, fetchImpl = globalThis.fetch }) {
  return async function request(endpoint, parameters, signal) {
    if (!apiKey) throw new Error('Harvard access is not configured. Add HARVARD_API_KEY to .env.harvard and restart the local service.');
    const url = new URL(`https://api.harvardartmuseums.org/${endpoint}`);
    url.search = new URLSearchParams(parameters);
    url.searchParams.set('apikey', apiKey);
    const providerSignal = AbortSignal.any([AbortSignal.timeout(15000), ...(signal ? [signal] : [])]);
    try {
      const response = await fetchImpl(url, { signal: providerSignal, credentials: 'omit', redirect: 'error' });
      if (!response.ok) throw new Error('Provider failed');
      const data = await response.json();
      if (!Array.isArray(data?.records) || !Number.isSafeInteger(data.info?.totalrecords) || data.info.totalrecords < 0) throw new Error('Invalid provider data');
      // Neither provider errors nor pagination links may expose credentials to the browser.
      return data;
    } catch {
      if (providerSignal.aborted) throw new DOMException('Gallery request cancelled.', providerSignal.reason?.name === 'TimeoutError' ? 'TimeoutError' : 'AbortError');
      throw new Error('Harvard could not complete the request. Please try again. Your saved gallery is unchanged.');
    }
  };
}

export async function findArtists(request, term, signal) {
  if (typeof term !== 'string' || term.trim().length < 2 || term.length > 120 || hasControlCharacters(term)) throw new Error('Enter between 2 and 120 characters to find an artist.');
  const data = await request('person', { q: `displayname:${literal(term.trim())}`, size: '30' }, signal);
  const found = new Map();
  for (const person of data.records) {
    const id = person?.personid ?? person?.id;
    if (!Number.isSafeInteger(id) || id < 1 || typeof person.displayname !== 'string' || !Array.isArray(person.roles) || !person.roles.some(item => creatorRole(item?.role))) continue;
    found.set(id, { id, name: person.displayname, dates: typeof person.displaydate === 'string' ? person.displaydate : '', culture: typeof person.culture === 'string' ? person.culture : '' });
  }
  return [...found.values()].slice(0, 20);
}

export async function buildGallery(request, input, { signal, seed = randomInt(1, 2147483647), maxPages = 20 } = {}) {
  const filters = validateFilters(input);
  const records = [];
  const ids = new Set();
  const urls = new Set();
  let skipped = 0, duplicates = 0, pages = 0, matched = 0, truncated = false;
  for (let page = 1; page <= maxPages; page++) {
    signal?.throwIfAborted();
    const data = await request('object', harvardQuery(filters, seed, page), signal);
    matched = data.info.totalrecords;
    if (matched === 0 && page === 1 && data.records.length === 0) break;
    if (data.info.page !== page || !Number.isSafeInteger(data.info.pages) || data.info.pages < page) throw new Error('Harvard returned incomplete results. Your saved gallery is unchanged.');
    pages = page;
    for (const raw of data.records) {
      const record = catalogRecord(raw);
      if (!record || (filters.artistId && (!Array.isArray(raw.people) || !raw.people.some(person => person?.personid === filters.artistId && creatorRole(person.role))))) { skipped++; continue; }
      if (ids.has(record.objectid) || urls.has(record.primaryimageurl)) { duplicates++; continue; }
      ids.add(record.objectid); urls.add(record.primaryimageurl); records.push(record);
      if (records.length === filters.limit) break;
    }
    if (records.length >= filters.limit || page === data.info.pages) break;
    if (page === maxPages) truncated = true;
  }
  signal?.throwIfAborted();
  if (!records.length) throw new Error('No viewable artwork matched these filters. Try fewer filters or a different artist. Your saved gallery is unchanged.');
  return {
    catalog: { schemaVersion: 1, refreshedAt: new Date().toISOString(), source: { provider: 'Harvard Art Museums', method: 'api', filters, seed }, records },
    summary: { requested: filters.limit, returned: records.length, skipped, duplicates, pages, matched, truncated },
  };
}
