import Cover from './Cover.jsx';
import Drawer from './Drawer.jsx';
import { BOOKS_BY_ID, cartTotals, money } from '../utils.js';

export default function CartDrawer({ open, cart, onClose, onChangeQty, onClear, onCheckout }) {
  const ids = Object.keys(cart).map(Number).filter((id) => BOOKS_BY_ID.has(id));
  const { subtotal, shipping, total } = cartTotals(cart);

  const footer = (
    <>
      <div className="row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
      <div className="row muted">
        <span>Shipping</span>
        <span>{shipping ? money(shipping) : (subtotal ? 'Free' : money(0))}</span>
      </div>
      <div className="row total"><span>Total</span><strong>{money(total)}</strong></div>
      <button type="button" className="btn btn-primary btn-block" disabled={ids.length === 0} onClick={onCheckout}>
        Checkout
      </button>
      {ids.length > 0 && (
        <button type="button" className="btn btn-link btn-block" onClick={onClear}>Clear cart</button>
      )}
    </>
  );

  return (
    <Drawer id="cart-drawer" open={open} title="Your cart" closeLabel="Close cart" onClose={onClose} footer={footer}>
      <ul className="cart-list">
        {ids.map((id) => {
          const b = BOOKS_BY_ID.get(id);
          const q = cart[id];
          return (
            <li className="cart-item" key={id}>
              <Cover book={b} className="mini-cover" />
              <div>
                <h3>{b.title}</h3>
                <p>{b.author}</p>
                <div className="qty">
                  <button type="button" aria-label={`Decrease quantity of ${b.title}`} onClick={() => onChangeQty(id, -1)}>−</button>
                  <span aria-live="polite">{q}</span>
                  <button type="button" aria-label={`Increase quantity of ${b.title}`} onClick={() => onChangeQty(id, 1)}>+</button>
                </div>
              </div>
              <div className="item-right">
                <strong>{money(b.price * q)}</strong>
                <button type="button" className="remove" onClick={() => onChangeQty(id, -Infinity)}>Remove</button>
              </div>
            </li>
          );
        })}
      </ul>
      {ids.length === 0 && <p className="empty">Your cart is empty.</p>}
    </Drawer>
  );
}
