import { useEffect, useReducer, useRef, useState } from 'react';
import { loadArtworks, normalizeCollection } from './data/artworks.js';
import { galleryReducer, initialGallery } from './gallery.js';
import Modal from './components/Modal.jsx';
import GalleryBuilder from './components/GalleryBuilder.jsx';
import ThumbnailBrowser from './components/ThumbnailBrowser.jsx';
import { samples } from './data/samples.js';
import { staticGallery } from './data/static-gallery.js';
import './App.css';

const defaultUrl = import.meta.env.VITE_IMAGES_URL || `${import.meta.env.BASE_URL}gallery.json`;

export default function App({ imagesUrl = defaultUrl }) {
  const [gallery, dispatch] = useReducer(galleryReducer, undefined,
    () => initialGallery(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  const [request, setRequest] = useState(0);
  const [useSamples, setUseSamples] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState(null);
  const [galleryNotice, setGalleryNotice] = useState('');
  const [panel, setPanel] = useState('welcome');
  const [hidden, setHidden] = useState(document.hidden);
  const menuButton = useRef(null);
  const infoButton = useRef(null);
  const buildButton = useRef(null);
  const browseButton = useRef(null);
  const artwork = gallery.images[gallery.index];
  const canNavigate = gallery.status === 'ready' && gallery.images.length > 1;

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'loading' });
    const loading = useSamples ? Promise.resolve(samples) : activeCatalog ? Promise.resolve(normalizeCollection(activeCatalog)) : import.meta.env.VITE_GALLERY_MODE === 'static'
      ? staticGallery.restore(controller.signal).then(saved => saved ? normalizeCollection(saved) : loadArtworks(imagesUrl, { signal: controller.signal }))
      : loadArtworks(imagesUrl, { signal: controller.signal });
    loading.then(images => {
      if (!controller.signal.aborted) dispatch({ type: 'loaded', images });
    }).catch(error => {
      if (!controller.signal.aborted) dispatch({ type: 'error', message: error.message });
    });
    return () => controller.abort();
  }, [imagesUrl, request, useSamples, activeCatalog]);

  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!canNavigate || !gallery.imageReady || gallery.paused || panel || hidden) return;
    const timer = setTimeout(() => dispatch({ type: 'step', direction: 1, random: Math.random() }), gallery.seconds * 1000);
    return () => clearTimeout(timer);
  }, [canNavigate, gallery.imageReady, gallery.paused, gallery.seconds, gallery.index, gallery.revision, gallery.random, panel, hidden]);

  useEffect(() => {
    if (!artwork || gallery.imageReady) return;
    const timer = setTimeout(() => dispatch({ type: 'imageFailed', url: artwork.url }), 15000);
    return () => clearTimeout(timer);
  }, [artwork, gallery.imageReady]);

  const closePanel = () => {
    const target = panel === 'info' ? infoButton : panel === 'builder' ? buildButton : panel === 'browse' ? browseButton : menuButton;
    setPanel(null);
    target.current?.focus();
  };
  const step = direction => dispatch({ type: 'step', direction, random: Math.random() });

  return (
    <main className="app" aria-label="Art slideshow">
      <header className="top-bar">
        <h1>Pretty Pictures</h1>
        <div className="header-actions">
          <button ref={buildButton} type="button" onClick={() => setPanel('builder')} aria-haspopup="dialog">Build a gallery</button>
          <button ref={browseButton} type="button" disabled={!artwork} onClick={() => setPanel('browse')} aria-haspopup="dialog">Browse artwork</button>
          <button ref={menuButton} type="button" onClick={() => setPanel('settings')} aria-haspopup="dialog">Settings</button>
        </div>
      </header>
      {galleryNotice && <div className="gallery-notice"><span role="status">{galleryNotice}</span><button type="button" aria-label="Dismiss gallery message" onClick={() => setGalleryNotice('')}>×</button></div>}
      <div className="artwork-stage">
      {artwork && <img key={artwork.url} className="artwork" src={artwork.url} alt={`${artwork.title} — ${artwork.artist}`}
        onLoad={() => dispatch({ type: 'imageReady', url: artwork.url })}
        onError={() => dispatch({ type: 'imageFailed', url: artwork.url })} />}
      {gallery.status === 'loading' && <div className="status-card" role="status"><p>Loading artwork…</p></div>}
      {gallery.status === 'error' && <section className="status-card" aria-labelledby="error-title">
        <h2 id="error-title">Gallery unavailable</h2>
        <p role="alert">{gallery.error}</p>
        <button type="button" onClick={() => setRequest(value => value + 1)}>Try again</button>
        <button type="button" onClick={() => setUseSamples(true)}>View sample artwork</button>
      </section>}
      {artwork && !gallery.imageReady && <p className="image-loading" role="status">Loading image…</p>}
      </div>
      <footer className="bottom-bar">
        <div className="navigation" role="group" aria-label="Slideshow controls">
          <button type="button" aria-label="Previous artwork" disabled={!canNavigate} onClick={() => step(-1)}>← <span>Previous</span></button>
          <button type="button" disabled={!canNavigate} onClick={() => dispatch({ type: 'pause' })} aria-pressed={gallery.paused}>
            {gallery.paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" aria-label="Next artwork" disabled={!canNavigate} onClick={() => step(1)}><span>Next</span> →</button>
        </div>
        <div className="artwork-summary">
          <span className="position">{artwork ? `${gallery.index + 1} / ${gallery.images.length}` : 'No artwork'}</span>
          <button ref={infoButton} type="button" disabled={!artwork} onClick={() => setPanel('info')} aria-haspopup="dialog">Artwork details</button>
        </div>
      </footer>
      {panel === 'welcome' && <Modal title="Welcome to Pretty Pictures" titleId="welcome-title" onClose={closePanel}>
        {close => <><p>Enjoy a full-screen art slideshow, one picture at a time.</p>
        <p>Build a gallery around your interests, browse its artwork, or enjoy shuffle without repeats. Pause whenever you want a closer look.</p>
        <button type="button" className="primary" onClick={close}>Start viewing</button></>}
      </Modal>}
      {panel === 'settings' && <Modal title="Settings" titleId="settings-title" onClose={closePanel}>
        {close => <><label className="timer-label" htmlFor="TimerSlider">Time between pictures <output id="TimerValue" htmlFor="TimerSlider">{gallery.seconds} s</output></label>
        <input id="TimerSlider" type="range" min="1" max="120" step="1" value={gallery.seconds}
          aria-valuetext={`${gallery.seconds} seconds`} onChange={event => dispatch({ type: 'seconds', value: event.target.value })} />
        <label className="checkbox-label" htmlFor="RandomChoice"><input id="RandomChoice" type="checkbox" checked={gallery.random}
          onChange={event => dispatch({ type: 'random', value: event.target.checked })} />Randomize images</label>
        <p className="hint">Shuffle shows every artwork once per pass. Previous retraces your viewing history. Playback waits while a dialog is open or this tab is hidden; manual navigation restarts the timer.</p>
        <button type="button" className="gallery-switch" onClick={event => { setUseSamples(value => !value); close(event); }}>
          {useSamples ? 'Return to catalog' : 'View sample artwork'}
        </button></>}
      </Modal>}
      {panel === 'builder' && <Modal title="Build a gallery" titleId="builder-title" onClose={closePanel} wide>
        <GalleryBuilder onCreated={({ catalog, summary }) => {
          setActiveCatalog(catalog); setUseSamples(false);
          setGalleryNotice(`Your gallery is ready: ${summary.returned} artworks.${summary.returned < summary.requested ? ' Fewer viewable works were found than requested.' : ''}${summary.truncated ? ' Search stopped at the page limit; narrow the filters for more focused results.' : ''}${summary.saved === false ? ' Browser storage is unavailable; this selection will last until the page closes.' : ''}`);
          closePanel();
        }} />
      </Modal>}
      {panel === 'browse' && <Modal title="Browse artwork" titleId="browse-title" onClose={closePanel} wide>
        {close => <ThumbnailBrowser images={gallery.images} currentIndex={gallery.index} onSelect={index => dispatch({ type: 'select', index })} close={close} />}
      </Modal>}
      {panel === 'info' && <Modal title="Artwork details" titleId="info-title" onClose={closePanel}>
        {artwork ? <dl>
          <dt>Name</dt><dd>{artwork.title}</dd>
          <dt>Artist</dt><dd>{artwork.artist}</dd>
          <dt>Year</dt><dd>{artwork.dated}</dd>
          <dt>Provided by</dt><dd>{artwork.credit}</dd>
          {artwork.classification && <><dt>Art type</dt><dd>{artwork.classification}</dd></>}
          {artwork.culture && <><dt>Culture</dt><dd>{artwork.culture}</dd></>}
          {artwork.medium && <><dt>Medium</dt><dd>{artwork.medium}</dd></>}
          {artwork.technique && <><dt>Technique</dt><dd>{artwork.technique}</dd></>}
          {artwork.museumUrl && <><dt>Museum record</dt><dd><a href={artwork.museumUrl} target="_blank" rel="noreferrer">View at Harvard Art Museums</a></dd></>}
        </dl> : <p>No artwork is available.</p>}
      </Modal>}
    </main>
  );
}
