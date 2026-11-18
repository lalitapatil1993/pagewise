import Modal from './Modal.jsx';
import { fmtDate, money } from '../utils.js';

export default function OrdersDialog({ open, orders, onClose, onReorder }) {
  return (
    <Modal id="orders-dialog" open={open} onClose={onClose} labelledBy="orders-title">
      <div className="orders-body">
        <h2 id="orders-title">Your orders</h2>
        {orders.length === 0 && <p className="empty">No orders yet. Place one and it will show up here.</p>}
        <ul className="orders-list">
          {orders.map((o) => (
            <li className="order" key={o.id}>
              <div className="order-head">
                <strong>{o.id}</strong>
                <span>{fmtDate(o.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <ul>{o.items.map((i) => <li key={i.book.id}>{i.book.title} × {i.qty}</li>)}</ul>
              <div className="order-foot">
                <span>{money(o.total)} · {o.payment} · Delivery {o.eta}</span>
                <button type="button" className="btn btn-outline" onClick={() => onReorder(o)}>Reorder</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
