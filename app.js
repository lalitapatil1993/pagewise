(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const FREE_SHIPPING_OVER = 4000;
  const SHIPPING_FEE = 399;
  const STORAGE_KEY = 'pagewise-cart';
  const WISH_KEY = 'pagewise-wishlist';

  const state = {
    query: '',
    category: 'All',
    sort: 'featured',
    cart: loadCart(), // { [bookId]: qty }
    wish: loadWish() // [bookId, ...]
  };

  const el = {
    grid: $('#book-grid'), chips: $('#category-chips'), count: $('#result-count'), empty: $('#empty-state'),
    search: $('#search-input'), sort: $('#sort-select'),
    drawer: $('#cart-drawer'), overlay: $('#overlay'), cartToggle: $('#cart-toggle'), cartCount: $('#cart-count'),
    cartList: $('#cart-list'), cartEmpty: $('#cart-empty'), subtotal: $('#cart-subtotal'),
    shipping: $('#cart-shipping'), total: $('#cart-total'), checkoutBtn: $('#checkout-btn'), clear: $('#clear-cart'),
    wishDrawer: $('#wish-drawer'), wishToggle: $('#wish-toggle'), wishCount: $('#wish-count'),
    wishList: $('#wish-list'), wishEmpty: $('#wish-empty'), wishClear: $('#clear-wish'),
    bookDlg: $('#book-dialog'), bookBody: $('#dlg-body'),
    coDlg: $('#checkout-dialog'), coForm: $('#checkout-form'), coDone: $('#co-done'),
    toast: $('#toast')
  };

  /* ---------- Cart persistence ---------- */
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart)); } catch { /* storage unavailable */ }
  }

  function loadWish() {
    try {
      const ids = JSON.parse(localStorage.getItem(WISH_KEY));
      return Array.isArray(ids) ? ids.filter((id) => BOOKS.some((b) => b.id === id)) : [];
    } catch { return []; }
  }
  function saveWish() {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(state.wish)); } catch { /* storage unavailable */ }
  }

  /* ---------- Catalog ---------- */
  const cover = (b, cls = '') =>
    `<div class="cover ${cls}" style="background:${b.color}" aria-hidden="true"><strong>${esc(b.title)}</strong><span>${esc(b.author)}</span></div>`;

  const stars = (r) => {
    const full = Math.round(r);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };

  function visibleBooks() {
    const q = state.query.trim().toLowerCase();
    const list = BOOKS.filter((b) =>
      (state.category === 'All' || b.category === state.category) &&
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
    const sorters = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      title: (a, b) => a.title.localeCompare(b.title)
    };
    if (sorters[state.sort]) list.sort(sorters[state.sort]);
    return list;
  }

  function renderChips() {
    const cats = ['All', ...new Set(BOOKS.map((b) => b.category))];
    el.chips.innerHTML = cats.map((c) =>
      `<button class="chip" data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}</button>`).join('');
  }

  function renderGrid() {
    const list = visibleBooks();
    el.grid.innerHTML = list.map((b) => `
      <article class="card">
        <button class="cover-btn" data-details="${b.id}" aria-label="View details for ${esc(b.title)}">${cover(b)}</button>
        ${wishBtn(b, 'wish-icon')}
        <div class="card-body">
          <h3 class="card-title">${esc(b.title)}</h3>
          <p class="card-author">${esc(b.author)}</p>
          <span class="rating" aria-label="Rated ${b.rating} out of 5">${stars(b.rating)} <small>${b.rating}</small></span>
          <div class="card-foot">
            <span class="price">${money(b.price)}</span>
            <button class="btn btn-primary" data-add="${b.id}">Add to cart</button>
          </div>
        </div>
      </article>`).join('');
    el.empty.hidden = list.length > 0;
    el.count.textContent = `${list.length} book${list.length === 1 ? '' : 's'} found`;
  }

  /* ---------- Wishlist ---------- */
  const isWished = (id) => state.wish.includes(Number(id));

  function wishBtn(b, cls, label = '') {
    const on = isWished(b.id);
    return `<button class="wish-btn ${cls}" data-wish="${b.id}" aria-pressed="${on}" aria-label="Add ${esc(b.title)} to wishlist">` +
      `<span class="w-off" aria-hidden="true">♡</span><span class="w-on" aria-hidden="true">♥</span>${label}</button>`;
  }

  function renderWish() {
    const books = state.wish.map(findBook).filter(Boolean);
    el.wishCount.textContent = books.length;
    el.wishEmpty.hidden = books.length > 0;
    el.wishClear.hidden = books.length === 0;
    el.wishList.innerHTML = books.map((b) => `
      <li class="cart-item">
        ${cover(b, 'mini-cover')}
        <div>
          <h3>${esc(b.title)}</h3>
          <p>${esc(b.author)}</p>
          <button class="btn btn-primary" data-add="${b.id}">Add to cart</button>
        </div>
        <div class="item-right">
          <strong>${money(b.price)}</strong>
          <button class="remove" data-wish="${b.id}">Remove</button>
        </div>
      </li>`).join('');
    // Sync heart buttons in the grid / details dialog
    document.querySelectorAll('.wish-btn[data-wish]').forEach((btn) =>
      btn.setAttribute('aria-pressed', isWished(btn.dataset.wish)));
    saveWish();
  }

  function toggleWish(id) {
    id = Number(id);
    const adding = !isWished(id);
    state.wish = adding ? [...state.wish, id] : state.wish.filter((w) => w !== id);
    renderWish();
    toast(adding ? `Saved “${findBook(id).title}” to wishlist` : `Removed “${findBook(id).title}” from wishlist`);
  }

  function setWishOpen(open) {
    if (open) lastFocus = document.activeElement;
    el.wishDrawer.classList.toggle('open', open);
    el.wishDrawer.setAttribute('aria-hidden', String(!open));
    el.overlay.hidden = !open;
    el.wishToggle.setAttribute('aria-expanded', String(open));
    if (open) $('#wish-close').focus(); else if (lastFocus) lastFocus.focus();
  }

  /* ---------- Cart ---------- */
  const findBook = (id) => BOOKS.find((b) => b.id === Number(id));

  function totals() {
    const subtotal = Object.entries(state.cart).reduce((s, [id, q]) => s + findBook(id).price * q, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  function renderCart() {
    const ids = Object.keys(state.cart).filter((id) => findBook(id));
    const items = ids.reduce((s, id) => s + state.cart[id], 0);
    el.cartCount.textContent = items;
    el.cartEmpty.hidden = ids.length > 0;
    el.checkoutBtn.disabled = ids.length === 0;
    el.clear.hidden = ids.length === 0;

    el.cartList.innerHTML = ids.map((id) => {
      const b = findBook(id), q = state.cart[id];
      return `
        <li class="cart-item">
          ${cover(b, 'mini-cover')}
          <div>
            <h3>${esc(b.title)}</h3>
            <p>${esc(b.author)}</p>
            <div class="qty">
              <button data-dec="${b.id}" aria-label="Decrease quantity of ${esc(b.title)}">−</button>
              <span aria-live="polite">${q}</span>
              <button data-inc="${b.id}" aria-label="Increase quantity of ${esc(b.title)}">+</button>
            </div>
          </div>
          <div class="item-right">
            <strong>${money(b.price * q)}</strong>
            <button class="remove" data-remove="${b.id}">Remove</button>
          </div>
        </li>`;
    }).join('');

    const t = totals();
    el.subtotal.textContent = money(t.subtotal);
    el.shipping.textContent = t.shipping ? money(t.shipping) : (t.subtotal ? 'Free' : money(0));
    el.total.textContent = money(t.total);
    saveCart();
  }

  function addToCart(id) {
    state.cart[id] = (state.cart[id] || 0) + 1;
    renderCart();
    toast(`Added “${findBook(id).title}” to cart`);
  }
  function changeQty(id, delta) {
    const q = (state.cart[id] || 0) + delta;
    if (q <= 0) delete state.cart[id]; else state.cart[id] = q;
    renderCart();
  }

  /* ---------- Drawer ---------- */
  let lastFocus = null;
  function openCart() {
    lastFocus = document.activeElement;
    el.drawer.classList.add('open');
    el.drawer.setAttribute('aria-hidden', 'false');
    el.overlay.hidden = false;
    el.cartToggle.setAttribute('aria-expanded', 'true');
    $('#cart-close').focus();
  }
  function closeCart() {
    el.drawer.classList.remove('open');
    el.drawer.setAttribute('aria-hidden', 'true');
    el.overlay.hidden = true;
    el.cartToggle.setAttribute('aria-expanded', 'false');
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- Details dialog ---------- */
  function openDetails(id) {
    const b = findBook(id);
    el.bookBody.innerHTML = `
      ${cover(b)}
      <div>
        <h2 id="dlg-title">${esc(b.title)}</h2>
        <p class="meta">by ${esc(b.author)} · ${esc(b.category)} · ${b.year}</p>
        <span class="rating">${stars(b.rating)} <small>${b.rating} / 5</small></span>
        <p>${esc(b.description)}</p>
        <span class="price">${money(b.price)}</span>
        <button class="btn btn-primary" data-add="${b.id}">Add to cart</button>
        ${wishBtn(b, 'wish-text', ' Wishlist')}
      </div>`;
    el.bookDlg.showModal();
  }

  /* ---------- Checkout ---------- */
  function openCheckout() {
    closeCart();
    el.coForm.hidden = false;
    el.coDone.hidden = true;
    el.coForm.reset();
    el.coForm.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
    $('#co-total').textContent = money(totals().total);
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

  el.coForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(el.coForm)) return;
    $('#co-order').textContent = `#PW${Date.now().toString().slice(-7)}`;
    $('#co-mail').textContent = el.coForm.elements.email.value;
    state.cart = {};
    renderCart();
    el.coForm.hidden = true;
    el.coDone.hidden = false;
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  /* ---------- Events ---------- */
  el.search.addEventListener('input', (e) => { state.query = e.target.value; renderGrid(); });
  $('#search-form').addEventListener('submit', (e) => e.preventDefault());
  el.sort.addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

  el.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    state.category = chip.dataset.cat;
    renderChips();
    renderGrid();
  });

  // Delegated clicks for add / details / cart item actions
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-details],[data-inc],[data-dec],[data-remove],[data-wish]');
    if (!t) return;
    if (t.dataset.wish) toggleWish(t.dataset.wish);
    else if (t.dataset.add) addToCart(t.dataset.add);
    else if (t.dataset.details) openDetails(t.dataset.details);
    else if (t.dataset.inc) changeQty(t.dataset.inc, 1);
    else if (t.dataset.dec) changeQty(t.dataset.dec, -1);
    else if (t.dataset.remove) changeQty(t.dataset.remove, -Infinity);
  });

  el.cartToggle.addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', closeCart);
  el.overlay.addEventListener('click', () => {
    if (el.wishDrawer.classList.contains('open')) setWishOpen(false); else closeCart();
  });
  el.clear.addEventListener('click', () => { state.cart = {}; renderCart(); });
  el.checkoutBtn.addEventListener('click', openCheckout);
  el.wishToggle.addEventListener('click', () => setWishOpen(true));
  $('#wish-close').addEventListener('click', () => setWishOpen(false));
  el.wishClear.addEventListener('click', () => { state.wish = []; renderWish(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (el.drawer.classList.contains('open')) closeCart();
    else if (el.wishDrawer.classList.contains('open')) setWishOpen(false);
  });

  $('#dlg-close').addEventListener('click', () => el.bookDlg.close());
  $('#co-close').addEventListener('click', () => el.coDlg.close());
  $('#co-ok').addEventListener('click', () => el.coDlg.close());
  // Close dialogs when clicking the backdrop
  [el.bookDlg, el.coDlg].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Init ---------- */
  $('#year').textContent = new Date().getFullYear();
  renderChips();
  renderGrid();
  renderCart();
  renderWish();
})();
