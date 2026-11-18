export default function WishButton({ book, active, onToggle, className = '', children }) {
  return (
    <button
      type="button"
      className={`wish-btn ${className}`}
      aria-pressed={active}
      aria-label={`Add ${book.title} to wishlist`}
      onClick={() => onToggle(book)}
    >
      <span className="w-off" aria-hidden="true">♡</span>
      <span className="w-on" aria-hidden="true">♥</span>
      {children}
    </button>
  );
}
