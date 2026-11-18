import { CATEGORY_LABELS } from '../api.js';
import { MAX_PRICE, filterOffline, money, refineBooks } from '../utils.js';
import BookCard from './BookCard.jsx';

function Skeletons() {
  return Array.from({ length: 8 }, (_, i) => (
    <article className="card skeleton" aria-hidden="true" key={i}>
      <div className="sk-cover" />
      <div className="card-body"><span className="sk-line" /><span className="sk-line short" /></div>
    </article>
  ));
}

export default function Catalog({
  live, query, category, sort, maxPrice, minRating, view,
  onCategory, onSort, onMaxPrice, onMinRating, onView, onResetFilters,
  wish, onDetails, onAdd, onToggleWish, onLoadMore, children
}) {
  const { offline, loading, loadingMore, books, total, canLoadMore, reload } = live;
  const source = offline ? filterOffline({ query, category }) : books;
  const list = refineBooks(source, { sort, maxPrice, minRating });
  const showSkeleton = loading && books.length === 0;
  const filtersOn = maxPrice < MAX_PRICE || minRating > 0;
  const wishedIds = new Set(wish.map((b) => b.id));

  let count = '';
  if (showSkeleton) count = 'Searching the library…';
  else if (offline) count = `${list.length} book${list.length === 1 ? '' : 's'} found (offline catalog)`;
  else if (total) count = `${list.length} shown · ${total.toLocaleString('en-IN')} matching books`;

  return (
    <main id="catalog" className="container">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          {CATEGORY_LABELS.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={c === category} onClick={() => onCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <div className="view-toggle" role="group" aria-label="Layout">
            <button type="button" className="icon-btn small" aria-pressed={view === 'grid'} aria-label="Grid view" title="Grid view" onClick={() => onView('grid')}>▦</button>
            <button type="button" className="icon-btn small" aria-pressed={view === 'list'} aria-label="List view" title="List view" onClick={() => onView('list')}>☰</button>
          </div>
          <label htmlFor="sort-select" className="sr-only">Sort books</label>
          <select id="sort-select" value={sort} onChange={(e) => onSort(e.target.value)}>
            <option value="popular">Most popular</option>
            <option value="rating">Top rated</option>
            <option value="new">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <div className="filters">
        <label className="filter">
          <span>Max price: <strong>{maxPrice >= MAX_PRICE ? `${money(MAX_PRICE)}+` : money(maxPrice)}</strong></span>
          <input type="range" min="300" max={MAX_PRICE} step="100" value={maxPrice} onChange={(e) => onMaxPrice(Number(e.target.value))} />
        </label>
        <label className="filter">
          <span>Min rating</span>
          <select value={minRating} onChange={(e) => onMinRating(Number(e.target.value))}>
            <option value="0">Any</option>
            <option value="3">3★ &amp; up</option>
            <option value="4">4★ &amp; up</option>
            <option value="4.5">4.5★ &amp; up</option>
          </select>
        </label>
        {filtersOn && <button type="button" className="btn btn-link" onClick={onResetFilters}>Reset filters</button>}
      </div>

      {offline && (
        <p className="banner">
          ⚠ Couldn’t reach the live book service – showing our offline catalog.
          <button type="button" className="btn btn-link" onClick={reload}>Retry</button>
        </p>
      )}

      <p className="result-count" aria-live="polite">{count}</p>
      <div className={`grid${view === 'list' ? ' list' : ''}`} aria-busy={loading}>
        {showSkeleton && !offline ? <Skeletons /> : list.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            wished={wishedIds.has(b.id)}
            onDetails={onDetails}
            onAdd={onAdd}
            onToggleWish={onToggleWish}
          />
        ))}
      </div>
      {!showSkeleton && list.length === 0 && (
        <p className="empty">No books match your search. Try a different keyword, category or filter.</p>
      )}
      <div className="load-more-wrap">
        {canLoadMore && !showSkeleton && (
          <button type="button" className="btn btn-outline" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading…' : 'Load more books'}
          </button>
        )}
      </div>

      {children}
    </main>
  );
}
