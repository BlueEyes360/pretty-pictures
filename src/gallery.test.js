import { expect, it } from 'vitest';
import { galleryReducer as reduce, initialGallery } from './gallery.js';
import { normalizeCollection } from './data/artworks.js';
import { records } from '../tests/fixtures.js';

const ready = () => ({ ...reduce(initialGallery(), { type: 'loaded', images: normalizeCollection(records) }), random: false, imageReady: true });
it('walks every image in both directions and wraps at either end', () => {
  let state = ready();
  for (const expected of [1, 2, 0]) { state = reduce(state, { type: 'step', direction: 1 }); expect(state.index).toBe(expected); }
  state = reduce(state, { type: 'step', direction: -1 });
  expect(state.index).toBe(2);
});
it('shuffle selects only unvisited artwork', () => {
  for (const [random, expected] of [[0, 1], [0.5, 2], [0.999999, 2]]) {
    expect(reduce({ ...ready(), random: true }, { type: 'step', random }).index).toBe(expected);
  }
});
it('a direct selection of the current artwork preserves readiness and resets the timer', () => {
  expect(reduce({ ...ready(), random: true }, { type: 'select', index: 0 })).toMatchObject({ index: 0, imageReady: true, revision: 1 });
});
it.each([0, 0.49, 0.999999, -1, 2, NaN])('visits every artwork once per shuffle pass, including pass boundaries: %s', random => {
  let state = { ...ready(), random: true };
  let last = -1;
  for (let pass = 0; pass < 10; pass++) {
    const seen = new Set();
    for (let item = 0; item < 3; item++) {
      expect(state.index).not.toBe(last); seen.add(state.index); last = state.index;
      state = reduce(state, { type: 'step', direction: 1, random });
    }
    expect(seen.size).toBe(3);
  }
});
it('previous and forward retrace shuffle history without drawing another unseen artwork', () => {
  let state = { ...ready(), random: true };
  expect(reduce(state, { type: 'step', direction: -1 })).toBe(state);
  state = reduce(state, { type: 'step', direction: 1, random: 0.99 });
  const remaining = state.remaining;
  state = reduce(state, { type: 'step', direction: -1 }); expect(state.index).toBe(0);
  state = reduce(state, { type: 'step', direction: 1, random: 0 }); expect(state.index).toBe(2); expect(state.remaining).toEqual(remaining);
  state = reduce(state, { type: 'step', direction: 1, random: 0 }); expect(state.index).toBe(1);
});
it('thumbnail selection consumes unseen artwork and can intentionally revisit seen works', () => {
  let state = { ...ready(), random: true };
  state = reduce(state, { type: 'select', index: 2 });
  state = reduce(state, { type: 'select', index: 0 });
  expect(reduce(state, { type: 'step', direction: 1, random: 0.99 }).index).toBe(1);
  for (const index of [-1, 4, 1.5]) expect(reduce(state, { type: 'select', index })).toBe(state);
});
it('keeps the shuffle consistent when an artwork fails and when the mode changes', () => {
  let state = { ...ready(), random: true };
  state = reduce(state, { type: 'step', direction: 1, random: 0 });
  state = reduce(state, { type: 'imageFailed', url: state.images[1].url });
  expect(state.images[state.index].title).toBe('Artwork 2');
  expect(state.remaining).toEqual([]);
  state = reduce(state, { type: 'random', value: false });
  expect(state.history).toEqual([state.index]);
  state = reduce(state, { type: 'random', value: true });
  expect(state.remaining).not.toContain(state.index);
  expect(reduce(initialGallery(), { type: 'loaded', images: [] }).status).toBe('error');
});
it('bounds viewing history during long playback sessions', () => {
  let state = { ...ready(), random: true };
  for (let index = 0; index < 1100; index++) state = reduce(state, { type: 'step', direction: 1, random: 0 });
  expect(state.history).toHaveLength(1000); expect(state.cursor).toBe(999);
});
it('keeps shared image URLs ready when moving between distinct catalog entries', () => {
  const state = ready();
  state.images[1] = { ...state.images[1], url: state.images[0].url };
  expect(reduce(state, { type: 'step', direction: 1 })).toMatchObject({ index: 1, imageReady: true, revision: 1 });
});
it.each([0, 1])('navigation is safe with %i images', count => {
  const state = { ...ready(), images: ready().images.slice(0, count) };
  expect(reduce(state, { type: 'step', direction: -1 })).toBe(state);
  expect(reduce(initialGallery(), { type: 'step', direction: 1 })).toEqual(initialGallery());
});
it('ignores stale image events and removes broken images without invalid indexes', () => {
  const state = { ...ready(), index: 2 };
  expect(reduce(state, { type: 'imageReady', url: state.images[0].url })).toBe(state);
  expect(reduce(state, { type: 'imageFailed', url: state.images[0].url })).toBe(state);
  expect(reduce(state, { type: 'imageFailed', url: state.images[2].url })).toMatchObject({ index: 0, status: 'ready', imageReady: false });
});
it.each([[-10, 1], [0, 1], [5, 5], [120, 120], [900, 120], [4.5, 5]])('bounds timer input %s to %s seconds', (value, expected) => {
  expect(reduce(ready(), { type: 'seconds', value }).seconds).toBe(expected);
});
it('ignores invalid timer input and unknown events', () => {
  const state = ready();
  expect(reduce(state, { type: 'seconds', value: 'bad' })).toBe(state);
  expect(reduce(state, { type: 'unknown' })).toBe(state);
});
