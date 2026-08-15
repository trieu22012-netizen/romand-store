const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { initSchema, getSetting, setSetting, getProducts, getProductById, getProductBySlug, getLines, createOrder, getOrderByCode, getOrders, updateOrderStatus, deleteOrder, stats, upsertProduct, deleteProduct } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const tokens = new Map();

function ensureDefaults() {
  if (getSetting('adminPassword') === undefined) setSetting('adminPassword', 'admin123');
  if (getSetting('shippingFee') === undefined) setSetting('shippingFee', 30000);
  if (getSetting('freeShipThreshold') === undefined) setSetting('freeShipThreshold', 500000);
  if (getSetting('shopInfo') === undefined) {
    setSetting('shopInfo', {
      name: 'ROMAND Beauty Store',
      hotline: '1900 636 510',
      email: 'contact@romandstore.io.vn',
      address: '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
      note: 'Freeship đơn từ 500.000đ'
    });
  }
}

function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên hết hạn' });
  }
  next();
}

function ok(res, data) { res.json({ ok: true, data }); }
function fail(res, status, message) { res.status(status).json({ ok: false, error: message }); }

const PAYMENT_METHODS = ['cod', 'bank', 'momo'];
const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded'];

initSchema();
ensureDefaults();

// ---------- PUBLIC: sản phẩm ----------
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/product-lines', (req, res) => ok(res, getLines()));

app.get('/api/products', (req, res) => {
  const { search, line, sort } = req.query;
  ok(res, getProducts({ search, line, sort, active: true }));
});

app.get('/api/products/featured', (req, res) => {
  ok(res, getProducts({ active: true }).filter(p => p.featured));
});

app.get('/api/products/:idOrSlug', (req, res) => {
  const param = req.params.idOrSlug;
  const p = /^\d+$/.test(param) ? getProductById(Number(param)) : getProductBySlug(param);
  if (!p || !p.active) return fail(res, 404, 'Không tìm thấy sản phẩm');
  ok(res, p);
});

app.get('/api/shop-info', (req, res) => ok(res, getSetting('shopInfo', {})));

app.get('/api/shipping-config', (req, res) => ok(res, {
  shippingFee: getSetting('shippingFee', 30000),
  freeShipThreshold: getSetting('freeShipThreshold', 500000)
}));

// ---------- Đặt hàng ----------
app.post('/api/orders', (req, res) => {
  const { customer, items, payment } = req.body || {};
  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return fail(res, 400, 'Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng');
  }
  if (!Array.isArray(items) || items.length === 0) {
    return fail(res, 400, 'Giỏ hàng trống');
  }
  if (!PAYMENT_METHODS.includes(payment?.method)) {
    return fail(res, 400, 'Phương thức thanh toán không hợp lệ');
  }
  let subtotal = 0;
  const payload = [];
  for (const it of items) {
    const prod = getProductById(Number(it.productId));
    if (!prod) return fail(res, 400, `Sản phẩm không tồn tại`);
    const color = prod.colors.find(c => String(c.id) === String(it.colorId));
    if (!color) return fail(res, 400, `Vui lòng chọn màu son cho "${prod.name}"`);
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    const price = color.price;
    subtotal += price * qty;
    payload.push({ productId: prod.id, name: prod.name, line: prod.line, colorName: color.colorName, colorHex: color.colorHex, price, qty });
  }
  const fee = getSetting('shippingFee', 30000);
  const freeThreshold = getSetting('freeShipThreshold', 500000);
  const shipping = subtotal >= freeThreshold ? 0 : fee;
  const order = createOrder({ customer, items: payload, payment, subtotal, shipping });
  ok(res, { order, message: 'Đặt hàng thành công' });
});

app.get('/api/orders/lookup', (req, res) => {
  const { code, phone } = req.query;
  if (code) {
    const order = getOrderByCode(String(code).trim().toUpperCase());
    if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng');
    return ok(res, order);
  }
  if (phone) {
    const orders = getOrders().filter(o => o.customer_phone.includes(String(phone).trim()));
    return ok(res, orders);
  }
  fail(res, 400, 'Thiếu mã đơn hàng hoặc số điện thoại');
});

// ---------- Admin ----------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const correct = getSetting('adminPassword', 'admin123');
  const hash = crypto.createHash('sha256').update(String(password || '')).digest('hex');
  const correctHash = crypto.createHash('sha256').update(String(correct)).digest('hex');
  if (hash !== correctHash) return fail(res, 401, 'Mật khẩu không đúng');
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, { createdAt: Date.now() });
  ok(res, { token, shopInfo: getSetting('shopInfo', {}) });
});

app.get('/api/admin/stats', adminAuth, (req, res) => ok(res, stats()));

app.get('/api/admin/orders', adminAuth, (req, res) => {
  const { status } = req.query;
  ok(res, getOrders({ status }));
});

app.get('/api/admin/orders/:code', adminAuth, (req, res) => {
  const order = getOrderByCode(req.params.code.toUpperCase());
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng');
  ok(res, order);
});

app.patch('/api/admin/orders/:code', adminAuth, (req, res) => {
  const { order_status, payment_status } = req.body || {};
  if (order_status !== undefined && !ORDER_STATUSES.includes(order_status)) {
    return fail(res, 400, 'Trạng thái đơn hàng không hợp lệ');
  }
  if (payment_status !== undefined && !PAYMENT_STATUSES.includes(payment_status)) {
    return fail(res, 400, 'Trạng thái thanh toán không hợp lệ');
  }
  const order = updateOrderStatus(req.params.code.toUpperCase(), { order_status, payment_status });
  if (!order) return fail(res, 404, 'Không tìm thấy đơn hàng');
  ok(res, order);
});

app.delete('/api/admin/orders/:code', adminAuth, (req, res) => {
  const done = deleteOrder(req.params.code.toUpperCase());
  if (!done) return fail(res, 404, 'Không tìm thấy đơn hàng');
  ok(res, { message: 'Đã xoá đơn hàng' });
});

app.get('/api/admin/products', adminAuth, (req, res) => ok(res, getProducts({})));

app.post('/api/admin/products', adminAuth, (req, res) => {
  const p = req.body || {};
  if (!p.name || !p.line || !p.price || !Array.isArray(p.colors) || p.colors.length === 0) {
    return fail(res, 400, 'Thiếu thông tin sản phẩm hoặc màu son');
  }
  ok(res, upsertProduct(p));
});

app.put('/api/admin/products/:id', adminAuth, (req, res) => {
  const p = req.body || {};
  const exist = getProductById(Number(req.params.id));
  if (!exist) return fail(res, 404, 'Không tìm thấy sản phẩm');
  ok(res, upsertProduct({ ...p, id: Number(req.params.id) }));
});

app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
  const exist = getProductById(Number(req.params.id));
  if (!exist) return fail(res, 404, 'Không tìm thấy sản phẩm');
  deleteProduct(Number(req.params.id));
  ok(res, { message: 'Đã xoá sản phẩm' });
});

app.get('/api/admin/settings', adminAuth, (req, res) => ok(res, {
  adminPassword: '***',
  shippingFee: getSetting('shippingFee'),
  freeShipThreshold: getSetting('freeShipThreshold'),
  shopInfo: getSetting('shopInfo')
}));

app.put('/api/admin/settings', adminAuth, (req, res) => {
  const { shippingFee, freeShipThreshold, shopInfo, adminPassword } = req.body || {};
  if (shippingFee !== undefined) setSetting('shippingFee', Number(shippingFee) || 0);
  if (freeShipThreshold !== undefined) setSetting('freeShipThreshold', Number(freeShipThreshold) || 0);
  if (shopInfo) setSetting('shopInfo', shopInfo);
  if (adminPassword && adminPassword !== '***') setSetting('adminPassword', String(adminPassword));
  ok(res, { message: 'Đã lưu cài đặt' });
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'Không tìm thấy' }));

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('==========================================');
  console.log('  ROMAND Beauty Store - Sẵn sàng!');
  console.log(`  Trang chủ:    http://localhost:${PORT}`);
  console.log(`  Trang quản trị: http://localhost:${PORT}/admin/`);
  console.log('  (Mật khẩu admin mặc định: admin123)');
  console.log('==========================================');
  console.log('');
});
