import Cover from './Cover.jsx';
import WishButton from './WishButton.jsx';
import { money, stars } from '../utils.js';

export default function BookCard({ book, wished, onDetails, onAdd, onToggleWish }) {
  return (
    <article className="card">
      <button
        type="button"
        className="cover-btn"
        aria-label={`View details for ${book.title}`}
        onClick={() => onDetails(book.id)}
      >
        <Cover book={book} />
      </button>
      <WishButton book={book} active={wished} onToggle={onToggleWish} className="wish-icon" />
      <div className="card-body">
        <h3 className="card-title">{book.title}</h3>
        <p className="card-author">{book.author}</p>
        <span className="rating" aria-label={`Rated ${book.rating} out of 5`}>
          {stars(book.rating)} <small>{book.rating}</small>
        </span>
        <div className="card-foot">
          <span className="price">{money(book.price)}</span>
          <button type="button" className="btn btn-primary" onClick={() => onAdd(book.id)}>Add to cart</button>
        </div>
      </div>
    </article>
  );
}
