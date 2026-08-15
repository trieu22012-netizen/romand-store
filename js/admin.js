if (!localStorage.getItem('adminToken')) {
  window.location.href = 'login.html';
}

let products = [];
let orders = [];

const STATUS_LABELS = {
  pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng',
  delivered: 'Đã giao', cancelled: 'Đã huỷ', paid: 'Đã thanh toán', pending_pay: 'Chưa thanh toán'
};
const ORDER_STATUS_CLASS = {
  pending: 'st-pending', confirmed: 'st-confirmed', shipping: 'st-shipping',
  delivered: 'st-delivered', cancelled: 'st-cancelled'
};

function switchView(view) {
  document.querySelectorAll('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  document.querySelectorAll('[data-view-panel]').forEach(p => p.style.display = p.dataset.viewPanel === view ? '' : 'none');
  if (view === 'dashboard') loadStats();
  if (view === 'orders') loadOrders();
  if (view === 'products') loadProducts();
  if (view === 'settings') loadSettings();
}

document.querySelectorAll('[data-view]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  switchView(a.dataset.view);
}));

document.querySelector('[data-logout]').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('adminToken');
  window.location.href = 'login.html';
});

/* ---------- Dashboard ---------- */
async function loadStats() {
  const { data } = await API.get('/api/admin/stats');
  document.querySelector('[data-s-rev]').textContent = fmtPrice(data.totalRevenue);
  document.querySelector('[data-s-orders]').textContent = data.ordersCount;
  document.querySelector('[data-s-products]').textContent = data.productsCount;
  document.querySelector('[data-dash-status]').innerHTML = data.byStatus.length
    ? data.byStatus.map(s => `
      <tr><td>${STATUS_LABELS[s.s] || s.s}</td><td><b>${s.c}</b> đơn</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;color:var(--muted)">Chưa có đơn hàng</td></tr>';
}

/* ---------- Orders ---------- */
async function loadOrders() {
  const filter = document.querySelector('[data-order-filter]').value;
  const url = filter ? '/api/admin/orders?status=' + encodeURIComponent(filter) : '/api/admin/orders';
  const { data } = await API.get(url);
  orders = data;
  const rows = document.querySelector('[data-order-rows]');
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">Chưa có đơn hàng nào</td></tr>';
    return;
  }
  rows.innerHTML = data.map(o => `
    <tr>
      <td><b style="color:var(--rose-dark)">${o.code}</b><br/><span style="font-size:12px;color:var(--muted)">${new Date(o.created_at).toLocaleString('vi-VN')}</span></td>
      <td>${escapeHtml(o.customer_name)}</td>
      <td>${escapeHtml(o.customer_phone)}</td>
      <td style="max-width:180px">${escapeHtml(o.customer_address)}</td>
      <td><b>${fmtPrice(o.total)}</b></td>
      <td>${o.payment_method.toUpperCase()}<br/><span class="order-status ${o.payment_status === 'paid' ? 'st-paid' : 'st-pending'}">${STATUS_LABELS[o.payment_status] || o.payment_status}</span></td>
      <td>
        <select class="filter-select" data-status="${o.code}">
          ${Object.keys(STATUS_LABELS).filter(s => ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'].includes(s)).map(s =>
            `<option value="${s}" ${o.order_status === s ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="filter-select" data-paystatus="${o.code}">
          <option value="pending" ${o.payment_status === 'pending' ? 'selected' : ''}>Chưa thanh toán</option>
          <option value="paid" ${o.payment_status === 'paid' ? 'selected' : ''}>Đã thanh toán</option>
          <option value="refunded" ${o.payment_status === 'refunded' ? 'selected' : ''}>Hoàn tiền</option>
        </select>
      </td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12.5px" data-view-order="${o.code}">Xem</button>
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12.5px;color:#c0392b;background:#fde8e8" data-del-order="${o.code}">Xoá</button>
      </td>
    </tr>`).join('');

  rows.querySelectorAll('[data-status]').forEach(sel => sel.addEventListener('change', async () => {
    try {
      await API.patch('/api/admin/orders/' + sel.dataset.status, { order_status: sel.value });
      Toast.show('Đã cập nhật trạng thái đơn hàng', 'success');
      loadOrders();
    } catch (err) { Toast.show(err.message, 'error'); }
  }));
  rows.querySelectorAll('[data-paystatus]').forEach(sel => sel.addEventListener('change', async () => {
    try {
      await API.patch('/api/admin/orders/' + sel.dataset.paystatus, { payment_status: sel.value });
      Toast.show('Đã cập nhật trạng thái thanh toán', 'success');
    } catch (err) { Toast.show(err.message, 'error'); }
  }));
  rows.querySelectorAll('[data-del-order]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Xoá đơn hàng ' + b.dataset.delOrder + '?')) return;
    try {
      await API.del('/api/admin/orders/' + b.dataset.delOrder);
      Toast.show('Đã xoá đơn hàng', 'success');
      loadOrders();
    } catch (err) { Toast.show(err.message, 'error'); }
  }));
  rows.querySelectorAll('[data-view-order]').forEach(b => b.addEventListener('click', () => {
    const o = orders.find(x => x.code === b.dataset.viewOrder);
    if (!o) return;
    Modal.open(`
      <h3>Đơn hàng ${o.code}</h3>
      <div style="font-size:14px;line-height:2">
        <b>Khách:</b> ${escapeHtml(o.customer_name)} - ${escapeHtml(o.customer_phone)}<br/>
        <b>Địa chỉ:</b> ${escapeHtml(o.customer_address)}<br/>
        <b>Thanh toán:</b> ${o.payment_method.toUpperCase()} ${orderStatusBadge(o.payment_status)}<br/>
        ${o.customer_note ? `<b>Ghi chú:</b> ${escapeHtml(o.customer_note)}<br/>` : ''}
        <hr style="border:none;border-top:1px dashed var(--border);margin:8px 0"/>
        ${o.items.map(it => `• ${escapeHtml(it.product_name)} - ${escapeHtml(it.color_name)} × ${it.qty} = ${fmtPrice(it.price * it.qty)}<br/>`).join('')}
        <hr style="border:none;border-top:1px dashed var(--border);margin:8px 0"/>
        <b>Tổng: ${fmtPrice(o.total)}</b> (ship ${o.shipping === 0 ? 'Miễn phí' : fmtPrice(o.shipping)})
      </div>
    `);
  }));
}

document.querySelector('[data-order-filter]').addEventListener('change', loadOrders);

/* ---------- Products ---------- */
async function loadProducts() {
  const { data } = await API.get('/api/admin/products');
  products = data;
  const rows = document.querySelector('[data-product-rows]');
  if (!data.length) {
    rows.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px">Chưa có sản phẩm</td></tr>';
    return;
  }
  rows.innerHTML = data.map(p => `
    <tr>
      <td><img src="${escapeHtml(p.image)}" style="width:52px;height:52px;border-radius:10px;background:var(--pink)" /></td>
      <td style="max-width:260px">${escapeHtml(p.name)}${p.active ? '' : ' <span class="tag st-cancelled">Ẩn</span>'}</td>
      <td>${escapeHtml(p.line)}</td>
      <td><b style="color:var(--rose-dark)">${fmtPrice(p.price)}</b></td>
      <td>${p.colors.length} màu</td>
      <td>${p.stock}</td>
      <td>${p.sold}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12.5px" data-edit="${p.id}">Sửa</button>
        <button class="btn btn-ghost" style="padding:6px 12px;font-size:12.5px;color:#c0392b;background:#fde8e8" data-del-product="${p.id}">Xoá</button>
      </td>
    </tr>`).join('');

  rows.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const p = products.find(x => x.id === Number(b.dataset.edit));
    if (p) openProductModal(p);
  }));
  rows.querySelectorAll('[data-del-product]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Xoá sản phẩm này?')) return;
    try {
      await API.del('/api/admin/products/' + b.dataset.delProduct);
      Toast.show('Đã xoá sản phẩm', 'success');
      loadProducts();
    } catch (err) { Toast.show(err.message, 'error'); }
  }));
}

document.querySelector('[data-add-product]').addEventListener('click', () => openProductModal(null));

function colorRow(color = { colorName: '', colorHex: '#d64560', price: '' }) {
  return `
    <div style="display:grid;grid-template-columns:1fr 60px 1fr 34px;gap:8px;margin-bottom:8px;align-items:center" data-color-row>
      <input type="text" class="c-name" value="${escapeHtml(color.colorName)}" placeholder="Tên màu (vd: 07 Jujube)" />
      <input type="color" class="c-hex" value="${color.colorHex}" />
      <input type="number" class="c-price" value="${color.price || ''}" placeholder="Giá (để trống = giá chung)" />
      <button type="button" class="btn btn-ghost" style="padding:6px" data-del-color>✕</button>
    </div>`;
}

function openProductModal(p) {
  const container = document.querySelector('[data-pmodal]');
  const isEdit = !!p;
  container.innerHTML = `
  <div class="modal-bg">
    <div class="modal" style="max-width:640px;max-height:90vh;overflow:auto">
      <h3>${isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
      <div class="field"><label>Tên sản phẩm *</label><input type="text" data-f-name value="${isEdit ? escapeHtml(p.name) : ''}" /></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label>Dòng son *</label><input type="text" data-f-line value="${isEdit ? escapeHtml(p.line) : ''}" placeholder="vd: Juicy Lasting Tint" /></div>
        <div class="field"><label>Trọng lượng</label><input type="text" data-f-weight value="${isEdit ? escapeHtml(p.weight) : ''}" placeholder="vd: 5.5g" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px">
        <div class="field"><label>Giá (₫) *</label><input type="number" data-f-price value="${isEdit ? p.price : ''}" /></div>
        <div class="field"><label>Giá cũ (₫)</label><input type="number" data-f-old value="${isEdit ? p.oldPrice : ''}" /></div>
        <div class="field"><label>Tồn kho</label><input type="number" data-f-stock value="${isEdit ? p.stock : 50}" /></div>
        <div class="field"><label>Đã bán</label><input type="number" data-f-sold value="${isEdit ? p.sold : 0}" /></div>
      </div>
      <div class="field"><label>Mô tả</label><textarea data-f-desc rows="3">${isEdit ? escapeHtml(p.description) : ''}</textarea></div>
      <div class="field">
        <label>Màu son * (tối thiểu 1 màu)</label>
        <div data-colors>${(p ? p.colors : [{ colorName: '', colorHex: '#d64560', price: '' }]).map(colorRow).join('')}</div>
        <button type="button" class="btn btn-ghost" style="padding:8px 14px;font-size:13px" data-add-color>+ Thêm màu</button>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:16px;align-items:center">
        <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-f-featured ${isEdit && p.featured ? 'checked' : ''} /> Nổi bật</label>
        <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-f-active ${!isEdit || p.active ? 'checked' : ''} /> Đang bán</label>
      </div>
      <button class="btn btn-rose btn-block" data-save-product>${isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
    </div>
  </div>`;

  container.querySelectorAll('[data-add-color]').forEach(b => b.addEventListener('click', () => {
    document.querySelector('[data-colors]').insertAdjacentHTML('beforeend', colorRow());
    bindColorDel();
  }));
  bindColorDel();

  container.querySelector('[data-save-product]').addEventListener('click', async () => {
    const $ = (sel) => container.querySelector(sel);
    const colorRows = [...container.querySelectorAll('[data-color-row]')];
    const colors = colorRows.map(r => ({
      colorName: r.querySelector('.c-name').value.trim(),
      colorHex: r.querySelector('.c-hex').value,
      price: parseInt(r.querySelector('.c-price').value, 10) || 0
    })).filter(c => c.colorName);

    const payload = {
      name: $('[data-f-name]').value.trim(),
      line: $('[data-f-line]').value.trim(),
      weight: $('[data-f-weight]').value.trim(),
      price: parseInt($('[data-f-price]').value, 10) || 0,
      oldPrice: parseInt($('[data-f-old]').value, 10) || 0,
      stock: parseInt($('[data-f-stock]').value, 10) || 0,
      sold: parseInt($('[data-f-sold]').value, 10) || 0,
      description: $('[data-f-desc]').value.trim(),
      featured: $('[data-f-featured]').checked,
      active: $('[data-f-active]').checked,
      colors
    };
    if (!payload.name || !payload.line || !payload.price || !colors.length) {
      Toast.show('Vui lòng điền đủ tên, dòng son, giá và ít nhất 1 màu', 'error');
      return;
    }
    try {
      if (isEdit) {
        await API.put('/api/admin/products/' + p.id, payload);
        Toast.show('Đã lưu sản phẩm', 'success');
      } else {
        await API.post('/api/admin/products', payload);
        Toast.show('Đã thêm sản phẩm mới', 'success');
      }
      container.innerHTML = '';
      loadProducts();
    } catch (err) { Toast.show(err.message, 'error'); }
  });

  container.querySelector('.modal-bg').addEventListener('click', (e) => {
    if (e.target === container.querySelector('.modal-bg')) container.innerHTML = '';
  });
}

function bindColorDel() {
  document.querySelectorAll('[data-del-color]').forEach(b => b.addEventListener('click', () => b.closest('[data-color-row]').remove()));
}

/* ---------- Settings ---------- */
async function loadSettings() {
  const { data } = await API.get('/api/admin/settings');
  document.querySelector('[data-set-shippingFee]').value = data.shippingFee;
  document.querySelector('[data-set-freeShipThreshold]').value = data.freeShipThreshold;
  document.querySelector('[data-set-shopname]').value = data.shopInfo.name || '';
  document.querySelector('[data-set-hotline]').value = data.shopInfo.hotline || '';
  document.querySelector('[data-set-email]').value = data.shopInfo.email || '';
  document.querySelector('[data-set-address]').value = data.shopInfo.address || '';
}

document.querySelector('[data-save-settings]').addEventListener('click', async () => {
  const $ = (sel) => document.querySelector(sel);
  const payload = {
    shippingFee: parseInt($('[data-set-shippingFee]').value, 10) || 0,
    freeShipThreshold: parseInt($('[data-set-freeShipThreshold]').value, 10) || 0,
    shopInfo: {
      name: $('[data-set-shopname]').value.trim(),
      hotline: $('[data-set-hotline]').value.trim(),
      email: $('[data-set-email]').value.trim(),
      address: $('[data-set-address]').value.trim()
    }
  };
  const pw = $('[data-set-password]').value.trim();
  if (pw) payload.adminPassword = pw;
  try {
    await API.put('/api/admin/settings', payload);
    Toast.show('Đã lưu cài đặt', 'success');
    $('[data-set-password]').value = '';
  } catch (err) { Toast.show(err.message, 'error'); }
});

switchView('dashboard');
