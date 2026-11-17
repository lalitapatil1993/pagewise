import { CATEGORIES } from '../utils.js';
import BookCard from './BookCard.jsx';

export default function Catalog({ books, category, sort, onCategory, onSort, wish, onDetails, onAdd, onToggleWish }) {
  return (
    <main id="catalog" className="container">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="chip"
              aria-pressed={c === category}
              onClick={() => onCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label htmlFor="sort-select" className="sr-only">Sort books</label>
          <select id="sort-select" value={sort} onChange={(e) => onSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <p className="result-count" aria-live="polite">
        {books.length} book{books.length === 1 ? '' : 's'} found
      </p>
      <div className="grid">
        {books.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            wished={wish.includes(b.id)}
            onDetails={onDetails}
            onAdd={onAdd}
            onToggleWish={onToggleWish}
          />
        ))}
      </div>
      {books.length === 0 && (
        <p className="empty">No books match your search. Try a different keyword or category.</p>
      )}
    </main>
  );
}
