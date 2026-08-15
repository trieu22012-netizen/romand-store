initLayout();

const $form = document.querySelector('[data-form]');
const $items = document.querySelector('[data-items]');
const $submit = document.querySelector('[data-submit]');
let config = { shippingFee: 30000, freeShipThreshold: 500000 };
let lastOrder = null;

function renderSummary() {
  const list = Cart.get();
  if (!list.length) {
    $items.innerHTML = `<div class="empty" style="padding:20px"><p style="margin:0">Giỏ hàng trống. <a href="#products" style="color:var(--rose);font-weight:700">Mua sắm ngay</a></p></div>`;
    document.querySelector('[data-subtotal]').textContent = '0₫';
    document.querySelector('[data-ship]').textContent = '0₫';
    document.querySelector('[data-total]').textContent = '0₫';
    $submit.disabled = true;
    return;
  }
  $items.innerHTML = list.map(i => `
    <div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--border);font-size:13px">
      <span class="dot" style="background:${i.colorHex};flex:none"></span>
      <div style="flex:1"><b>${escapeHtml(i.name)}</b><br/><span style="color:var(--muted)">${escapeHtml(i.colorName)} × ${i.qty}</span></div>
      <b style="color:var(--rose-dark);white-space:nowrap">${fmtPrice(i.price * i.qty)}</b>
    </div>`).join('');

  const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= config.freeShipThreshold ? 0 : config.shippingFee;
  document.querySelector('[data-subtotal]').textContent = fmtPrice(subtotal);
  document.querySelector('[data-ship]').textContent = shipping === 0 ? 'MIỄN PHÍ' : fmtPrice(shipping);
  document.querySelector('[data-total]').textContent = fmtPrice(subtotal + shipping);
}

const validators = {
  name: (v) => v.trim().length >= 2,
  phone: (v) => /^0\d{9,10}$/.test(v.trim()),
  address: (v) => v.trim().length >= 10
};

function validateField(name) {
  const field = $form.querySelector(`[data-field="${name}"]`);
  const input = field.querySelector('input');
  const ok = validators[name](input.value);
  field.classList.toggle('invalid', !ok);
  return ok;
}

Object.keys(validators).forEach(n => {
  $form.querySelector(`[name="${n}"]`).addEventListener('blur', () => validateField(n));
});

$form.querySelectorAll('[data-field]').forEach(f => {
  f.querySelector('input').addEventListener('input', () => f.classList.remove('invalid'));
});

document.querySelectorAll('[data-pay] .pay-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('[data-pay] .pay-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
  });
});

$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const allOk = Object.keys(validators).map(validateField).every(Boolean);
  if (!allOk) {
    Toast.show('Vui lòng kiểm tra lại thông tin đã điền', 'error');
    return;
  }
  const list = Cart.get();
  if (!list.length) { Toast.show('Giỏ hàng trống!', 'error'); return; }

  const pay = $form.querySelector('input[name="pay"]:checked').value;
  $submit.disabled = true;
  $submit.textContent = 'Đang xử lý...';

  try {
    const { data } = await API.post('/api/orders', {
      customer: {
        name: $form.name.value.trim(),
        phone: $form.phone.value.trim(),
        address: $form.address.value.trim(),
        note: $form.note.value.trim()
      },
      items: list.map(i => ({ productId: i.productId, colorId: i.colorId, qty: i.qty })),
      payment: { method: pay }
    });
    lastOrder = data.order;
    Cart.clear();
    const payLabel = document.querySelector('input[name="pay"]:checked').parentElement.querySelector('b').textContent;
    Modal.open(`
      <div class="m-icon">🎉</div>
      <h3>Đặt hàng thành công!</h3>
      <p style="color:var(--muted)">Mã đơn hàng của bạn là <b style="color:var(--rose-dark)">${lastOrder.code}</b>.<br/>Thanh toán: <b>${escapeHtml(payLabel)}</b><br/>Tổng: <b>${fmtPrice(lastOrder.total)}</b>.<br/>Chúng tôi sẽ liên hệ xác nhận trong ít phút.</p>
      <a class="btn btn-outline btn-block" style="margin-top:10px" href="track.html?code=${lastOrder.code}">Theo dõi đơn hàng</a>
    `);
  } catch (err) {
    Toast.show(err.message, 'error');
    $submit.disabled = false;
    $submit.textContent = 'Xác nhận đặt hàng';
  }
});

(async () => {
  try {
    const { data } = await API.get('/api/shipping-config');
    config = data;
  } catch (err) { /* keep default */ }
  renderSummary();
})();
