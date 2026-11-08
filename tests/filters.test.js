import { expect, it } from 'vitest';
import { defaultFilters, validateFilters, starterPresets } from '../src/data/gallery-filters.js';

it('validates built-in presets and normalizes form values', () => {
  for (const preset of starterPresets) expect(validateFilters(preset.filters)).toEqual(preset.filters);
  expect(validateFilters({ types: ['Prints', 'Prints'], culture: ' Japanese ', fromYear: '-200', toYear: '1900', artistId: '', limit: '20' })).toMatchObject({ types: ['Prints'], culture: 'Japanese', fromYear: -200, toYear: 1900, artistId: null, limit: 20 });
  expect(validateFilters({})).toEqual(defaultFilters);
});
it.each([null, [], 'bad', { toString: 'bad' }, { url: 'https://other.test' }, { types: 'Prints' }, { types: ['Paintings|Photographs'] }, { types: Array(13).fill('Prints') }, { culture: 12 }, { medium: 'a'.repeat(121) }, { keyword: 'hello\nworld' }, { fromYear: true }, { fromYear: '12.5' }, { fromYear: 'NaN' }, { fromYear: 0 }, { toYear: 2101 }, { fromYear: -5001 }, { fromYear: 1900, toYear: 1800 }, { artistId: 0 }, { artistName: 'Unresolved' }, { limit: 0 }, { limit: 501 }, { limit: true }, { limit: '1e2' }])('rejects invalid or unbounded filters %j', value => {
  expect(() => validateFilters(value)).toThrow();
});
