initLayout();

const $form = document.querySelector('[data-form]');
const $results = document.querySelector('[data-results]');
const $codeField = document.querySelector('[data-field="code"]');
const $phoneField = document.querySelector('[data-field="phone"]');
let mode = 'code';

const statusSteps = ['pending', 'confirmed', 'shipping', 'delivered'];

function timeline(order) {
  const idx = statusSteps.indexOf(order.order_status);
  if (order.order_status === 'cancelled') {
    return `<div class="status-timeline"><span class="step">Đơn đã huỷ</span></div>`;
  }
  return `<div class="status-timeline">
    ${statusSteps.map((s, i) => `
      <span class="step ${i <= idx ? 'done' : ''} ${i === idx ? 'cur' : ''}">
        ${['Đặt hàng', 'Xác nhận', 'Đang giao', 'Đã giao'][i]}
      </span>`).join('')}
  </div>`;
}

function orderCard(o) {
  const payLabels = { cod: 'COD - Trả khi nhận hàng', bank: 'Chuyển khoản ngân hàng', momo: 'Ví MoMo' };
  return `
  <div class="order-card">
    <div class="order-head">
      <div>
        <div class="order-code">Mã đơn: ${o.code}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">Đặt lúc ${new Date(o.created_at).toLocaleString('vi-VN')}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${orderStatusBadge(o.order_status)}
        ${orderStatusBadge(o.payment_status)}
      </div>
    </div>
    <div class="order-body">
      <div class="order-info">
        <div><b>Người nhận</b>${escapeHtml(o.customer_name)}</div>
        <div><b>Số điện thoại</b>${escapeHtml(o.customer_phone)}</div>
        <div><b>Địa chỉ</b>${escapeHtml(o.customer_address)}</div>
        <div><b>Thanh toán</b>${payLabels[o.payment_method] || o.payment_method}</div>
      </div>
      <table class="order-table">
        <thead><tr><th></th><th>Sản phẩm</th><th>Màu</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
        <tbody>
          ${o.items.map(it => `
            <tr>
              <td><span class="dot" style="background:${it.color_hex};display:inline-block;width:20px;height:20px"></span></td>
              <td>${escapeHtml(it.product_name)}</td>
              <td>${escapeHtml(it.color_name)}</td>
              <td>${fmtPrice(it.price)}</td>
              <td>${it.qty}</td>
              <td><b>${fmtPrice(it.price * it.qty)}</b></td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="order-total">
        Tạm tính: ${fmtPrice(o.subtotal)} · Phí ship: ${o.shipping === 0 ? 'Miễn phí' : fmtPrice(o.shipping)}<br/>
        <b>Tổng: ${fmtPrice(o.total)}</b>
      </div>
      ${o.customer_note ? `<div style="font-size:13px;color:var(--muted);margin-top:8px"><b>Ghi chú:</b> ${escapeHtml(o.customer_note)}</div>` : ''}
      ${timeline(o)}
    </div>
  </div>`;
}

document.querySelectorAll('[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    mode = tab.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach(t => t.classList.toggle('active', t === tab));
    $codeField.style.display = mode === 'code' ? '' : 'none';
    $phoneField.style.display = mode === 'phone' ? '' : 'none';
  });
});

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $form.code.value.trim();
  const phone = $form.phone.value.trim();
  if (mode === 'code' && !code) { Toast.show('Vui lòng nhập mã đơn hàng', 'error'); return; }
  if (mode === 'phone' && !phone) { Toast.show('Vui lòng nhập số điện thoại', 'error'); return; }
  $results.innerHTML = `<div class="empty"><p>Đang tra cứu...</p></div>`;
  try {
    const url = mode === 'code' ? '/api/orders/lookup?code=' + encodeURIComponent(code) : '/api/orders/lookup?phone=' + encodeURIComponent(phone);
    const { data } = await API.get(url);
    if (Array.isArray(data)) {
      $results.innerHTML = data.length
        ? data.map(orderCard).join('')
        : `<div class="empty"><div class="big">📭</div><h3>Không tìm thấy đơn hàng</h3><p>Số điện thoại này chưa đặt đơn nào.</p></div>`;
    } else {
      $results.innerHTML = orderCard(data);
    }
  } catch (err) {
    $results.innerHTML = `<div class="empty"><div class="big">🤔</div><h3>${escapeHtml(err.message)}</h3><p>Kiểm tra lại mã đơn hoặc số điện thoại nhé.</p></div>`;
  }
});

const urlCode = new URLSearchParams(window.location.search).get('code');
if (urlCode) {
  $form.code.value = urlCode;
  $form.dispatchEvent(new Event('submit'));
}
