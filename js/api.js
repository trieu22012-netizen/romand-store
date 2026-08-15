/* ============================================================
   ROMAND Beauty Store — phiên bản TĨNH (GitHub Pages)
   Không cần backend: dữ liệu sản phẩm nhúng trong store-data.js,
   đơn hàng & cài đặt lưu vào localStorage của trình duyệt.
   ============================================================ */

var API = (() => {
  const IS_ADMIN = /\/admin\//.test(location.pathname);
  const IMG_PREFIX = IS_ADMIN ? '../' : '';

  const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];
  const PAYMENT_METHODS = ['cod', 'bank', 'momo'];

  function lsGet(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch { return def; }
  }
  function lsSet(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

  function loadProducts() {
    let list = lsGet('romand_products', null);
    if (!list) {
      list = JSON.parse(JSON.stringify(window.STORE_DATA.products));
      lsSet('romand_products', list);
    }
    return list;
  }
  function saveProducts(list) { lsSet('romand_products', list); }
  function loadOrders() { return lsGet('romand_orders', []); }
  function saveOrders(list) { lsSet('romand_orders', list); }
  function loadSettings() {
    return lsGet('romand_settings', {
      shippingFee: 30000,
      freeShipThreshold: 500000,
      adminPassword: 'admin123',
      shopInfo: {
        name: 'ROMAND Beauty Store',
        hotline: '0795683918',
        email: 'daolyy291106@gmail.com',
        address: 'Bình Dương'
      }
    });
  }
  function saveSettings(s) { lsSet('romand_settings', s); }

  function productJson(row) {
    return { ...row, image: IMG_PREFIX + row.image };
  }

  function auth() {
    if (!localStorage.getItem('adminToken')) throw new Error('Chưa đăng nhập hoặc phiên hết hạn');
  }

  function makeToken() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function makeOrderCode(orders) {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    let code;
    do { code = 'RMD' + ymd + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(); }
    while (orders.some(o => o.code === code));
    return code;
  }

  function matchProducts(list, query) {
    const { search, line, sort } = query;
    let res = list.filter(p => p.active !== false);
    if (search) {
      const q = String(search).toLowerCase();
      res = res.filter(p => p.name.toLowerCase().includes(q) || p.line.toLowerCase().includes(q));
    }
    if (line) res = res.filter(p => p.line === line);
    const orderBy = {
      newest: (a, b) => b.id - a.id,
      popular: (a, b) => b.sold - a.sold,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      default: (a, b) => a.id - b.id
    }[sort || 'default'];
    return res.sort(orderBy);
  }

  function upsertProduct(prods, body, id) {
    const obj = {
      id: id || Math.max(0, ...prods.map(p => p.id)) + 1,
      slug: slugify(body.name),
      name: body.name,
      line: body.line,
      weight: body.weight || '',
      origin: body.origin || 'Hàn Quốc',
      description: body.description || '',
      price: body.price,
      oldPrice: body.oldPrice || 0,
      stock: body.stock != null ? body.stock : 50,
      sold: body.sold || 0,
      image: body.image || '',
      featured: !!body.featured,
      active: body.active !== false,
      colors: (body.colors || []).map((c, i) => ({
        id: Date.now() + i,
        productId: id || 0,
        colorName: c.colorName,
        colorHex: c.colorHex,
        price: c.price || body.price,
        stock: c.stock != null ? c.stock : 50
      }))
    };
    if (id) {
      const idx = prods.findIndex(p => p.id === id);
      if (idx >= 0) {
        obj.colors.forEach(c => (c.productId = id));
        prods[idx] = obj;
        return obj;
      }
      return null;
    }
    prods.push(obj);
    return obj;
  }

  function slugify(s) {
    return String(s).toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  async function route(method, url, body) {
    const u = new URL(url, location.href);
    const path = u.pathname.slice(u.pathname.lastIndexOf('api/'));
    const q = Object.fromEntries(u.searchParams.entries());

    /* ---------- PUBLIC ---------- */
    if (method === 'GET' && path === 'api/product-lines') {
      const lines = [...new Set(loadProducts().filter(p => p.active !== false).map(p => p.line))].sort();
      return lines;
    }
    if (method === 'GET' && path === 'api/products/featured') {
      return matchProducts(loadProducts(), {}).filter(p => p.featured).map(productJson);
    }
    if (method === 'GET' && /^api\/products\/\d+$/.test(path)) {
      const p = loadProducts().find(x => x.id === Number(path.split('/')[2]));
      if (!p || p.active === false) throw new Error('Không tìm thấy sản phẩm');
      return productJson(p);
    }
    if (method === 'GET' && path.startsWith('api/products/')) {
      const p = loadProducts().find(x => x.slug === path.slice('api/products/'.length));
      if (!p || p.active === false) throw new Error('Không tìm thấy sản phẩm');
      return productJson(p);
    }
    if (method === 'GET' && path === 'api/products') {
      return matchProducts(loadProducts(), q).map(productJson);
    }
    if (method === 'GET' && path === 'api/shipping-config') {
      const s = loadSettings();
      return { shippingFee: s.shippingFee, freeShipThreshold: s.freeShipThreshold };
    }
    if (method === 'GET' && path === 'api/shop-info') {
      return loadSettings().shopInfo;
    }

    /* ---------- ĐẶT HÀNG ---------- */
    if (method === 'POST' && path === 'api/orders') {
      const { customer, items, payment } = body || {};
      if (!customer || !customer.name || !customer.phone || !customer.address) {
        throw new Error('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng');
      }
      if (!Array.isArray(items) || items.length === 0) throw new Error('Giỏ hàng trống');
      if (!PAYMENT_METHODS.includes(payment && payment.method)) throw new Error('Phương thức thanh toán không hợp lệ');

      const prods = loadProducts();
      let subtotal = 0;
      const payload = [];
      for (const it of items) {
        const prod = prods.find(x => String(x.id) === String(it.productId));
        if (!prod) throw new Error('Sản phẩm không tồn tại');
        const color = prod.colors.find(c => String(c.id) === String(it.colorId));
        if (!color) throw new Error('Vui lòng chọn màu son cho "' + prod.name + '"');
        const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
        subtotal += color.price * qty;
        payload.push({ productId: prod.id, name: prod.name, line: prod.line, colorName: color.colorName, colorHex: color.colorHex, price: color.price, qty });
        prod.sold = (prod.sold || 0) + qty;
        prod.stock = Math.max(0, (prod.stock || 0) - qty);
        color.stock = Math.max(0, (color.stock || 0) - qty);
      }
      saveProducts(prods);

      const s = loadSettings();
      const shipping = subtotal >= s.freeShipThreshold ? 0 : s.shippingFee;
      const orders = loadOrders();
      const orderId = Date.now();
      const order = {
        id: orderId,
        code: makeOrderCode(orders),
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        customer_note: customer.note || '',
        payment_method: payment.method,
        payment_status: 'pending',
        order_status: 'pending',
        subtotal,
        shipping,
        total: subtotal + shipping,
        created_at: new Date().toISOString(),
        updated_at: null,
        items: payload.map((it, i) => ({
          id: orderId + i,
          order_id: orderId,
          product_id: it.productId,
          product_name: it.name,
          line: it.line,
          color_name: it.colorName,
          color_hex: it.colorHex,
          price: it.price,
          qty: it.qty
        }))
      };
      orders.push(order);
      saveOrders(orders);
      return { order, message: 'Đặt hàng thành công' };
    }

    if (method === 'GET' && path === 'api/orders/lookup') {
      const orders = loadOrders();
      if (q.code) {
        const order = orders.find(o => o.code === String(q.code).trim().toUpperCase());
        if (!order) throw new Error('Không tìm thấy đơn hàng');
        return order;
      }
      if (q.phone) {
        const list = orders.filter(o => o.customer_phone.includes(String(q.phone).trim()));
        return list;
      }
      throw new Error('Thiếu mã đơn hàng hoặc số điện thoại');
    }

    /* ---------- ADMIN ---------- */
    if (method === 'POST' && path === 'api/admin/login') {
      const correct = loadSettings().adminPassword || 'admin123';
      if (String((body || {}).password || '') !== String(correct)) {
        throw new Error('Mật khẩu không đúng');
      }
      const token = makeToken();
      localStorage.setItem('adminToken', token);
      return { token, shopInfo: loadSettings().shopInfo };
    }

    auth();

    if (method === 'GET' && path === 'api/admin/stats') {
      const orders = loadOrders();
      const prods = loadProducts();
      const totalRevenue = orders.filter(o => o.order_status !== 'cancelled').reduce((s, o) => s + o.total, 0);
      const byStatusMap = {};
      orders.forEach(o => { byStatusMap[o.order_status] = (byStatusMap[o.order_status] || 0) + 1; });
      const byLineMap = {};
      prods.forEach(p => {
        if (!byLineMap[p.line]) byLineMap[p.line] = { line: p.line, count: 0, s: 0 };
        byLineMap[p.line].count++;
        byLineMap[p.line].s += p.sold || 0;
      });
      return {
        totalRevenue,
        ordersCount: orders.length,
        productsCount: prods.length,
        byStatus: Object.keys(byStatusMap).map(s => ({ s, c: byStatusMap[s] })),
        byLine: Object.values(byLineMap)
      };
    }

    if (method === 'GET' && path === 'api/admin/orders') {
      const orders = loadOrders();
      let list = orders;
      if (q.status) list = list.filter(o => o.order_status === q.status);
      return list.slice().sort((a, b) => b.id - a.id);
    }

    const orderByCode = /^api\/admin\/orders\/([^/]+)$/.exec(path);
    if (orderByCode) {
      const code = orderByCode[1].toUpperCase();
      if (method === 'GET') {
        const order = loadOrders().find(o => o.code === code);
        if (!order) throw new Error('Không tìm thấy đơn hàng');
        return order;
      }
      if (method === 'PATCH') {
        const orders = loadOrders();
        const order = orders.find(o => o.code === code);
        if (!order) throw new Error('Không tìm thấy đơn hàng');
        const { order_status, payment_status } = body || {};
        if (order_status !== undefined && !ORDER_STATUSES.includes(order_status)) throw new Error('Trạng thái đơn hàng không hợp lệ');
        if (payment_status !== undefined && !PAYMENT_STATUSES.includes(payment_status)) throw new Error('Trạng thái thanh toán không hợp lệ');
        if (order_status !== undefined) order.order_status = order_status;
        if (payment_status !== undefined) order.payment_status = payment_status;
        order.updated_at = new Date().toISOString();
        saveOrders(orders);
        return order;
      }
      if (method === 'DELETE') {
        const orders = loadOrders();
        const idx = orders.findIndex(o => o.code === code);
        if (idx < 0) throw new Error('Không tìm thấy đơn hàng');
        orders.splice(idx, 1);
        saveOrders(orders);
        return { message: 'Đã xoá đơn hàng' };
      }
    }

    if (method === 'GET' && path === 'api/admin/products') {
      return loadProducts().map(productJson);
    }

    if (method === 'POST' && path === 'api/admin/products') {
      const p = body || {};
      if (!p.name || !p.line || !p.price || !Array.isArray(p.colors) || p.colors.length === 0) {
        throw new Error('Thiếu thông tin sản phẩm hoặc màu son');
      }
      const prods = loadProducts();
      const created = upsertProduct(prods, p);
      saveProducts(prods);
      return productJson(created);
    }

    const productById = /^api\/admin\/products\/(\d+)$/.exec(path);
    if (productById) {
      const id = Number(productById[1]);
      const prods = loadProducts();
      const exist = prods.find(x => x.id === id);
      if (!exist) throw new Error('Không tìm thấy sản phẩm');
      if (method === 'PUT') {
        const p = body || {};
        const updated = upsertProduct(prods, p, id);
        saveProducts(prods);
        return productJson(updated);
      }
      if (method === 'DELETE') {
        prods.splice(prods.indexOf(exist), 1);
        saveProducts(prods);
        return { message: 'Đã xoá sản phẩm' };
      }
    }

    if (method === 'GET' && path === 'api/admin/settings') {
      const s = loadSettings();
      return { adminPassword: '***', shippingFee: s.shippingFee, freeShipThreshold: s.freeShipThreshold, shopInfo: s.shopInfo };
    }

    if (method === 'PUT' && path === 'api/admin/settings') {
      const s = loadSettings();
      const { shippingFee, freeShipThreshold, shopInfo, adminPassword } = body || {};
      if (shippingFee !== undefined) s.shippingFee = Number(shippingFee) || 0;
      if (freeShipThreshold !== undefined) s.freeShipThreshold = Number(freeShipThreshold) || 0;
      if (shopInfo) s.shopInfo = { ...s.shopInfo, ...shopInfo };
      if (adminPassword && adminPassword !== '***') s.adminPassword = String(adminPassword);
      saveSettings(s);
      return { message: 'Đã lưu cài đặt' };
    }

    throw new Error('Không tìm thấy');
  }

  async function request(method, url, body) {
    const data = await route(method, url, body);
    return { ok: true, data };
  }

  return {
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body),
    put: (url, body) => request('PUT', url, body),
    patch: (url, body) => request('PATCH', url, body),
    del: (url) => request('DELETE', url)
  };
})();

function fmtPrice(n) {
  return Number(n || 0).toLocaleString('vi-VN') + '₫';
}

function percentOff(oldPrice, price) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------- Cart (localStorage) ---------------- */
const Cart = {
  KEY: 'romand_cart',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; }
  },
  save(list) {
    localStorage.setItem(this.KEY, JSON.stringify(list));
    this.updateBadge();
  },
  keyOf(productId, colorId) { return productId + ':' + colorId; },
  add(item) {
    const list = this.get();
    const key = this.keyOf(item.productId, item.colorId);
    const found = list.find(i => i.key === key);
    if (found) found.qty = Math.min(found.qty + item.qty, 99);
    else list.push({ key, ...item });
    this.save(list);
    return list;
  },
  updateQty(key, qty) {
    const list = this.get();
    const item = list.find(i => i.key === key);
    if (item) { item.qty = Math.max(1, Math.min(99, qty)); this.save(list); }
    return list;
  },
  remove(key) {
    const list = this.get().filter(i => i.key !== key);
    this.save(list);
    return list;
  },
  clear() { this.save([]); },
  count() { return this.get().reduce((n, i) => n + i.qty, 0); },
  updateBadge() {
    const n = this.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = n;
      el.style.display = n > 0 ? 'inline-flex' : 'none';
    });
  }
};

/* ---------------- Toasts ---------------- */
const Toast = {
  show(msg, type = 'info') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2600);
  }
};

/* ---------------- Modal ---------------- */
const Modal = {
  open(html) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal">${html}<button class="btn btn-rose btn-block" data-close>OK</button></div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.dataset.close !== undefined) bg.remove(); });
    document.body.appendChild(bg);
  }
};
