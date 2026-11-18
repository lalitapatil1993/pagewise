import Cover from './Cover.jsx';
import Drawer from './Drawer.jsx';
import { money } from '../utils.js';

export default function WishlistDrawer({ open, wish, onClose, onAdd, onAddAll, onRemove, onClear }) {
  const footer = wish.length > 0 && (
    <>
      <button type="button" className="btn btn-outline btn-block" onClick={onAddAll}>Add all to cart</button>
      <button type="button" className="btn btn-link btn-block" onClick={onClear}>Clear wishlist</button>
    </>
  );

  return (
    <Drawer id="wish-drawer" open={open} title="Your wishlist" closeLabel="Close wishlist" onClose={onClose} footer={footer}>
      <ul className="cart-list">
        {wish.map((b) => (
          <li className="cart-item" key={b.id}>
            <Cover book={b} className="mini-cover" size="S" />
            <div>
              <h3>{b.title}</h3>
              <p>{b.author}</p>
              <button type="button" className="btn btn-primary" onClick={() => onAdd(b)}>Add to cart</button>
            </div>
            <div className="item-right">
              <strong>{money(b.price)}</strong>
              <button type="button" className="remove" onClick={() => onRemove(b)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {wish.length === 0 && <p className="empty">Your wishlist is empty. Tap the heart on a book to save it.</p>}
    </Drawer>
  );
}
