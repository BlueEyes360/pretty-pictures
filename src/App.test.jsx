import { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { records, response } from '../tests/fixtures.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(records)));
});
async function mount(options = {}) {
  const view = render(<App {...options} />);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Start viewing' }));
  return view;
}
const imageLoaded = () => fireEvent.load(screen.getByRole('img'));
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next artwork' }));
const closeSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Close Settings' }));
function sequential(seconds) {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Randomize images' }));
  if (seconds) fireEvent.change(screen.getByRole('slider'), { target: { value: seconds } });
  closeSettings();
}
const tick = ms => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

it('mounts into a detached container and unmounts cleanly', async () => {
  const container = document.createElement('div');
  const view = render(<App />, { container });
  await act(async () => {});
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('keeps controls safe before loading and aborts work when unmounted', async () => {
  fetch.mockImplementation(() => new Promise(() => {}));
  const view = await mount();
  expect(screen.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Loading artwork');
  const signal = fetch.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  // A compliant fetch rejects on abort; even a noncompliant stub is bounded by the request timeout.
  await tick(15000);
});
it('navigates sequentially through the last image and wraps in both directions', async () => {
  await mount();
  sequential();
  for (const index of [1, 2, 0]) { next(); expect(screen.getByRole('img')).toHaveAccessibleName(`Artwork ${index} — Artist ${index}`); }
  fireEvent.click(screen.getByRole('button', { name: 'Previous artwork' }));
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 2 — Artist 2');
});
it('can randomly reach the last image', async () => {
  await mount();
  vi.spyOn(Math, 'random').mockReturnValue(0.99999);
  next();
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 2 — Artist 2');
});
it('applies the new timer immediately and waits for each image to load', async () => {
  await mount();
  sequential(5);
  await tick(10000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  imageLoaded();
  await tick(4999);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  await tick(1);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
  imageLoaded();
  await tick(5000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 2 — Artist 2');
});
it('manual navigation restarts the full interval', async () => {
  await mount(); sequential(5); imageLoaded();
  await tick(4000); next(); imageLoaded();
  await tick(4999);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
  await tick(1);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 2 — Artist 2');
});
it('pause/resume, dialogs and background tabs suspend autoplay', async () => {
  await mount(); sequential(1); imageLoaded();
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  await tick(60000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
  fireEvent.click(screen.getByRole('button', { name: 'Artwork details' }));
  await tick(60000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  fireEvent.click(screen.getByRole('button', { name: 'Close Artwork details' }));
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  fireEvent(document, new Event('visibilitychange'));
  await tick(60000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  fireEvent(document, new Event('visibilitychange'));
  await tick(1000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
});
it('starts paused when reduced motion is preferred', async () => {
  matchMedia.mockReturnValue({ matches: true });
  await mount(); imageLoaded();
  expect(screen.getByRole('button', { name: 'Resume' })).toHaveAttribute('aria-pressed', 'true');
  await tick(120000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it('cleans up the playback timer on unmount', async () => {
  const view = await mount(); imageLoaded();
  await tick(0);
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it('handles a single image without timers or invalid navigation', async () => {
  fetch.mockResolvedValue(response([records[0]]));
  await mount(); imageLoaded();
  await tick(0);
  expect(screen.getByRole('button', { name: 'Next artwork' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous artwork' })).toBeDisabled();
  expect(vi.getTimerCount()).toBe(0);
});
it('does not wait for a second load event when different records share an image', async () => {
  fetch.mockResolvedValue(response([records[0], { ...records[1], primaryimageurl: records[0].primaryimageurl }]));
  await mount(); sequential(5); imageLoaded(); next();
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
  expect(screen.queryByText('Loading image…')).not.toBeInTheDocument();
  await tick(5000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it.each([null, [], { a: null }])('shows an empty-state error and can retry %j', async payload => {
  fetch.mockResolvedValueOnce(response(payload));
  await mount();
  expect(screen.getByRole('alert')).toHaveTextContent('No viewable artwork');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it('recovers from network failure', async () => {
  fetch.mockRejectedValueOnce(new TypeError('offline'));
  await mount();
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to connect');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  expect(screen.getByRole('img')).toBeInTheDocument();
});
it('offers local artwork without network writes when the online database is unavailable', async () => {
  fetch.mockResolvedValue({ ok: false });
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'View sample artwork' }));
  await act(async () => {});
  expect(screen.getByRole('img')).toHaveAccessibleName('Sample artwork 1 — Artist unknown');
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'Return to catalog' }));
  await act(async () => {});
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
it('can select samples directly from Settings', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(screen.getByRole('button', { name: 'View sample artwork' }));
  await act(async () => {});
  expect(screen.getByRole('img')).toHaveAccessibleName('Sample artwork 1 — Artist unknown');
});
it('skips broken images and reports when all images fail', async () => {
  await mount();
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
  fireEvent.error(screen.getByRole('img'));
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('alert')).toHaveTextContent('artwork images could not be loaded');
  await tick(0);
  expect(vi.getTimerCount()).toBe(0);
});
it('skips an image that never fires load or error', async () => {
  await mount();
  await tick(14999);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
  await tick(1);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
  imageLoaded();
  await tick(15000);
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 1 — Artist 1');
});
it('shows metadata as text, including attack strings, and identifies creators correctly', async () => {
  const payload = '<img src=x onerror="window.pwned=true">';
  fetch.mockResolvedValue(response([{ ...records[0], title: payload, creditline: payload }]));
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Artwork details' }));
  expect(screen.getAllByText(payload)).toHaveLength(2);
  expect(screen.getByText('Artist 0')).toBeInTheDocument();
  expect(screen.queryByText('Previous owner 0')).not.toBeInTheDocument();
  expect(document.querySelector('dialog img')).toBeNull();
  expect(window.pwned).toBeUndefined();
});
it('cancels dialogs with Escape and restores focus to their trigger', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
});
it('ignores stale responses after the source changes', async () => {
  let oldResolve;
  fetch.mockImplementationOnce(() => new Promise(resolve => { oldResolve = resolve; }));
  const view = await mount({ imagesUrl: '/old' });
  view.rerender(<App imagesUrl="/new" />);
  await act(async () => {});
  await act(async () => oldResolve(response([{ ...records[0], title: 'Stale' }])));
  expect(screen.getByRole('img')).toHaveAccessibleName('Artwork 0 — Artist 0');
});
it('works under StrictMode without leaving duplicate timers', async () => {
  const view = render(<StrictMode><App /></StrictMode>);
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'Start viewing' }));
  imageLoaded();
  await tick(0);
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
