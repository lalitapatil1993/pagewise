(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Config ---------- */
  const API = 'https://openlibrary.org';
  const COVERS = 'https://covers.openlibrary.org/b/id/';
  const PAGE_SIZE = 24;
  const FIELDS = 'key,title,author_name,first_publish_year,cover_i,subject,ratings_average,ratings_count,number_of_pages_median';
  const FREE_SHIPPING_OVER = 4000;
  const SHIPPING_FEE = 399;
  const MAX_PRICE = 3500;

  const KEYS = {
    cart: 'pagewise-cart-v2', wish: 'pagewise-wishlist-v2', orders: 'pagewise-orders',
    recent: 'pagewise-recent', view: 'pagewise-view', promo: 'pagewise-promo', theme: 'pagewise-theme'
  };

  // label shown on the chip -> Open Library subject used for the live query
  const CATEGORIES = [
    { label: 'Fiction', subject: 'fiction' },
    { label: 'Fantasy', subject: 'fantasy' },
    { label: 'Sci-Fi', subject: 'science fiction' },
    { label: 'Mystery', subject: 'mystery' },
    { label: 'Romance', subject: 'romance' },
    { label: 'Horror', subject: 'horror' },
    { label: 'History', subject: 'history' },
    { label: 'Science', subject: 'science' },
    { label: 'Technology', subject: 'computer science' },
    { label: 'Self-Help', subject: 'self-help' },
    { label: 'Biography', subject: 'biography' },
    { label: 'Cooking', subject: 'cooking' }
  ];

  const PROMOS = {
    WELCOME10: { pct: 10, label: '10% off' },
    READMORE15: { pct: 15, min: 3000, label: '15% off' },
    FREESHIP: { freeShip: true, label: 'free shipping' }
  };

  /* ---------- Storage ---------- */
  const store = {
    get(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    }
  };

  /* ---------- Book model ---------- */
  const known = new Map(); // every book we have seen, by id
  const remember = (b) => { known.set(b.id, b); return b; };
  const validBook = (b) => !!b && typeof b.id === 'string' && typeof b.title === 'string' && Number.isFinite(b.price);

  const hash = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const colorFor = (s) => `hsl(${hash(s) % 360} 45% 32%)`;
  // Open Library has no prices, so derive a stable illustrative price from the book id.
  const priceFor = (id, pages) => 399 + (hash(id) % 25) * 100 + (pages > 600 ? 400 : 0);

  function guessCategory(subjects) {
    const text = subjects.join('|').toLowerCase();
    const hit = CATEGORIES.find((c) => text.includes(c.subject));
    return hit ? hit.label : 'Books';
  }

  function fromDoc(d) {
    const id = String(d.key || '').replace('/works/', '');
    if (!/^OL\d+W$/.test(id) || !d.title) return null;
    const subjects = (d.subject || []).filter((s) => typeof s === 'string' && s.length < 40).slice(0, 8);
    return remember({
      id,
      title: d.title,
      author: (d.author_name && d.author_name[0]) || 'Unknown author',
      category: guessCategory(subjects),
      price: priceFor(id, d.number_of_pages_median),
      rating: d.ratings_average ? Math.round(d.ratings_average * 10) / 10 : 0,
      ratings: d.ratings_count || 0,
      year: d.first_publish_year || null,
      cover: d.cover_i || null,
      color: colorFor(id),
      pages: d.number_of_pages_median || null,
      subjects
    });
  }

  // Offline catalog (books.js) used when the live service can't be reached
  const OFFLINE_BOOKS = BOOKS.map((b) => remember({
    id: `L${b.id}`, title: b.title, author: b.author, category: b.category, price: b.price,
    rating: b.rating, ratings: 0, year: b.year, cover: null, color: b.color,
    pages: null, subjects: [b.category], description: b.description, offline: true
  }));

  /* ---------- State ---------- */
  function loadCart() {
    const raw = store.get(KEYS.cart, {});
    const cart = {};
    Object.entries(raw).forEach(([id, e]) => {
      if (e && validBook(e.book) && e.qty > 0) { cart[id] = { book: remember(e.book), qty: Math.floor(e.qty) }; }
    });
    return cart;
  }
  const loadBooksList = (key) => {
    const raw = store.get(key, []);
    return Array.isArray(raw) ? raw.filter(validBook).map(remember) : [];
  };
  function loadOrders() {
    const raw = store.get(KEYS.orders, []);
    if (!Array.isArray(raw)) return [];
    return raw.filter((o) => o && typeof o.id === 'string' && Array.isArray(o.items))
      .map((o) => ({ ...o, items: o.items.filter((i) => validBook(i.book) && i.qty > 0) }));
  }

  const state = {
    query: '',
    category: 'All',
    sort: 'popular',
    maxPrice: MAX_PRICE,
    minRating: 0,
    view: store.get(KEYS.view, 'grid') === 'list' ? 'list' : 'grid',
    books: [], total: 0, page: 0,
    loading: false, offline: false,
    cart: loadCart(),
    wish: loadBooksList(KEYS.wish),
    recent: loadBooksList(KEYS.recent),
    orders: loadOrders(),
    promo: store.get(KEYS.promo, '')
  };
  if (!PROMOS[state.promo]) state.promo = '';

  const el = {
    grid: $('#book-grid'), chips: $('#category-chips'), count: $('#result-count'), empty: $('#empty-state'),
    search: $('#search-input'), sort: $('#sort-select'), spinner: $('#search-spinner'),
    loadMore: $('#load-more'), banner: $('#offline-banner'),
    priceRange: $('#price-range'), priceOut: $('#price-out'), ratingSel: $('#rating-select'), resetFilters: $('#reset-filters'),
    viewGrid: $('#view-grid'), viewList: $('#view-list'), theme: $('#theme-toggle'),
    trending: $('#trending'), trendingRow: $('#trending-row'),
    recent: $('#recent'), recentRow: $('#recent-row'),
    drawer: $('#cart-drawer'), overlay: $('#overlay'), cartToggle: $('#cart-toggle'), cartCount: $('#cart-count'),
    cartList: $('#cart-list'), cartEmpty: $('#cart-empty'), subtotal: $('#cart-subtotal'),
    shipping: $('#cart-shipping'), total: $('#cart-total'), checkoutBtn: $('#checkout-btn'), clear: $('#clear-cart'),
    discountRow: $('#discount-row'), discount: $('#cart-discount'),
    shipProgress: $('#ship-progress'), shipText: $('#ship-text'), shipBar: $('#ship-bar'), shipFill: $('#ship-fill'),
    promoForm: $('#promo-form'), promoInput: $('#promo-input'), promoMsg: $('#promo-msg'),
    wishDrawer: $('#wish-drawer'), wishToggle: $('#wish-toggle'), wishCount: $('#wish-count'),
    wishList: $('#wish-list'), wishEmpty: $('#wish-empty'), wishClear: $('#clear-wish'), wishAddAll: $('#wish-add-all'),
    bookDlg: $('#book-dialog'), bookBody: $('#dlg-body'),
    coDlg: $('#checkout-dialog'), coForm: $('#checkout-form'), coDone: $('#co-done'), coSummary: $('#co-summary'),
    ordersDlg: $('#orders-dialog'), ordersList: $('#orders-list'), ordersEmpty: $('#orders-empty'),
    surprise: $('#surprise-btn'),
    toast: $('#toast')
  };

  /* ---------- Network ---------- */
  async function fetchJSON(url, outer, timeout = 12000) {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), timeout);
    if (outer) outer.addEventListener('abort', () => c.abort(), { once: true });
    try {
      const res = await fetch(url, { signal: c.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  const cleanText = (s) => s.replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\b(AND|OR|NOT)\b/g, ' ').replace(/\s+/g, ' ').trim();

  function searchUrl(page) {
    const text = cleanText(state.query);
    const cat = CATEGORIES.find((c) => c.label === state.category);
    const parts = [text ? `(${text})` : 'ratings_count:[3 TO *]', 'language:eng'];
    if (cat) parts.push(`subject:"${cat.subject}"`);
    const sort = state.sort === 'rating' ? 'rating' : state.sort === 'new' ? 'new' : (text ? '' : 'readinglog');
    return `${API}/search.json?q=${encodeURIComponent(parts.join(' AND '))}&fields=${FIELDS}` +
      `&has_fields=cover_i&limit=${PAGE_SIZE}&page=${page}${sort ? `&sort=${sort}` : ''}`;
  }

  let loadToken = 0;
  let ctrl = null;

  function setBusy(busy) {
    state.loading = busy;
    el.spinner.hidden = !busy;
    el.grid.setAttribute('aria-busy', String(busy));
  }

  async function loadBooks(append = false) {
    const token = ++loadToken;
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    if (!append) { state.books = []; state.total = 0; state.page = 0; }
    setBusy(true);
    renderGrid();
    try {
      const data = await fetchJSON(searchUrl(state.page + 1), ctrl.signal);
      if (token !== loadToken) return;
      const seen = new Set(state.books.map((b) => b.id));
      const fresh = (data.docs || []).map(fromDoc).filter((b) => b && !seen.has(b.id));
      state.books = state.books.concat(fresh);
      state.total = data.numFound || 0;
      state.page += 1;
      state.offline = false;
      el.banner.hidden = true;
    } catch {
      if (token !== loadToken) return;
      if (append) toast('Couldn’t load more books. Please try again.');
      else { state.offline = true; el.banner.hidden = false; }
    } finally {
      if (token === loadToken) { setBusy(false); renderGrid(); }
    }
  }

  // Re-query the live catalog (or just re-filter the offline one)
  function refresh() {
    if (state.offline) renderGrid(); else loadBooks(false);
  }

  /* ---------- Covers ---------- */
  const coverUrl = (b, size) => `${COVERS}${b.cover}-${size}.jpg?default=false`;

  const cover = (b, cls = '', size = 'M') =>
    `<div class="cover ${cls}" style="background:${b.color}" aria-hidden="true">` +
    `<strong>${esc(b.title)}</strong><span>${esc(b.author)}</span>` +
    (b.cover ? `<img src="${coverUrl(b, size)}" alt="" loading="lazy" decoding="async">` : '') +
    '</div>';

  // Fade covers in once loaded; fall back to the generated cover if the image is missing
  document.addEventListener('load', (e) => {
    const i = e.target;
    if (i.tagName === 'IMG' && i.closest('.cover')) { if (i.naturalWidth > 1) i.classList.add('loaded'); else i.remove(); }
  }, true);
  document.addEventListener('error', (e) => {
    const i = e.target;
    if (i.tagName === 'IMG' && i.closest('.cover')) i.remove();
  }, true);

  const stars = (r) => {
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };
  const ratingHtml = (b) => b.rating
    ? `<span class="rating" aria-label="Rated ${b.rating} out of 5">${stars(b.rating)} <small>${b.rating}${b.ratings ? ` (${b.ratings.toLocaleString('en-IN')})` : ''}</small></span>`
    : '<span class="rating none"><small>No ratings yet</small></span>';

  const mini = (b) =>
    `<button class="mini" data-details="${esc(b.id)}" aria-label="View details for ${esc(b.title)}">` +
    `${cover(b)}<span class="mini-title">${esc(b.title)}</span><span class="mini-author">${esc(b.author)}</span></button>`;

  /* ---------- Catalog ---------- */
  function offlineBooks() {
    const q = state.query.trim().toLowerCase();
    return OFFLINE_BOOKS.filter((b) =>
      (state.category === 'All' || b.category === state.category) &&
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
  }

  function visibleBooks() {
    const src = state.offline ? offlineBooks() : state.books;
    const list = src.filter((b) => b.price <= state.maxPrice && b.rating >= state.minRating);
    const sorters = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      new: (a, b) => (b.year || 0) - (a.year || 0),
      title: (a, b) => a.title.localeCompare(b.title)
    };
    if (sorters[state.sort]) list.sort(sorters[state.sort]);
    return list;
  }

  function renderChips() {
    const cats = ['All', ...CATEGORIES.map((c) => c.label)];
    el.chips.innerHTML = cats.map((c) =>
      `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}</button>`).join('');
  }

  const skeletons = () => Array.from({ length: 8 }, () =>
    '<article class="card skeleton" aria-hidden="true"><div class="sk-cover"></div><div class="card-body"><span class="sk-line"></span><span class="sk-line short"></span></div></article>').join('');

  function renderGrid() {
    el.grid.classList.toggle('list', state.view === 'list');
    const filtersOn = state.maxPrice < MAX_PRICE || state.minRating > 0;
    el.resetFilters.hidden = !filtersOn;

    if (state.loading && !state.books.length && !state.offline) {
      el.grid.innerHTML = skeletons();
      el.count.textContent = 'Searching the library…';
      el.empty.hidden = true;
      el.loadMore.hidden = true;
      return;
    }

    const list = visibleBooks();
    el.grid.innerHTML = list.map((b) => `
      <article class="card">
        <button class="cover-btn" data-details="${esc(b.id)}" aria-label="View details for ${esc(b.title)}">${cover(b)}</button>
        ${wishBtn(b, 'wish-icon')}
        <div class="card-body">
          <h3 class="card-title">${esc(b.title)}</h3>
          <p class="card-author">${esc(b.author)}</p>
          <p class="card-meta">${[b.category, b.year].filter(Boolean).join(' · ')}</p>
          ${ratingHtml(b)}
          <div class="card-foot">
            <span class="price">${money(b.price)}</span>
            <button class="btn btn-primary" data-add="${esc(b.id)}">Add to cart</button>
          </div>
        </div>
      </article>`).join('');

    el.empty.hidden = list.length > 0;
    if (state.offline) {
      el.count.textContent = `${list.length} book${list.length === 1 ? '' : 's'} found (offline catalog)`;
    } else {
      const total = state.total.toLocaleString('en-IN');
      el.count.textContent = state.total ? `${list.length} shown · ${total} matching books` : '';
    }
    const more = !state.offline && state.page * PAGE_SIZE < state.total;
    el.loadMore.hidden = !more;
    el.loadMore.disabled = state.loading;
    el.loadMore.textContent = state.loading ? 'Loading…' : 'Load more books';
  }

  /* ---------- Wishlist ---------- */
  const isWished = (id) => state.wish.some((b) => b.id === id);

  function wishBtn(b, cls, label = '') {
    const on = isWished(b.id);
    return `<button class="wish-btn ${cls}" data-wish="${esc(b.id)}" aria-pressed="${on}" aria-label="Add ${esc(b.title)} to wishlist">` +
      `<span class="w-off" aria-hidden="true">♡</span><span class="w-on" aria-hidden="true">♥</span>${label}</button>`;
  }

  function renderWish() {
    const books = state.wish;
    el.wishCount.textContent = books.length;
    el.wishEmpty.hidden = books.length > 0;
    el.wishClear.hidden = books.length === 0;
    el.wishAddAll.hidden = books.length === 0;
    el.wishList.innerHTML = books.map((b) => `
      <li class="cart-item">
        ${cover(b, 'mini-cover', 'S')}
        <div>
          <h3>${esc(b.title)}</h3>
          <p>${esc(b.author)}</p>
          <button class="btn btn-primary" data-add="${esc(b.id)}">Add to cart</button>
        </div>
        <div class="item-right">
          <strong>${money(b.price)}</strong>
          <button class="remove" data-wish="${esc(b.id)}">Remove</button>
        </div>
      </li>`).join('');
    document.querySelectorAll('.wish-btn[data-wish]').forEach((btn) =>
      btn.setAttribute('aria-pressed', String(isWished(btn.dataset.wish))));
    store.set(KEYS.wish, state.wish);
  }

  function toggleWish(id) {
    const b = known.get(id);
    if (!b) return;
    const adding = !isWished(id);
    state.wish = adding ? [...state.wish, b] : state.wish.filter((w) => w.id !== id);
    renderWish();
    toast(adding ? `Saved “${b.title}” to wishlist` : `Removed “${b.title}” from wishlist`);
  }

  /* ---------- Cart ---------- */
  function totals() {
    const entries = Object.values(state.cart);
    const subtotal = entries.reduce((s, e) => s + e.book.price * e.qty, 0);
    const promo = PROMOS[state.promo];
    let discount = 0, freeShip = false, note = '', ok = false;
    if (promo) {
      if (subtotal < (promo.min || 0)) {
        note = `${state.promo} needs a subtotal of ${money(promo.min)}.`;
      } else {
        if (promo.pct) discount = Math.round(subtotal * promo.pct / 100);
        freeShip = !!promo.freeShip;
        note = `${state.promo} applied – ${promo.label}.`;
        ok = true;
      }
    }
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER || freeShip ? 0 : SHIPPING_FEE;
    return { subtotal, discount, shipping, total: subtotal - discount + shipping, note, ok, freeShip };
  }

  function renderCart() {
    const ids = Object.keys(state.cart);
    const items = ids.reduce((s, id) => s + state.cart[id].qty, 0);
    el.cartCount.textContent = items;
    el.cartEmpty.hidden = ids.length > 0;
    el.checkoutBtn.disabled = ids.length === 0;
    el.clear.hidden = ids.length === 0;

    el.cartList.innerHTML = ids.map((id) => {
      const { book: b, qty: q } = state.cart[id];
      return `
        <li class="cart-item">
          ${cover(b, 'mini-cover', 'S')}
          <div>
            <h3>${esc(b.title)}</h3>
            <p>${esc(b.author)}</p>
            <div class="qty">
              <button data-dec="${esc(b.id)}" aria-label="Decrease quantity of ${esc(b.title)}">−</button>
              <span aria-live="polite">${q}</span>
              <button data-inc="${esc(b.id)}" aria-label="Increase quantity of ${esc(b.title)}">+</button>
            </div>
          </div>
          <div class="item-right">
            <strong>${money(b.price * q)}</strong>
            <button class="remove" data-remove="${esc(b.id)}">Remove</button>
          </div>
        </li>`;
    }).join('');

    const t = totals();
    el.subtotal.textContent = money(t.subtotal);
    el.discountRow.hidden = t.discount === 0;
    el.discount.textContent = `−${money(t.discount)}`;
    el.shipping.textContent = t.shipping ? money(t.shipping) : (t.subtotal ? 'Free' : money(0));
    el.total.textContent = money(t.total);

    // Free-shipping progress
    el.shipProgress.hidden = t.subtotal === 0;
    if (t.subtotal) {
      const pct = Math.min(100, Math.round(t.subtotal / FREE_SHIPPING_OVER * 100));
      el.shipText.textContent = t.subtotal >= FREE_SHIPPING_OVER
        ? '🎉 You’ve unlocked free shipping!'
        : `Add ${money(FREE_SHIPPING_OVER - t.subtotal)} more for free shipping`;
      el.shipFill.style.width = `${pct}%`;
      el.shipBar.setAttribute('aria-valuenow', pct);
    }

    // Promo message
    el.promoMsg.className = `promo-msg${t.ok ? ' ok' : ''}`;
    el.promoMsg.innerHTML = state.promo ? `${esc(t.note)} <button class="remove" type="button" data-promo-remove>Remove</button>` : '';

    store.set(KEYS.cart, state.cart);
    store.set(KEYS.promo, state.promo);
  }

  function bumpCart() {
    el.cartCount.classList.remove('bump');
    void el.cartCount.offsetWidth;
    el.cartCount.classList.add('bump');
  }

  function addToCart(id, qty = 1, silent = false) {
    const b = known.get(id);
    if (!b) return;
    const entry = state.cart[id] || (state.cart[id] = { book: b, qty: 0 });
    entry.qty += qty;
    renderCart();
    bumpCart();
    if (!silent) toast(`Added “${b.title}” to cart`);
  }

  function changeQty(id, delta) {
    const entry = state.cart[id];
    if (!entry) return;
    const q = entry.qty + delta;
    if (q <= 0) delete state.cart[id]; else entry.qty = q;
    renderCart();
  }

  function applyPromo(code) {
    code = code.trim().toUpperCase();
    if (!code) return;
    if (!PROMOS[code]) { state.promo = ''; renderCart(); el.promoMsg.className = 'promo-msg'; el.promoMsg.textContent = 'That code isn’t valid.'; return; }
    state.promo = code;
    el.promoInput.value = '';
    renderCart();
    toast(`Promo ${code} added`);
  }

  /* ---------- Drawers ---------- */
  let lastFocus = null;
  function setDrawer(drawer, toggleBtn, closeSel, open) {
    if (open) lastFocus = document.activeElement;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    el.overlay.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) $(closeSel).focus(); else if (lastFocus) lastFocus.focus();
  }
  const setCartOpen = (open) => setDrawer(el.drawer, el.cartToggle, '#cart-close', open);
  const setWishOpen = (open) => setDrawer(el.wishDrawer, el.wishToggle, '#wish-close', open);

  /* ---------- Details dialog ---------- */
  let detailToken = 0;

  function cleanDescription(d) {
    let text = typeof d === 'string' ? d : (d && d.value) || '';
    text = text.split(/\r?\n-{5,}/)[0]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*|__/g, '')
      .trim();
    return text.length > 900 ? `${text.slice(0, 900).replace(/\s+\S*$/, '')}…` : text;
  }

  function renderDetails(b, x = {}) {
    const meta = [`by ${esc(b.author)}`, esc(b.category), b.year, b.pages ? `${b.pages} pages` : ''].filter(Boolean).join(' · ');
    const desc = x.loading ? '<p class="muted">Loading description…</p>'
      : x.description ? `<p>${esc(x.description)}</p>`
        : '<p class="muted">No description available for this book.</p>';
    const subjects = (x.subjects && x.subjects.length ? x.subjects : b.subjects || []).slice(0, 8);
    const hist = x.histogram && x.histogramTotal
      ? `<div class="hist" aria-label="Rating breakdown">${[5, 4, 3, 2, 1].map((n) => {
        const c = x.histogram[n] || 0;
        return `<div class="hist-row"><span>${n}★</span><div class="hist-bar"><span style="width:${Math.round(c / x.histogramTotal * 100)}%"></span></div><span>${c}</span></div>`;
      }).join('')}</div>` : '';
    el.bookBody.innerHTML = `
      ${cover(b, '', 'L')}
      <div>
        <h2 id="dlg-title">${esc(b.title)}</h2>
        <p class="meta">${meta}</p>
        ${ratingHtml(b)}
        <div class="desc">${desc}</div>
        ${subjects.length ? `<p class="tags">${subjects.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</p>` : ''}
        ${hist}
        <span class="price">${money(b.price)}</span>
        <button class="btn btn-primary" data-add="${esc(b.id)}">Add to cart</button>
        ${wishBtn(b, 'wish-text', ' Wishlist')}
      </div>
      <section class="more" id="more-author" hidden>
        <h3>More by ${esc(b.author)}</h3>
        <div class="trending-row" id="more-row"></div>
      </section>`;
  }

  async function openDetails(id) {
    const b = known.get(id);
    if (!b) return;
    const token = ++detailToken;
    addRecent(b);
    renderDetails(b, { loading: !b.offline, description: b.description });
    if (!el.bookDlg.open) el.bookDlg.showModal();
    el.bookDlg.scrollTop = 0;
    if (b.offline) return;

    const [work, ratings] = await Promise.all([
      fetchJSON(`${API}/works/${b.id}.json`).catch(() => null),
      fetchJSON(`${API}/works/${b.id}/ratings.json`).catch(() => null)
    ]);
    if (token !== detailToken) return;

    const extra = { description: work ? cleanDescription(work.description) : '' };
    if (work && Array.isArray(work.subjects)) extra.subjects = work.subjects.filter((s) => s.length < 40);
    if (ratings && ratings.summary && ratings.summary.count) {
      b.rating = Math.round(ratings.summary.average * 10) / 10;
      b.ratings = ratings.summary.count;
      extra.histogram = ratings.counts;
      extra.histogramTotal = ratings.summary.count;
    }
    renderDetails(b, extra);
    loadMoreByAuthor(b, token);
  }

  async function loadMoreByAuthor(b, token) {
    const name = cleanText(b.author);
    if (!name || b.author === 'Unknown author') return;
    try {
      const url = `${API}/search.json?q=${encodeURIComponent(`author:"${name}" AND language:eng`)}&fields=${FIELDS}&has_fields=cover_i&limit=12&sort=readinglog`;
      const data = await fetchJSON(url);
      if (token !== detailToken) return;
      const seen = new Set([b.title.toLowerCase()]);
      const list = (data.docs || []).map(fromDoc).filter((x) => {
        if (!x || seen.has(x.title.toLowerCase())) return false;
        seen.add(x.title.toLowerCase());
        return true;
      }).slice(0, 8);
      const row = $('#more-row');
      if (!list.length || !row) return;
      row.innerHTML = list.map(mini).join('');
      $('#more-author').hidden = false;
    } catch { /* optional section */ }
  }

  /* ---------- Recently viewed ---------- */
  function addRecent(b) {
    state.recent = [b, ...state.recent.filter((r) => r.id !== b.id)].slice(0, 10);
    store.set(KEYS.recent, state.recent);
    renderRecent();
  }
  function renderRecent() {
    el.recent.hidden = state.recent.length === 0;
    el.recentRow.innerHTML = state.recent.map(mini).join('');
  }

  /* ---------- Trending & surprise ---------- */
  async function loadTrending() {
    try {
      const data = await fetchJSON(`${API}/trending/weekly.json?limit=14`);
      const list = (data.works || []).filter((w) => w.cover_i).map(fromDoc).filter(Boolean).slice(0, 12);
      if (!list.length) return;
      el.trendingRow.innerHTML = list.map(mini).join('');
      el.trending.hidden = false;
    } catch { /* hero works without trending */ }
  }

  async function surprise() {
    el.surprise.disabled = true;
    try {
      if (state.offline) {
        openDetails(OFFLINE_BOOKS[Math.floor(Math.random() * OFFLINE_BOOKS.length)].id);
        return;
      }
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const page = 1 + Math.floor(Math.random() * 30);
      const q = `ratings_count:[3 TO *] AND language:eng AND subject:"${cat.subject}"`;
      const data = await fetchJSON(`${API}/search.json?q=${encodeURIComponent(q)}&fields=${FIELDS}&has_fields=cover_i&limit=1&page=${page}&sort=readinglog`);
      const book = data.docs && data.docs[0] ? fromDoc(data.docs[0]) : null;
      if (!book) throw new Error('empty');
      openDetails(book.id);
    } catch {
      toast('Couldn’t find a surprise right now – please try again.');
    } finally {
      el.surprise.disabled = false;
    }
  }

  /* ---------- Checkout ---------- */
  function openCheckout() {
    setCartOpen(false);
    el.coForm.hidden = false;
    el.coDone.hidden = true;
    el.coForm.reset();
    el.coForm.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
    const t = totals();
    el.coSummary.innerHTML = '<ul>' + Object.values(state.cart).map((e) =>
      `<li><span>${esc(e.book.title)} × ${e.qty}</span><span>${money(e.book.price * e.qty)}</span></li>`).join('') +
      (t.discount ? `<li class="disc"><span>Discount (${esc(state.promo)})</span><span>−${money(t.discount)}</span></li>` : '') +
      `<li><span>Shipping</span><span>${t.shipping ? money(t.shipping) : 'Free'}</span></li></ul>`;
    $('#co-total').textContent = money(t.total);
    el.coDlg.showModal();
  }

  function validate(form) {
    const rules = {
      name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email.'),
      address: (v) => (v.trim().length >= 8 ? '' : 'Please enter your full address.')
    };
    let ok = true;
    for (const [field, rule] of Object.entries(rules)) {
      const input = form.elements[field];
      const msg = rule(input.value);
      form.querySelector(`[data-for="${field}"]`).textContent = msg;
      input.classList.toggle('invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) ok = false;
    }
    return ok;
  }

  const fmtDate = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);

  el.coForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(el.coForm)) return;
    const t = totals();
    const eta = new Date(Date.now() + 4 * 86400000);
    const order = {
      id: `#BN${Date.now().toString().slice(-7)}`,
      date: new Date().toISOString(),
      items: Object.values(state.cart).map((x) => ({ book: x.book, qty: x.qty })),
      total: t.total,
      payment: new FormData(el.coForm).get('payment'),
      eta: fmtDate(eta, { weekday: 'short', day: 'numeric', month: 'short' })
    };
    state.orders = [order, ...state.orders].slice(0, 20);
    store.set(KEYS.orders, state.orders);
    $('#co-order').textContent = order.id;
    $('#co-mail').textContent = el.coForm.elements.email.value;
    $('#co-eta').textContent = order.eta;
    state.cart = {};
    state.promo = '';
    renderCart();
    el.coForm.hidden = true;
    el.coDone.hidden = false;
  });

  /* ---------- Orders ---------- */
  function renderOrders() {
    el.ordersEmpty.hidden = state.orders.length > 0;
    el.ordersList.innerHTML = state.orders.map((o) => `
      <li class="order">
        <div class="order-head"><strong>${esc(o.id)}</strong><span>${fmtDate(o.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <ul>${o.items.map((i) => `<li>${esc(i.book.title)} × ${i.qty}</li>`).join('')}</ul>
        <div class="order-foot">
          <span>${money(o.total)} · ${esc(o.payment)} · Delivery ${esc(o.eta)}</span>
          <button class="btn btn-outline" data-reorder="${esc(o.id)}">Reorder</button>
        </div>
      </li>`).join('');
  }

  function reorder(orderId) {
    const o = state.orders.find((x) => x.id === orderId);
    if (!o) return;
    o.items.forEach((i) => { remember(i.book); addToCart(i.book.id, i.qty, true); });
    el.ordersDlg.close();
    toast('Items added to your cart');
    setCartOpen(true);
  }

  /* ---------- Theme & view ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('#theme-icon').textContent = t === 'dark' ? '☀' : '☾';
    el.theme.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  function setView(v) {
    state.view = v;
    store.set(KEYS.view, v);
    el.viewGrid.setAttribute('aria-pressed', String(v === 'grid'));
    el.viewList.setAttribute('aria-pressed', String(v === 'list'));
    renderGrid();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
  }

  /* ---------- Events ---------- */
  let searchTimer;
  el.search.addEventListener('input', (e) => {
    state.query = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refresh, 350);
  });
  $('#search-form').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(searchTimer); refresh(); });
  el.sort.addEventListener('change', (e) => { state.sort = e.target.value; refresh(); });

  el.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    state.category = chip.dataset.cat;
    renderChips();
    refresh();
  });

  el.priceRange.addEventListener('input', (e) => {
    state.maxPrice = Number(e.target.value);
    el.priceOut.textContent = state.maxPrice >= MAX_PRICE ? `${money(MAX_PRICE)}+` : money(state.maxPrice);
    renderGrid();
  });
  el.ratingSel.addEventListener('change', (e) => { state.minRating = Number(e.target.value); renderGrid(); });
  el.resetFilters.addEventListener('click', () => {
    state.maxPrice = MAX_PRICE; state.minRating = 0;
    el.priceRange.value = MAX_PRICE; el.ratingSel.value = '0';
    el.priceOut.textContent = `${money(MAX_PRICE)}+`;
    renderGrid();
  });

  el.loadMore.addEventListener('click', () => loadBooks(true));
  $('#retry-btn').addEventListener('click', () => { state.offline = false; loadBooks(false); });
  el.viewGrid.addEventListener('click', () => setView('grid'));
  el.viewList.addEventListener('click', () => setView('list'));
  el.theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEYS.theme, next); } catch { /* storage unavailable */ }
  });
  el.surprise.addEventListener('click', surprise);
  $('#clear-recent').addEventListener('click', () => { state.recent = []; store.set(KEYS.recent, []); renderRecent(); });

  // Delegated clicks for add / details / cart item actions
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-details],[data-inc],[data-dec],[data-remove],[data-wish],[data-reorder],[data-promo-remove]');
    if (!t) return;
    const d = t.dataset;
    if (d.wish) toggleWish(d.wish);
    else if (d.add) addToCart(d.add);
    else if (d.details) openDetails(d.details);
    else if (d.inc) changeQty(d.inc, 1);
    else if (d.dec) changeQty(d.dec, -1);
    else if (d.remove) changeQty(d.remove, -Infinity);
    else if (d.reorder) reorder(d.reorder);
    else if ('promoRemove' in d) { state.promo = ''; renderCart(); }
  });

  el.promoForm.addEventListener('submit', (e) => { e.preventDefault(); applyPromo(el.promoInput.value); });
  el.cartToggle.addEventListener('click', () => setCartOpen(true));
  $('#cart-close').addEventListener('click', () => setCartOpen(false));
  el.overlay.addEventListener('click', () => {
    if (el.wishDrawer.classList.contains('open')) setWishOpen(false); else setCartOpen(false);
  });
  el.clear.addEventListener('click', () => { state.cart = {}; renderCart(); });
  el.checkoutBtn.addEventListener('click', openCheckout);
  el.wishToggle.addEventListener('click', () => setWishOpen(true));
  $('#wish-close').addEventListener('click', () => setWishOpen(false));
  el.wishClear.addEventListener('click', () => { state.wish = []; renderWish(); });
  el.wishAddAll.addEventListener('click', () => {
    const n = state.wish.length;
    state.wish.forEach((b) => addToCart(b.id, 1, true));
    toast(`Added ${n} wishlist book${n === 1 ? '' : 's'} to cart`);
  });
  $('#orders-toggle').addEventListener('click', () => { renderOrders(); el.ordersDlg.showModal(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (el.drawer.classList.contains('open')) setCartOpen(false);
      else if (el.wishDrawer.classList.contains('open')) setWishOpen(false);
    } else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      el.search.focus();
    }
  });

  $('#dlg-close').addEventListener('click', () => el.bookDlg.close());
  el.bookDlg.addEventListener('close', () => { detailToken++; });
  $('#co-close').addEventListener('click', () => el.coDlg.close());
  $('#co-ok').addEventListener('click', () => el.coDlg.close());
  $('#orders-close').addEventListener('click', () => el.ordersDlg.close());
  // Close dialogs when clicking the backdrop
  [el.bookDlg, el.coDlg, el.ordersDlg].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Init ---------- */
  $('#year').textContent = new Date().getFullYear();
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  el.priceOut.textContent = `${money(MAX_PRICE)}+`;
  el.viewGrid.setAttribute('aria-pressed', String(state.view === 'grid'));
  el.viewList.setAttribute('aria-pressed', String(state.view === 'list'));
  renderChips();
  renderCart();
  renderWish();
  renderRecent();
  loadBooks(false);
  loadTrending();
})();
