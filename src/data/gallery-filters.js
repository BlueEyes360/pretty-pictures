export const artTypes = ['Paintings', 'Drawings', 'Prints', 'Photographs', 'Sculpture', 'Calligraphy', 'Textile Arts', 'Vessels', 'Manuscripts', 'Jewelry'];
export const defaultFilters = { types: ['Paintings'], artistId: null, artistName: '', culture: '', fromYear: null, toYear: null, medium: '', technique: '', keyword: '', limit: 100 };
export const hasControlCharacters = value => [...value].some(character => character.charCodeAt(0) < 32);
export const starterPresets = [
  { id: 'paintings', name: 'Painting discoveries', filters: { ...defaultFilters }, builtIn: true },
  { id: 'landscapes', name: 'Landscape paintings', filters: { ...defaultFilters, keyword: 'landscape' }, builtIn: true },
  { id: 'japanese', name: 'Japanese prints · 1800–1899', filters: { ...defaultFilters, types: ['Prints'], culture: 'Japanese', fromYear: 1800, toYear: 1899 }, builtIn: true },
  { id: 'watercolors', name: 'Watercolors', filters: { ...defaultFilters, types: [], medium: 'watercolor' }, builtIn: true },
  { id: 'photography', name: 'Photography', filters: { ...defaultFilters, types: ['Photographs'] }, builtIn: true },
];

export function validateFilters(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose valid gallery filters.');
  if (Object.keys(input).some(key => !Object.hasOwn(defaultFilters, key))) throw new Error('Unknown gallery filter.');
  const filters = { ...defaultFilters, ...input };
  if (!Array.isArray(filters.types) || filters.types.length > 12 || filters.types.some(type => typeof type !== 'string' || !/^[\w &'(),-]{1,80}$/.test(type))) throw new Error('Choose up to 12 art types.');
  filters.types = [...new Set(filters.types)];
  for (const key of ['artistName', 'culture', 'medium', 'technique', 'keyword']) {
    if (typeof filters[key] !== 'string' || filters[key].length > 120 || hasControlCharacters(filters[key])) throw new Error(`${key} must be text of at most 120 characters.`);
    filters[key] = filters[key].trim();
  }
  for (const key of ['fromYear', 'toYear', 'artistId']) {
    const value = filters[key];
    if (value === '' || value === null) filters[key] = null;
    else {
      if (!['number', 'string'].includes(typeof value) || !/^-?\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new Error(`${key} must be a whole number.`);
      filters[key] = Number(value);
    }
  }
  if (filters.artistId !== null && filters.artistId < 1) throw new Error('Select an artist from the search results.');
  if (filters.artistName && !filters.artistId) throw new Error('Select an artist from the search results, or clear the artist.');
  if ([filters.fromYear, filters.toYear].some(value => value !== null && (value === 0 || value < -5000 || value > 2100))) throw new Error('Years must be between 5000 BCE and 2100 CE; there is no year zero.');
  if (filters.fromYear !== null && filters.toYear !== null && filters.fromYear > filters.toYear) throw new Error('The starting year must be before the ending year.');
  if (!['number', 'string'].includes(typeof filters.limit) || !/^\d+$/.test(String(filters.limit)) || Number(filters.limit) < 1 || Number(filters.limit) > 500) throw new Error('Choose between 1 and 500 artworks.');
  filters.limit = Number(filters.limit);
  return filters;
}
