import { useEffect, useState } from 'react';
import { fetchDetails, fetchMoreByAuthor } from '../api.js';
import Cover from './Cover.jsx';
import BookStrip from './BookStrip.jsx';
import Modal from './Modal.jsx';
import Rating from './Rating.jsx';
import WishButton from './WishButton.jsx';
import { money } from '../utils.js';

// Loads the live description, rating breakdown and "more by author" for the open book.
function useBookExtras(book) {
  const [extra, setExtra] = useState({ loading: false });
  const [more, setMore] = useState([]);
  const id = book && book.id;

  useEffect(() => {
    setMore([]);
    if (!book) return undefined;
    if (book.offline) { setExtra({ loading: false, description: book.description }); return undefined; }
    const c = new AbortController();
    setExtra({ loading: true });
    fetchDetails(book.id, c.signal).then((x) => {
      if (c.signal.aborted) return;
      setExtra(x);
      if (book.author !== 'Unknown author') {
        fetchMoreByAuthor(book, c.signal).then((list) => { if (!c.signal.aborted) setMore(list); }).catch(() => {});
      }
    });
    return () => c.abort();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { extra, more };
}

function Content({ book, wished, onAdd, onToggleWish, onDetails }) {
  const { extra, more } = useBookExtras(book);
  const rating = extra.rating || book.rating;
  const count = extra.ratings || book.ratings;
  const subjects = (extra.subjects && extra.subjects.length ? extra.subjects : book.subjects || []).slice(0, 8);
  const meta = [`by ${book.author}`, book.category, book.year, book.pages ? `${book.pages} pages` : ''].filter(Boolean).join(' · ');
  const histTotal = extra.ratings || 0;

  return (
    <div className="dlg-body">
      <Cover book={book} size="L" />
      <div>
        <h2 id="dlg-title">{book.title}</h2>
        <p className="meta">{meta}</p>
        <Rating book={book} rating={rating} count={count} />
        <div className="desc">
          {extra.loading ? <p className="muted">Loading description…</p>
            : extra.description ? <p>{extra.description}</p>
              : <p className="muted">No description available for this book.</p>}
        </div>
        {subjects.length > 0 && (
          <p className="tags">{subjects.map((s) => <span className="tag" key={s}>{s}</span>)}</p>
        )}
        {extra.histogram && histTotal > 0 && (
          <div className="hist" aria-label="Rating breakdown">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = extra.histogram[n] || 0;
              return (
                <div className="hist-row" key={n}>
                  <span>{n}★</span>
                  <div className="hist-bar"><span style={{ width: `${Math.round(c / histTotal * 100)}%` }} /></div>
                  <span>{c}</span>
                </div>
              );
            })}
          </div>
        )}
        <span className="price">{money(book.price)}</span>
        <button type="button" className="btn btn-primary" onClick={() => onAdd(book)}>Add to cart</button>
        <WishButton book={book} active={wished} onToggle={onToggleWish} className="wish-text"> Wishlist</WishButton>
      </div>
      {more.length > 0 && (
        <section className="more">
          <h3>More by {book.author}</h3>
          <BookStrip books={more} onDetails={onDetails} />
        </section>
      )}
    </div>
  );
}

export default function BookDialog({ book, wished, onClose, onAdd, onToggleWish, onDetails }) {
  return (
    <Modal id="book-dialog" open={!!book} onClose={onClose} labelledBy="dlg-title">
      {book && <Content key={book.id} book={book} wished={wished} onAdd={onAdd} onToggleWish={onToggleWish} onDetails={onDetails} />}
    </Modal>
  );
}
