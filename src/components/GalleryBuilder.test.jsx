import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import ThumbnailBrowser from './ThumbnailBrowser.jsx';
import { artTypes, defaultFilters, starterPresets } from '../data/gallery-filters.js';
import { records, response } from '../../tests/fixtures.js';

let presets, failures, configured, created, buildSignal;
beforeEach(() => {
  presets = [...starterPresets]; failures = new Map(); configured = true;
  created = [{ ...records[0], objectid: 100, title: 'New artwork' }, { ...records[1], objectid: 101 }];
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    const path = String(url).replace('/api/gallery/', '');
    if (failures.has(path)) return failures.get(path)(options);
    if (path === 'config') return response({ configured, types: artTypes, presets });
    if (path === 'types') return response({ types: artTypes });
    if (path.startsWith('artists?')) return response({ artists: [{ id: 27651, name: 'Claude Monet', dates: '1840–1926', culture: 'French' }, { id: 2, name: 'Another Artist' }] });
    if (path === 'build') {
      buildSignal = options.signal;
      return response({ catalog: { schemaVersion: 1, records: created }, summary: { returned: created.length, requested: JSON.parse(options.body).limit, truncated: false } });
    }
    if (path === 'presets') {
      const payload = JSON.parse(options.body);
      const preset = { ...payload, id: payload.id || 'custom-1', builtIn: false };
      presets = [...presets.filter(item => item.id !== preset.id), preset];
      return response({ presets, preset });
    }
    if (path.startsWith('presets/')) { presets = presets.filter(item => item.id !== path.split('/')[1]); return response({ presets }); }
    return response(records);
  }));
});
async function openBuilder() {
  const view = render(<App />); await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Start viewing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Build a gallery', exact: true }));
  await act(async () => {});
  return view;
}
const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = name => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const fail = message => async () => ({ ok: false, json: async () => ({ error: message }) });

it('builds a combined filtered gallery with a resolved artist and restores focus', async () => {
  await openBuilder();
  click('Clear art types'); fireEvent.click(screen.getByRole('checkbox', { name: 'Prints', exact: true }));
  fill('Find an artist', 'Monet'); expect(screen.getByRole('button', { name: 'Build gallery' })).toBeDisabled();
  click('Find artist'); await act(async () => {});
  click('Claude Monet · 1840–1926 · French');
  fill('Culture', 'Japanese'); fill('Subject or keyword', 'landscape'); fill('From year', '1800'); fill('To year', '1899'); fill('Medium', 'watercolor'); fill('Technique', 'woodcut'); fill('Maximum artworks', '20');
  click('Build gallery'); await act(async () => {});
  const call = fetch.mock.calls.find(([url]) => url === '/api/gallery/build');
  expect(JSON.parse(call[1].body)).toEqual({ ...defaultFilters, types: ['Prints'], artistId: 27651, artistName: 'Claude Monet', culture: 'Japanese', keyword: 'landscape', fromYear: 1800, toYear: 1899, medium: 'watercolor', technique: 'woodcut', limit: 20 });
  expect(screen.getByRole('img')).toHaveAccessibleName('New artwork — Artist 0');
  expect(screen.getByText(/Your gallery is ready: 2/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Build a gallery', exact: true })).toHaveFocus();
  expect(buildSignal.aborted).toBe(true);
  click('Dismiss gallery message'); expect(screen.queryByText(/Your gallery is ready/)).not.toBeInTheDocument();
  click('Settings'); click('View sample artwork'); await act(async () => {});
  click('Settings'); click('Return to catalog'); await act(async () => {});
  expect(screen.getByRole('img')).toHaveAccessibleName('New artwork — Artist 0');
});
it('loads presets and saves, updates, and deletes a custom named preset', async () => {
  await openBuilder(); fill('Named preset', 'japanese');
  expect(screen.getByLabelText('From year')).toHaveValue(1800);
  expect(screen.getByRole('checkbox', { name: 'Prints', exact: true })).toBeChecked();
  fill('Preset name', 'My prints'); click('Save preset'); await act(async () => {});
  expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent('Saved “My prints”');
  fill('Preset name', 'My Japanese prints'); click('Update preset'); await act(async () => {});
  expect(screen.getByRole('option', { name: 'My Japanese prints' })).toBeInTheDocument();
  click('Delete preset'); await act(async () => {});
  expect(screen.queryByRole('option', { name: 'My Japanese prints' })).not.toBeInTheDocument();
  fill('Named preset', 'paintings'); fill('Named preset', ''); expect(screen.getByLabelText('Culture')).toHaveValue('');
  expect(screen.getByLabelText('Maximum artworks')).toHaveValue(100);
});
it('clears artist selections and handles no matches and search errors', async () => {
  await openBuilder(); fill('Find an artist', 'Monet'); click('Find artist'); await act(async () => {});
  click('Another Artist'); expect(screen.getByText('Selected: Another Artist')).toBeInTheDocument();
  click('Clear artist'); expect(screen.getByLabelText('Find an artist')).toHaveValue('');
  failures.set('artists?q=Unknown', async () => response({ artists: [] }));
  fill('Find an artist', 'Unknown'); click('Find artist'); await act(async () => {});
  expect(screen.getByText(/No artists found/)).toBeInTheDocument();
  failures.set('artists?q=Unknown', fail('Artist search failed')); click('Find artist'); await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('Artist search failed');
});
it('keeps the current gallery on failed or invalid builds', async () => {
  await openBuilder(); fill('From year', '1900'); fill('To year', '1800'); click('Build gallery'); await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('starting year');
  fill('From year', ''); fill('To year', '');
  failures.set('build', fail('No viewable artwork matched')); click('Build gallery'); await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('No viewable artwork matched');
  click('Close Build a gallery'); expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it('reports partial search limits without claiming all requested artworks were found', async () => {
  failures.set('build', async () => response({ catalog: { schemaVersion: 1, records: created }, summary: { returned: 2, requested: 2, truncated: true } }));
  await openBuilder(); click('Build gallery'); await act(async () => {});
  expect(screen.getByText(/Search stopped at the page limit/)).toBeInTheDocument();
});
it('shows a useful service error while keeping the static catalog playable', async () => {
  failures.set('config', async () => { throw new TypeError('offline'); });
  await openBuilder(); expect(screen.getByRole('alert')).toHaveTextContent('local gallery service is unavailable');
  expect(screen.getByRole('button', { name: 'Build gallery' })).toBeDisabled();
  click('Close Build a gallery'); expect(screen.getByRole('img')).toBeInTheDocument();
});
it('allows preset storage but disables discovery when a key is not configured', async () => {
  configured = false; await openBuilder();
  expect(screen.getByText(/Add your Harvard key/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Build gallery' })).toBeDisabled();
  fill('Preset name', 'Later'); expect(screen.getByRole('button', { name: 'Save preset' })).toBeEnabled();
});
it('retains common types if vocabulary loading fails and reports preset save/delete errors', async () => {
  failures.set('types', fail('Types unavailable')); await openBuilder();
  expect(screen.getByRole('checkbox', { name: 'Paintings', exact: true })).toBeInTheDocument();
  failures.set('presets', fail('Duplicate preset name')); fill('Preset name', 'Existing'); click('Save preset'); await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('Duplicate preset name');
  failures.delete('presets'); click('Save preset'); await act(async () => {});
  failures.set('presets/custom-1', fail('Delete failed')); click('Delete preset'); await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('Delete failed');
});
it('cancels a pending build and ignores its late response', async () => {
  let release, signal;
  failures.set('build', options => { signal = options.signal; return new Promise(resolve => { release = resolve; }); });
  await openBuilder(); click('Build gallery');
  expect(screen.getByText('Finding artwork and saving your gallery…')).toBeInTheDocument();
  click('Cancel request'); expect(signal.aborted).toBe(true);
  await act(async () => release(response({ catalog: { schemaVersion: 1, records: created }, summary: { returned: 2 } })));
  expect(screen.getByRole('dialog', { name: 'Build a gallery' })).toBeInTheDocument();
  click('Close Build a gallery'); expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it('aborts pending startup and artist searches on unmount', async () => {
  let startupSignal, release;
  failures.set('config', options => { startupSignal = options.signal; return new Promise(resolve => { release = resolve; }); });
  const view = await openBuilder(); view.unmount(); expect(startupSignal.aborted).toBe(true);
  await act(async () => release(response({ configured: true, types: artTypes, presets })));
  failures.delete('config');
  let artistSignal;
  failures.set('artists?q=Monet', options => { artistSignal = options.signal; return new Promise(() => {}); });
  const next = await openBuilder(); fill('Find an artist', 'Monet'); click('Find artist'); next.unmount(); expect(artistSignal.aborted).toBe(true);
});
it('browses, searches, pages, and opens a thumbnail with focus restored', async () => {
  const many = Array.from({ length: 30 }, (_, index) => ({ ...records[0], objectid: index, title: `Picture ${index}`, primaryimageurl: `https://images.example.test/${index}.jpg` }));
  fetch.mockImplementationOnce(async () => response(many));
  await openBuilder(); click('Close Build a gallery'); click('Browse artwork');
  const dialog = screen.getByRole('dialog', { name: 'Browse artwork' });
  expect(within(dialog).getAllByRole('button', { name: /^View Picture/ })).toHaveLength(24);
  fireEvent.error(dialog.querySelector('img')); expect(dialog.querySelector('img').hidden).toBe(true);
  click('Next page'); expect(screen.getByText('Page 2 of 2')).toBeInTheDocument(); click('Previous page');
  fill('Search this gallery', 'no matches'); expect(screen.getByText(/No artworks match/)).toBeInTheDocument();
  fill('Search this gallery', 'Picture 29'); expect(screen.getByText('1 artwork in this gallery')).toBeInTheDocument();
  click('View Picture 29'); expect(screen.getByRole('img')).toHaveAccessibleName('Picture 29 — Artist 0');
  expect(screen.getByRole('button', { name: 'Browse artwork', exact: true })).toHaveFocus();
});
it('falls back from an unavailable small thumbnail and shows the museum metadata', async () => {
  const url = 'https://nrs.harvard.edu/urn-3:HUAM:123';
  fetch.mockImplementationOnce(async () => response([{ ...records[0], primaryimageurl: url, url: 'https://harvardartmuseums.org/collections/object/42', classification: 'Prints', culture: 'Japanese', medium: 'Ink', technique: 'Woodcut' }]));
  await openBuilder(); click('Close Build a gallery'); click('Browse artwork');
  const thumbnail = screen.getByRole('dialog').querySelector('img');
  expect(thumbnail.src).toContain('!320,320'); fireEvent.error(thumbnail);
  expect(thumbnail.src).toBe(url); expect(thumbnail.hidden).toBe(false);
  fireEvent.error(thumbnail); expect(thumbnail.hidden).toBe(true);
  click('Close Browse artwork'); click('Artwork details');
  for (const value of ['Prints', 'Japanese', 'Ink', 'Woodcut']) expect(screen.getByText(value)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View at Harvard Art Museums' })).toHaveAttribute('href', 'https://harvardartmuseums.org/collections/object/42');
});
it('keeps thumbnail pagination valid when a broken artwork is removed during browsing', () => {
  const images = Array.from({ length: 25 }, (_, index) => ({ id: String(index), title: `Picture ${index}`, artist: 'An artist', url: `/art-${index}.jpg` }));
  const view = render(<ThumbnailBrowser images={images} currentIndex={0} onSelect={() => {}} close={() => {}} />);
  click('Next page'); expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  view.rerender(<ThumbnailBrowser images={images.slice(0, 24)} currentIndex={0} onSelect={() => {}} close={() => {}} />);
  expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^View Picture/ })).toHaveLength(24);
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});
it('requires choosing a searched artist before saving its preset', async () => {
  await openBuilder(); fill('Preset name', 'Artist selection'); fill('Find an artist', 'Monet');
  expect(screen.getByRole('button', { name: 'Save preset' })).toBeDisabled();
  click('Find artist'); await act(async () => {}); click('Claude Monet · 1840–1926 · French');
  expect(screen.getByRole('button', { name: 'Save preset' })).toBeEnabled();
});
