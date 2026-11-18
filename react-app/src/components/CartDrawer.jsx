import { useState } from 'react';
import Cover from './Cover.jsx';
import Drawer from './Drawer.jsx';
import { FREE_SHIPPING_OVER, cartTotals, isPromo, money } from '../utils.js';

export default function CartDrawer({ open, cart, promo, onClose, onChangeQty, onClear, onCheckout, onApplyPromo, onRemovePromo }) {
  const entries = Object.values(cart);
  const t = cartTotals(cart, promo);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submitPromo = (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    if (!isPromo(c)) { setError('That code isn’t valid.'); onRemovePromo(); return; }
    setError('');
    setCode('');
    onApplyPromo(c);
  };

  const pct = Math.min(100, Math.round(t.subtotal / FREE_SHIPPING_OVER * 100));
  const header = t.subtotal > 0 && (
    <div className="ship-progress">
      <p>{t.subtotal >= FREE_SHIPPING_OVER ? '🎉 You’ve unlocked free shipping!' : `Add ${money(FREE_SHIPPING_OVER - t.subtotal)} more for free shipping`}</p>
      <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  const footer = (
    <>
      <form className="promo" autoComplete="off" onSubmit={submitPromo}>
        <label className="sr-only" htmlFor="promo-input">Promo code</label>
        <input id="promo-input" placeholder="Promo code (try WELCOME10)" maxLength="20" value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="btn btn-outline">Apply</button>
      </form>
      <p className={`promo-msg${promo && t.ok ? ' ok' : ''}`} aria-live="polite">
        {promo ? (
          <>{t.note} <button type="button" className="remove" onClick={() => { setError(''); onRemovePromo(); }}>Remove</button></>
        ) : error}
      </p>
      <div className="row"><span>Subtotal</span><strong>{money(t.subtotal)}</strong></div>
      {t.discount > 0 && <div className="row discount"><span>Discount</span><strong>−{money(t.discount)}</strong></div>}
      <div className="row muted">
        <span>Shipping</span>
        <span>{t.shipping ? money(t.shipping) : (t.subtotal ? 'Free' : money(0))}</span>
      </div>
      <div className="row total"><span>Total</span><strong>{money(t.total)}</strong></div>
      <button type="button" className="btn btn-primary btn-block" disabled={entries.length === 0} onClick={onCheckout}>
        Checkout
      </button>
      {entries.length > 0 && (
        <button type="button" className="btn btn-link btn-block" onClick={onClear}>Clear cart</button>
      )}
    </>
  );

  return (
    <Drawer id="cart-drawer" open={open} title="Your cart" closeLabel="Close cart" onClose={onClose} footer={footer} header={header}>
      <ul className="cart-list">
        {entries.map(({ book: b, qty: q }) => (
          <li className="cart-item" key={b.id}>
            <Cover book={b} className="mini-cover" size="S" />
            <div>
              <h3>{b.title}</h3>
              <p>{b.author}</p>
              <div className="qty">
                <button type="button" aria-label={`Decrease quantity of ${b.title}`} onClick={() => onChangeQty(b.id, -1)}>−</button>
                <span aria-live="polite">{q}</span>
                <button type="button" aria-label={`Increase quantity of ${b.title}`} onClick={() => onChangeQty(b.id, 1)}>+</button>
              </div>
            </div>
            <div className="item-right">
              <strong>{money(b.price * q)}</strong>
              <button type="button" className="remove" onClick={() => onChangeQty(b.id, -Infinity)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {entries.length === 0 && <p className="empty">Your cart is empty.</p>}
    </Drawer>
  );
}
