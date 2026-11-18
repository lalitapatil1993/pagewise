import Cover from './Cover.jsx';

// Horizontal strip of small book covers (trending / recently viewed / more by author)
export default function BookStrip({ books, onDetails }) {
  return (
    <div className="trending-row">
      {books.map((b) => (
        <button
          key={b.id}
          type="button"
          className="mini"
          aria-label={`View details for ${b.title}`}
          onClick={() => onDetails(b)}
        >
          <Cover book={b} />
          <span className="mini-title">{b.title}</span>
          <span className="mini-author">{b.author}</span>
        </button>
      ))}
    </div>
  );
}
