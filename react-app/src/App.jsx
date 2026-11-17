import { useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Catalog from './components/Catalog.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import WishlistDrawer from './components/WishlistDrawer.jsx';
import BookDialog from './components/BookDialog.jsx';
import CheckoutDialog from './components/CheckoutDialog.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useToast } from './hooks/useToast.js';
import { BOOKS_BY_ID, cartTotals, filterBooks, sanitizeCart, sanitizeWish } from './utils.js';

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('featured');

  const [cart, setCart] = useLocalStorage('pagewise-cart', {}, sanitizeCart);
  const [wish, setWish] = useLocalStorage('pagewise-wishlist', [], sanitizeWish);

  const [panel, setPanel] = useState(null); // 'cart' | 'wish' | null
  const [detailsId, setDetailsId] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const toast = useToast();

  const books = filterBooks({ query, category, sort });
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const addToCart = (id) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    toast.show(`Added “${BOOKS_BY_ID.get(id).title}” to cart`);
  };

  const changeQty = (id, delta) =>
    setCart((c) => {
      const q = (c[id] || 0) + delta;
      const { [id]: _removed, ...rest } = c;
      return q <= 0 ? rest : { ...rest, [id]: q };
    });

  const toggleWish = (id) => {
    const adding = !wish.includes(id);
    setWish((w) => (adding ? [...w, id] : w.filter((x) => x !== id)));
    const title = BOOKS_BY_ID.get(id).title;
    toast.show(adding ? `Saved “${title}” to wishlist` : `Removed “${title}” from wishlist`);
  };

  const closePanel = () => setPanel(null);
  const openCheckout = () => { setPanel(null); setCheckoutOpen(true); };

  return (
    <>
      <a className="skip-link" href="#catalog">Skip to catalog</a>

      <Header
        query={query}
        onQuery={setQuery}
        wishCount={wish.length}
        cartCount={cartCount}
        wishOpen={panel === 'wish'}
        cartOpen={panel === 'cart'}
        onOpenWish={() => setPanel('wish')}
        onOpenCart={() => setPanel('cart')}
      />
      <Hero />
      <Catalog
        books={books}
        category={category}
        sort={sort}
        onCategory={setCategory}
        onSort={setSort}
        wish={wish}
        onDetails={setDetailsId}
        onAdd={addToCart}
        onToggleWish={toggleWish}
      />

      <footer className="site-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Pagewise Books. Demo storefront – no real payments are processed.</p>
        </div>
      </footer>

      <div className="overlay" hidden={panel === null} onClick={closePanel} />
      <CartDrawer
        open={panel === 'cart'}
        cart={cart}
        onClose={closePanel}
        onChangeQty={changeQty}
        onClear={() => setCart({})}
        onCheckout={openCheckout}
      />
      <WishlistDrawer
        open={panel === 'wish'}
        wish={wish}
        onClose={closePanel}
        onAdd={addToCart}
        onRemove={toggleWish}
        onClear={() => setWish([])}
      />

      <BookDialog
        bookId={detailsId}
        wished={detailsId != null && wish.includes(detailsId)}
        onClose={() => setDetailsId(null)}
        onAdd={addToCart}
        onToggleWish={toggleWish}
      />
      <CheckoutDialog
        open={checkoutOpen}
        total={cartTotals(cart).total}
        onClose={() => setCheckoutOpen(false)}
        onPlaceOrder={() => setCart({})}
      />

      <div className={`toast${toast.visible ? ' show' : ''}`} role="status" aria-live="polite">{toast.message}</div>
    </>
  );
}
