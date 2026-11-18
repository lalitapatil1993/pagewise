import { useState } from 'react';
import { coverUrl } from '../api.js';

// Real cover image fades in over the generated cover; if it is missing the generated cover stays.
function CoverImage({ book, size }) {
  const [status, setStatus] = useState('loading');
  if (status === 'failed') return null;
  return (
    <img
      src={coverUrl(book, size)}
      alt=""
      loading="lazy"
      decoding="async"
      className={status === 'loaded' ? 'loaded' : undefined}
      onLoad={(e) => setStatus(e.currentTarget.naturalWidth > 1 ? 'loaded' : 'failed')}
      onError={() => setStatus('failed')}
    />
  );
}

export default function Cover({ book, className = '', size = 'M' }) {
  return (
    <div className={`cover ${className}`} style={{ background: book.color }} aria-hidden="true">
      <strong>{book.title}</strong>
      <span>{book.author}</span>
      {book.cover && <CoverImage key={book.cover} book={book} size={size} />}
    </div>
  );
}
