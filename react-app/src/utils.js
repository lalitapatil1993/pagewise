import { BOOKS } from './data/books.js';

export const FREE_SHIPPING_OVER = 4000;
export const SHIPPING_FEE = 399;
export const MAX_PRICE = 3500;

export const PROMOS = {
  WELCOME10: { pct: 10, label: '10% off' },
  READMORE15: { pct: 15, min: 3000, label: '15% off' },
  FREESHIP: { freeShip: true, label: 'free shipping' }
};
export const isPromo = (code) => typeof code === 'string' && Object.hasOwn(PROMOS, code);

const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (n) => formatter.format(n);
export const fmtDate = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);

export const stars = (r) => {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
};

// Offline catalog (data/books.js) used when the live service can't be reached
export const OFFLINE_BOOKS = BOOKS.map((b) => ({
  id: `L${b.id}`, title: b.title, author: b.author, category: b.category, price: b.price,
  rating: b.rating, ratings: 0, year: b.year, cover: null, color: b.color,
  pages: null, subjects: [b.category], description: b.description, offline: true
}));

export function filterOffline({ query, category }) {
  const q = query.trim().toLowerCase();
  return OFFLINE_BOOKS.filter((b) =>
    (category === 'All' || b.category === category) &&
    (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
}

const SORTERS = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating,
  new: (a, b) => (b.year || 0) - (a.year || 0),
  title: (a, b) => a.title.localeCompare(b.title)
};

export function refineBooks(list, { sort, maxPrice, minRating }) {
  const out = list.filter((b) => b.price <= maxPrice && b.rating >= minRating);
  if (SORTERS[sort]) out.sort(SORTERS[sort]);
  return out;
}

// cart: { [bookId]: { book, qty } }
export function cartTotals(cart, promoCode) {
  const subtotal = Object.values(cart).reduce((s, e) => s + e.book.price * e.qty, 0);
  const promo = isPromo(promoCode) ? PROMOS[promoCode] : null;
  let discount = 0, freeShip = false, note = '', ok = false;
  if (promo) {
    if (subtotal < (promo.min || 0)) {
      note = `${promoCode} needs a subtotal of ${money(promo.min)}.`;
    } else {
      if (promo.pct) discount = Math.round(subtotal * promo.pct / 100);
      freeShip = !!promo.freeShip;
      note = `${promoCode} applied – ${promo.label}.`;
      ok = true;
    }
  }
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER || freeShip ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping, note, ok };
}

// Drop stale / malformed entries read from localStorage
export const validBook = (b) => !!b && typeof b.id === 'string' && typeof b.title === 'string' && Number.isFinite(b.price);

export const sanitizeCart = (v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, e]) => e && validBook(e.book) && Number.isInteger(e.qty) && e.qty > 0))
    : {};
export const sanitizeBooks = (v) => (Array.isArray(v) ? v.filter(validBook) : []);
export const sanitizeOrders = (v) =>
  Array.isArray(v)
    ? v.filter((o) => o && typeof o.id === 'string' && Array.isArray(o.items))
        .map((o) => ({ ...o, items: o.items.filter((i) => validBook(i.book) && i.qty > 0) }))
    : [];
