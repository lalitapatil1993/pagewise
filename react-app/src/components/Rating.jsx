import { stars } from '../utils.js';

export default function Rating({ book, rating = book.rating, count = book.ratings, outOf = false }) {
  if (!rating) return <span className="rating none"><small>No ratings yet</small></span>;
  return (
    <span className="rating" aria-label={`Rated ${rating} out of 5`}>
      {stars(rating)}{' '}
      <small>
        {rating}{outOf ? ' / 5' : ''}{count ? ` (${count.toLocaleString('en-IN')})` : ''}
      </small>
    </span>
  );
}
