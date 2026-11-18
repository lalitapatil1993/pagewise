export default function Header({ query, onQuery, wishCount, cartCount, onOpenWish, onOpenCart, wishOpen, cartOpen }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a className="logo" href="#" aria-label="Booknest Books home">Book<span>nest</span></a>

        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="sr-only" htmlFor="search-input">Search books</label>
          <input
            id="search-input"
            type="search"
            placeholder="Search title or author…"
            autoComplete="off"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </form>

        <div className="header-actions">
          <button type="button" className="btn btn-cart" aria-controls="wish-drawer" aria-expanded={wishOpen} onClick={onOpenWish}>
            <span aria-hidden="true">♥</span>
            <span className="cart-label">Wishlist</span>
            <span className="badge" aria-live="polite">{wishCount}</span>
          </button>
          <button type="button" className="btn btn-cart" aria-controls="cart-drawer" aria-expanded={cartOpen} onClick={onOpenCart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
            <span className="cart-label">Cart</span>
            <span className="badge" aria-live="polite">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
