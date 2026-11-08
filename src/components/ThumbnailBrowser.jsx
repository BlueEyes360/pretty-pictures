import { useState } from 'react';

export default function ThumbnailBrowser({ images, currentIndex, onSelect, close }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const results = images.map((image, index) => ({ image, index })).filter(({ image }) => [image.title, image.artist, image.culture, image.classification].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const pages = Math.max(1, Math.ceil(results.length / 24));
  const currentPage = Math.min(page, pages - 1);
  const shown = results.slice(currentPage * 24, (currentPage + 1) * 24);
  return <div className="thumbnail-browser">
    <label className="field">Search this gallery<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Title, artist, culture or art type" /></label>
    <p role="status">{results.length} {results.length === 1 ? 'artwork' : 'artworks'} in this gallery</p>
    <div className="thumbnail-grid">{shown.map(({ image, index }) => <button type="button" className="thumbnail" key={`${image.id}-${index}`} aria-label={`View ${image.title}`} aria-current={index === currentIndex ? 'true' : undefined} onClick={event => { onSelect(index); close(event); }}>
      <img src={image.thumbnail || image.url} alt="" loading="lazy" onError={event => {
        if (event.currentTarget.src !== new URL(image.url, window.location.href).href) event.currentTarget.src = image.url;
        else event.currentTarget.hidden = true;
      }} />
      <span className="thumbnail-title">{image.title}</span><span className="thumbnail-artist">{image.artist}</span>
    </button>)}</div>
    {!results.length && <p>No artworks match. Try another title or artist.</p>}
    <nav className="thumbnail-pages" aria-label="Thumbnail pages"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous page</button><span>Page {currentPage + 1} of {pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next page</button></nav>
  </div>;
}
