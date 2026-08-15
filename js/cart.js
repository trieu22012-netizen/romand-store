initLayout();

const $cart = document.querySelector('[data-cart]');
let config = { shippingFee: 30000, freeShipThreshold: 500000 };

function cartItemHtml(item) {
  return `
  <div class="cart-item">
    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
    <div>
      <div class="ci-name">${escapeHtml(item.name)}</div>
      <div class="ci-color"><span class="dot" style="background:${item.colorHex}"></span>${escapeHtml(item.colorName)}</div>
      <div class="ci-price">${fmtPrice(item.price)} / cái</div>
      <div class="qty" style="margin-top:8px">
        <button data-minus="${item.key}">−</button>
        <input type="text" value="${item.qty}" readonly style="width:44px" />
        <button data-plus="${item.key}">+</button>
      </div>
    </div>
    <div class="ci-right">
      <div class="ci-total">${fmtPrice(item.price * item.qty)}</div>
      <button class="ci-remove" data-remove="${item.key}">Xoá</button>
    </div>
  </div>`;
}

function render() {
  const list = Cart.get();
  if (!list.length) {
    $cart.innerHTML = `<div class="empty" style="background:#fff;border-radius:16px;box-shadow:var(--shadow)"><div class="big">🛍️</div><h3>Giỏ hàng đang trống</h3><p>Thêm vài thỏi son xinh xắn nhé!</p><a class="btn btn-rose" href="#products">Xem sản phẩm</a></div>`;
    document.querySelector('[data-checkout]').disabled = true;
    return;
  }
  $cart.innerHTML = list.map(cartItemHtml).join('');

  const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= config.freeShipThreshold ? 0 : config.shippingFee;
  const total = subtotal + shipping;

  const fs = document.querySelector('[data-freeship]');
  if (shipping === 0) {
    fs.className = 'free-ship';
    fs.innerHTML = '🎉 Bạn được <b>MIỄN PHÍ VẬN CHUYỂN</b>!';
  } else {
    const remain = config.freeShipThreshold - subtotal;
    fs.className = 'free-ship progress';
    fs.innerHTML = `Mua thêm <b>${fmtPrice(remain)}</b> để được miễn phí ship 🚚`;
  }

  document.querySelector('[data-subtotal]').textContent = fmtPrice(subtotal);
  document.querySelector('[data-ship]').textContent = shipping === 0 ? 'MIỄN PHÍ' : fmtPrice(shipping);
  document.querySelector('[data-total]').textContent = fmtPrice(total);

  $cart.querySelectorAll('[data-minus]').forEach(b => b.addEventListener('click', () => {
    const item = Cart.get().find(i => i.key === b.dataset.minus);
    if (item) { Cart.updateQty(item.key, item.qty - 1); render(); }
  }));
  $cart.querySelectorAll('[data-plus]').forEach(b => b.addEventListener('click', () => {
    const item = Cart.get().find(i => i.key === b.dataset.plus);
    if (item) { Cart.updateQty(item.key, item.qty + 1); render(); }
  }));
  $cart.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    Cart.remove(b.dataset.remove);
    render();
  }));
}

document.querySelector('[data-checkout]').addEventListener('click', () => {
  if (!Cart.get().length) { Toast.show('Giỏ hàng trống!', 'error'); return; }
  window.location.href = 'checkout.html';
});

(async () => {
  try {
    const { data } = await API.get('/api/shipping-config');
    config = data;
  } catch (err) { /* keep default */ }
  render();
})();
