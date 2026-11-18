import { useState } from 'react';
import Modal from './Modal.jsx';
import { money } from '../utils.js';

const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email.'),
  address: (v) => (v.trim().length >= 8 ? '' : 'Please enter your full address.')
};

function CheckoutContent({ total, onPlaceOrder, onDone }) {
  const [values, setValues] = useState({ name: '', email: '', address: '' });
  const [errors, setErrors] = useState({});
  const [order, setOrder] = useState(null); // { id, email } once placed

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const next = Object.fromEntries(Object.entries(RULES).map(([f, rule]) => [f, rule(values[f])]));
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setOrder({ id: `#BN${Date.now().toString().slice(-7)}`, email: values.email });
    onPlaceOrder();
  };

  if (order) {
    return (
      <div className="co-done">
        <h2 id="co-title">Thank you!</h2>
        <p>Your order <strong>{order.id}</strong> has been placed. A confirmation was sent to <span>{order.email}</span>.</p>
        <button type="button" className="btn btn-primary" onClick={onDone}>Continue shopping</button>
      </div>
    );
  }

  const field = (name, label, control) => (
    <label>
      {label}
      {control}
      <small className="err">{errors[name]}</small>
    </label>
  );
  const common = (name) => ({
    name,
    value: values[name],
    onChange: set(name),
    className: errors[name] ? 'invalid' : undefined,
    'aria-invalid': errors[name] ? 'true' : 'false'
  });

  return (
    <form className="co-form" noValidate onSubmit={submit}>
      <h2 id="co-title">Checkout</h2>
      {field('name', 'Full name', <input {...common('name')} autoComplete="name" />)}
      {field('email', 'Email', <input {...common('email')} type="email" autoComplete="email" />)}
      {field('address', 'Shipping address', <textarea {...common('address')} rows="3" autoComplete="street-address" />)}
      <p className="co-total">Order total: <strong>{money(total)}</strong></p>
      <button className="btn btn-primary btn-block" type="submit">Place order</button>
    </form>
  );
}

export default function CheckoutDialog({ open, total, onClose, onPlaceOrder }) {
  return (
    <Modal id="checkout-dialog" open={open} onClose={onClose} labelledBy="co-title">
      <CheckoutContent total={total} onPlaceOrder={onPlaceOrder} onDone={onClose} />
    </Modal>
  );
}
