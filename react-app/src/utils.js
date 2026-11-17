import { BOOKS } from './data/books.js';

export const FREE_SHIPPING_OVER = 4000;
export const SHIPPING_FEE = 399;

const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (n) => formatter.format(n);

export const BOOKS_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));
export const CATEGORIES = ['All', ...new Set(BOOKS.map((b) => b.category))];

export const stars = (r) => {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

const SORTERS = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating,
  title: (a, b) => a.title.localeCompare(b.title)
};

export function filterBooks({ query, category, sort }) {
  const q = query.trim().toLowerCase();
  const list = BOOKS.filter((b) =>
    (category === 'All' || b.category === category) &&
    (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
  if (SORTERS[sort]) list.sort(SORTERS[sort]);
  return list;
}

// cart: { [bookId]: qty }
export function cartTotals(cart) {
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + BOOKS_BY_ID.get(Number(id)).price * q, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

// Drop stale / malformed entries read from localStorage
export const sanitizeCart = (v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([id, q]) => BOOKS_BY_ID.has(Number(id)) && Number.isInteger(q) && q > 0))
    : {};
export const sanitizeWish = (v) => (Array.isArray(v) ? v.filter((id) => BOOKS_BY_ID.has(id)) : []);
