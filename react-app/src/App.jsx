import { useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Catalog from './components/Catalog.jsx';
import BookStrip from './components/BookStrip.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import WishlistDrawer from './components/WishlistDrawer.jsx';
import BookDialog from './components/BookDialog.jsx';
import CheckoutDialog from './components/CheckoutDialog.jsx';
import OrdersDialog from './components/OrdersDialog.jsx';
import { fetchSurprise } from './api.js';
import { useBooks } from './hooks/useBooks.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useToast } from './hooks/useToast.js';
import { useTheme } from './hooks/useTheme.js';
import { useTrending } from './hooks/useTrending.js';
import {
  MAX_PRICE, OFFLINE_BOOKS, fmtDate, isPromo,
  sanitizeBooks, sanitizeCart, sanitizeOrders
} from './utils.js';

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('popular');
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [minRating, setMinRating] = useState(0);
  const [view, setView] = useLocalStorage('pagewise-view', 'grid', (v) => (v === 'list' ? 'list' : 'grid'));

  const [cart, setCart] = useLocalStorage('pagewise-cart-v2', {}, sanitizeCart);
  const [wish, setWish] = useLocalStorage('pagewise-wishlist-v2', [], sanitizeBooks);
  const [recent, setRecent] = useLocalStorage('pagewise-recent', [], sanitizeBooks);
  const [orders, setOrders] = useLocalStorage('pagewise-orders', [], sanitizeOrders);
  const [promo, setPromo] = useLocalStorage('pagewise-promo', '', (v) => (isPromo(v) ? v : ''));

  const [panel, setPanel] = useState(null); // 'cart' | 'wish' | null
  const [detailsBook, setDetailsBook] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [cartBump, setCartBump] = useState(0);
  const [surprising, setSurprising] = useState(false);

  const toast = useToast(2400);
  const [theme, toggleTheme] = useTheme();
  const trending = useTrending();
  const live = useBooks({ query, category, sort });

  const cartCount = Object.values(cart).reduce((s, e) => s + e.qty, 0);

  const addToCart = (book, qty = 1, silent = false) => {
    setCart((c) => ({ ...c, [book.id]: { book, qty: (c[book.id] ? c[book.id].qty : 0) + qty } }));
    setCartBump((n) => n + 1);
    if (!silent) toast.show(`Added “${book.title}” to cart`);
  };

  const changeQty = (id, delta) =>
    setCart((c) => {
      if (!c[id]) return c;
      const q = c[id].qty + delta;
      const { [id]: _removed, ...rest } = c;
      return q <= 0 ? rest : { ...rest, [id]: { ...c[id], qty: q } };
    });

  const toggleWish = (book) => {
    const adding = !wish.some((b) => b.id === book.id);
    setWish((w) => (adding ? [...w, book] : w.filter((b) => b.id !== book.id)));
    toast.show(adding ? `Saved “${book.title}” to wishlist` : `Removed “${book.title}” from wishlist`);
  };

  const addAllWishlist = () => {
    wish.forEach((b) => addToCart(b, 1, true));
    toast.show(`Added ${wish.length} wishlist book${wish.length === 1 ? '' : 's'} to cart`);
  };

  const openDetails = (book) => {
    setDetailsBook(book);
    setRecent((r) => [book, ...r.filter((x) => x.id !== book.id)].slice(0, 10));
  };

  const surprise = async () => {
    setSurprising(true);
    try {
      const book = live.offline
        ? OFFLINE_BOOKS[Math.floor(Math.random() * OFFLINE_BOOKS.length)]
        : await fetchSurprise();
      openDetails(book);
    } catch {
      toast.show('Couldn’t find a surprise right now – please try again.');
    } finally {
      setSurprising(false);
    }
  };

  const loadMore = async () => {
    if (!(await live.loadMore())) toast.show('Couldn’t load more books. Please try again.');
  };

  const placeOrder = ({ payment, total }) => {
    const order = {
      id: `#BN${Date.now().toString().slice(-7)}`,
      date: new Date().toISOString(),
      items: Object.values(cart).map(({ book, qty }) => ({ book, qty })),
      total,
      payment,
      eta: fmtDate(Date.now() + 4 * 86400000, { weekday: 'short', day: 'numeric', month: 'short' })
    };
    setOrders((o) => [order, ...o].slice(0, 20));
    setCart({});
    setPromo('');
    return order;
  };

  const reorder = (order) => {
    order.items.forEach((i) => addToCart(i.book, i.qty, true));
    setOrdersOpen(false);
    toast.show('Items added to your cart');
    setPanel('cart');
  };

  const resetFilters = () => { setMaxPrice(MAX_PRICE); setMinRating(0); };
  const closePanel = () => setPanel(null);
  const openCheckout = () => { setPanel(null); setCheckoutOpen(true); };

  return (
    <>
      <a className="skip-link" href="#catalog">Skip to catalog</a>

      <Header
        query={query}
        onQuery={setQuery}
        searching={live.loading}
        theme={theme}
        onToggleTheme={toggleTheme}
        wishCount={wish.length}
        cartCount={cartCount}
        cartBump={cartBump}
        orderCount={orders.length}
        wishOpen={panel === 'wish'}
        cartOpen={panel === 'cart'}
        onOpenWish={() => setPanel('wish')}
        onOpenCart={() => setPanel('cart')}
        onOpenOrders={() => setOrdersOpen(true)}
      />
      <Hero trending={trending} onDetails={openDetails} onSurprise={surprise} surprising={surprising} />
      <Catalog
        live={live}
        query={query}
        category={category}
        sort={sort}
        maxPrice={maxPrice}
        minRating={minRating}
        view={view}
        onCategory={setCategory}
        onSort={setSort}
        onMaxPrice={setMaxPrice}
        onMinRating={setMinRating}
        onView={setView}
        onResetFilters={resetFilters}
        wish={wish}
        onDetails={openDetails}
        onAdd={addToCart}
        onToggleWish={toggleWish}
        onLoadMore={loadMore}
      >
        {recent.length > 0 && (
          <section className="recent" aria-label="Recently viewed">
            <div className="recent-head">
              <h2>Recently viewed</h2>
              <button type="button" className="btn btn-link" onClick={() => setRecent([])}>Clear</button>
            </div>
            <BookStrip books={recent} onDetails={openDetails} />
          </section>
        )}
      </Catalog>

      <footer className="site-footer">
        <div className="container">
          <p>
            &copy; {new Date().getFullYear()} Booknest Books. Book data and covers from{' '}
            <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">Open Library</a>.
            {' '}Demo storefront – prices are illustrative and no real payments are processed.
          </p>
        </div>
      </footer>

      <div className="overlay" hidden={panel === null} onClick={closePanel} />
      <CartDrawer
        open={panel === 'cart'}
        cart={cart}
        promo={promo}
        onClose={closePanel}
        onChangeQty={changeQty}
        onClear={() => setCart({})}
        onCheckout={openCheckout}
        onApplyPromo={(code) => { setPromo(code); toast.show(`Promo ${code} added`); }}
        onRemovePromo={() => setPromo('')}
      />
      <WishlistDrawer
        open={panel === 'wish'}
        wish={wish}
        onClose={closePanel}
        onAdd={addToCart}
        onAddAll={addAllWishlist}
        onRemove={toggleWish}
        onClear={() => setWish([])}
      />

      <BookDialog
        book={detailsBook}
        wished={detailsBook != null && wish.some((b) => b.id === detailsBook.id)}
        onClose={() => setDetailsBook(null)}
        onAdd={addToCart}
        onToggleWish={toggleWish}
        onDetails={openDetails}
      />
      <CheckoutDialog
        open={checkoutOpen}
        cart={cart}
        promo={promo}
        onClose={() => setCheckoutOpen(false)}
        onPlaceOrder={placeOrder}
      />
      <OrdersDialog open={ordersOpen} orders={orders} onClose={() => setOrdersOpen(false)} onReorder={reorder} />

      <div className={`toast${toast.visible ? ' show' : ''}`} role="status" aria-live="polite">{toast.message}</div>
    </>
  );
}
