import Cover from './Cover.jsx';
import Rating from './Rating.jsx';
import WishButton from './WishButton.jsx';
import { money } from '../utils.js';

export default function BookCard({ book, wished, onDetails, onAdd, onToggleWish }) {
  return (
    <article className="card">
      <button
        type="button"
        className="cover-btn"
        aria-label={`View details for ${book.title}`}
        onClick={() => onDetails(book)}
      >
        <Cover book={book} />
      </button>
      <WishButton book={book} active={wished} onToggle={onToggleWish} className="wish-icon" />
      <div className="card-body">
        <h3 className="card-title">{book.title}</h3>
        <p className="card-author">{book.author}</p>
        <p className="card-meta">{[book.category, book.year].filter(Boolean).join(' · ')}</p>
        <Rating book={book} />
        <div className="card-foot">
          <span className="price">{money(book.price)}</span>
          <button type="button" className="btn btn-primary" onClick={() => onAdd(book)}>Add to cart</button>
        </div>
      </div>
    </article>
  );
}
