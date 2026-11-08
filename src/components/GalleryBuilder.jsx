import { useEffect, useRef, useState } from 'react';
import { artTypes, defaultFilters, starterPresets, validateFilters } from '../data/gallery-filters.js';
import { galleryRequest } from '../data/gallery-service.js';

export default function GalleryBuilder({ onCreated }) {
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [types, setTypes] = useState(artTypes);
  const [presets, setPresets] = useState(starterPresets);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [artists, setArtists] = useState([]);
  const [artistNotice, setArtistNotice] = useState('');
  const [serviceReady, setServiceReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [publishedCount, setPublishedCount] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Loading gallery options…');
  const controller = useRef(null);
  useEffect(() => {
    const startup = new AbortController();
    galleryRequest('config', { signal: startup.signal }).then(data => {
      if (startup.signal.aborted) return;
      setServiceReady(true); setConfigured(data.configured); setPresets(data.presets); setTypes(data.types);
      if (data.mode === 'catalog') setPublishedCount(data.count);
      setNotice(data.configured ? '' : 'Add your Harvard key to .env.harvard and restart the app to build galleries.');
      if (data.configured) galleryRequest('types', { signal: startup.signal }).then(result => {
        if (!startup.signal.aborted) setTypes(result.types);
      }).catch(() => { /* Common art types remain usable if the vocabulary request fails. */ });
    }).catch(reason => { if (!startup.signal.aborted) { setNotice(''); setError(reason.message); } });
    return () => { startup.abort(); controller.current?.abort(); };
  }, []);
  const change = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const begin = operation => { controller.current?.abort(); controller.current = new AbortController(); setBusy(operation); setError(''); setNotice(''); return controller.current; };
  const searchArtists = async () => {
    const operation = begin('artists');
    try {
      const data = await galleryRequest(`artists?q=${encodeURIComponent(artistQuery)}`, { signal: operation.signal });
      if (operation.signal.aborted) return;
      setArtists(data.artists); setArtistNotice(data.artists.length ? 'Select the artist you mean below.' : 'No artists found. Try a surname or a different spelling.');
    } catch (reason) { if (!operation.signal.aborted) setError(reason.message); }
    finally { if (!operation.signal.aborted) setBusy(''); }
  };
  const choosePreset = id => {
    setSelected(id); setError(''); setNotice(''); setArtists([]); setArtistNotice('');
    const preset = presets.find(item => item.id === id);
    setFilters(preset ? { ...preset.filters } : { ...defaultFilters });
    setArtistQuery(preset?.filters.artistName || '');
    setName(preset ? preset.builtIn ? `${preset.name} copy` : preset.name : '');
  };
  const savePreset = async () => {
    const preset = presets.find(item => item.id === selected);
    const operation = begin('save');
    try {
      const data = await galleryRequest('presets', { method: 'POST', signal: operation.signal, body: { name, filters: validateFilters(filters), ...(preset && !preset.builtIn ? { id: preset.id } : {}) } });
      if (operation.signal.aborted) return;
      setPresets(data.presets); setSelected(data.preset.id); setNotice(`Saved “${data.preset.name}”.`);
    } catch (reason) { if (!operation.signal.aborted) setError(reason.message); }
    finally { if (!operation.signal.aborted) setBusy(''); }
  };
  const deletePreset = async () => {
    const operation = begin('delete');
    try {
      const data = await galleryRequest(`presets/${encodeURIComponent(selected)}`, { method: 'DELETE', signal: operation.signal });
      if (operation.signal.aborted) return;
      setPresets(data.presets); setSelected(''); setName(''); setNotice('Preset deleted. Your current gallery is unchanged.');
    } catch (reason) { if (!operation.signal.aborted) setError(reason.message); }
    finally { if (!operation.signal.aborted) setBusy(''); }
  };
  const build = async event => {
    event.preventDefault();
    const dialog = event.currentTarget.closest('dialog');
    const operation = begin('build');
    try {
      const data = await galleryRequest('build', { method: 'POST', signal: operation.signal, body: validateFilters(filters) });
      if (operation.signal.aborted) return;
      dialog.close(); onCreated(data);
    } catch (reason) { if (!operation.signal.aborted) setError(reason.message); }
    finally { if (!operation.signal.aborted) setBusy(''); }
  };
  const customSelected = presets.some(item => item.id === selected && !item.builtIn);
  return <div className="gallery-builder">
    <p className="builder-intro">Choose what you want to see. Your current gallery stays available until the new one is ready.</p>
    {publishedCount !== null && <p className="hint">Explore {publishedCount.toLocaleString()} artworks in the published Harvard collection. Searches use this selection; your saved galleries and presets stay in this browser.</p>}
    {error && <p className="form-message error-message" role="alert">{error}</p>}
    {notice && <p className="form-message" role="status">{notice}</p>}
    <label className="field">Named preset<select value={selected} disabled={!!busy} onChange={event => choosePreset(event.target.value)}>
      <option value="">Custom gallery</option>{presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
    </select></label>
    <form onSubmit={build}>
      <fieldset disabled={!!busy} className="filter-fields">
        <legend>Gallery filters</legend>
        <fieldset className="art-types"><legend>Art types <span className="optional">(none selected means all types)</span></legend>
          <div className="type-options">{[...new Set([...types, ...filters.types])].map(type => <label key={type} className="checkbox-label"><input type="checkbox" checked={filters.types.includes(type)} onChange={event => change('types', event.target.checked ? [...filters.types, type] : filters.types.filter(item => item !== type))} />{type}</label>)}</div>
          <button type="button" className="text-button" onClick={() => change('types', [])}>Clear art types</button>
        </fieldset>
        <div className="artist-picker">
          <label className="field">Find an artist<input value={artistQuery} maxLength={120} onChange={event => { setArtistQuery(event.target.value); change('artistId', null); change('artistName', ''); setArtists([]); setArtistNotice(''); }} placeholder="e.g. Claude Monet" /></label>
          <button type="button" disabled={!configured || artistQuery.trim().length < 2} onClick={searchArtists}>Find artist</button>
          {filters.artistId && <p className="selected-artist">Selected: {filters.artistName} <button type="button" onClick={() => { change('artistId', null); change('artistName', ''); setArtistQuery(''); setArtists([]); setArtistNotice(''); }}>Clear artist</button></p>}
          {artistNotice && <p role="status">{artistNotice}</p>}
          {artists.length > 0 && <ul className="artist-results">{artists.map(artist => <li key={artist.id}><button type="button" onClick={() => { change('artistId', artist.id); change('artistName', artist.name); setArtistQuery(artist.name); setArtists([]); setArtistNotice(''); }}>{artist.name}{artist.dates ? ` · ${artist.dates}` : ''}{artist.culture ? ` · ${artist.culture}` : ''}</button></li>)}</ul>}
          {artistQuery && !filters.artistId && <p className="hint">Choose a result to filter by artist. Typing a name alone does not select one.</p>}
        </div>
        <div className="filter-grid">
          <label className="field">Culture<input value={filters.culture} maxLength={120} onChange={event => change('culture', event.target.value)} placeholder="e.g. Japanese" /></label>
          <label className="field">Subject or keyword<input value={filters.keyword} maxLength={120} onChange={event => change('keyword', event.target.value)} placeholder="e.g. landscape" /></label>
          <label className="field">From year<input type="number" min="-5000" max="2100" value={filters.fromYear ?? ''} onChange={event => change('fromYear', event.target.value)} placeholder="e.g. 1800" /></label>
          <label className="field">To year<input type="number" min="-5000" max="2100" value={filters.toYear ?? ''} onChange={event => change('toYear', event.target.value)} placeholder="e.g. 1899" /></label>
          <label className="field">Medium<input value={filters.medium} maxLength={120} onChange={event => change('medium', event.target.value)} placeholder="e.g. watercolor" /></label>
          <label className="field">Technique<input value={filters.technique} maxLength={120} onChange={event => change('technique', event.target.value)} placeholder="e.g. woodcut" /></label>
          <label className="field">Maximum artworks<input type="number" min="1" max="500" required value={filters.limit} onChange={event => change('limit', event.target.value)} /></label>
        </div>
        <p className="hint">Filters combine. Dates include works whose estimated dates overlap your range; negative years mean BCE. Keyword results depend on museum descriptions. Some matching works have no available image.</p>
        <div className="preset-save"><label className="field">Preset name<input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="Name this selection" /></label>
          <button type="button" disabled={!serviceReady || !name.trim() || (!!artistQuery && !filters.artistId)} onClick={savePreset}>{customSelected ? 'Update preset' : 'Save preset'}</button>
          {customSelected && <button type="button" onClick={deletePreset}>Delete preset</button>}
        </div>
        <button className="primary" type="submit" disabled={!configured || (!!artistQuery && !filters.artistId)}>Build gallery</button>
      </fieldset>
    </form>
    {busy && <div className="build-progress" role="status"><p>{busy === 'build' ? 'Finding artwork and saving your gallery…' : busy === 'artists' ? 'Finding artists…' : 'Saving preset changes…'}</p>
      <button type="button" onClick={() => { controller.current?.abort(); setBusy(''); setNotice('Request cancelled. If a save had already completed, reopening the builder will show it.'); }}>Cancel request</button>
    </div>}
  </div>;
}
