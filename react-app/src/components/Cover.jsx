export default function Cover({ book, className = '' }) {
  return (
    <div className={`cover ${className}`} style={{ background: book.color }} aria-hidden="true">
      <strong>{book.title}</strong>
      <span>{book.author}</span>
    </div>
  );
}
