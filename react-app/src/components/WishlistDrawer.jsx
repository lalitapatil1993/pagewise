import Cover from './Cover.jsx';
import Drawer from './Drawer.jsx';
import { BOOKS_BY_ID, money } from '../utils.js';

export default function WishlistDrawer({ open, wish, onClose, onAdd, onRemove, onClear }) {
  const books = wish.map((id) => BOOKS_BY_ID.get(id)).filter(Boolean);

  const footer = books.length > 0 && (
    <button type="button" className="btn btn-link btn-block" onClick={onClear}>Clear wishlist</button>
  );

  return (
    <Drawer id="wish-drawer" open={open} title="Your wishlist" closeLabel="Close wishlist" onClose={onClose} footer={footer}>
      <ul className="cart-list">
        {books.map((b) => (
          <li className="cart-item" key={b.id}>
            <Cover book={b} className="mini-cover" />
            <div>
              <h3>{b.title}</h3>
              <p>{b.author}</p>
              <button type="button" className="btn btn-primary" onClick={() => onAdd(b.id)}>Add to cart</button>
            </div>
            <div className="item-right">
              <strong>{money(b.price)}</strong>
              <button type="button" className="remove" onClick={() => onRemove(b.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {books.length === 0 && <p className="empty">Your wishlist is empty. Tap the heart on a book to save it.</p>}
    </Drawer>
  );
}
