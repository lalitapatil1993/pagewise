import Cover from './Cover.jsx';
import Modal from './Modal.jsx';
import WishButton from './WishButton.jsx';
import { BOOKS_BY_ID, money, stars } from '../utils.js';

export default function BookDialog({ bookId, wished, onClose, onAdd, onToggleWish }) {
  const book = bookId == null ? null : BOOKS_BY_ID.get(bookId);

  return (
    <Modal id="book-dialog" open={!!book} onClose={onClose} labelledBy="dlg-title">
      {book && (
        <div className="dlg-body">
          <Cover book={book} />
          <div>
            <h2 id="dlg-title">{book.title}</h2>
            <p className="meta">by {book.author} · {book.category} · {book.year}</p>
            <span className="rating">{stars(book.rating)} <small>{book.rating} / 5</small></span>
            <p>{book.description}</p>
            <span className="price">{money(book.price)}</span>
            <button type="button" className="btn btn-primary" onClick={() => onAdd(book.id)}>Add to cart</button>
            <WishButton book={book} active={wished} onToggle={onToggleWish} className="wish-text"> Wishlist</WishButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
