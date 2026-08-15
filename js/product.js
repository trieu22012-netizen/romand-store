initLayout();

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

const $loading = document.querySelector('[data-loading]');
const $detail = document.querySelector('[data-detail]');
const $swatches = document.querySelector('[data-swatches]');
const $selName = document.querySelector('[data-selname]');
const $pdot = document.querySelector('[data-pdot]');
const $ptext = document.querySelector('[data-ptext]');
const $pprice = document.querySelector('[data-pprice]');
const $qty = document.querySelector('[data-qty]');

let product = null;
let selectedColor = null;
let qty = 1;

function renderSwatches() {
  $swatches.innerHTML = product.colors.map((c, i) => `
    <label class="swatch ${i === 0 ? 'selected' : ''}">
      <input type="radio" name="color" value="${c.id}" ${i === 0 ? 'checked' : ''} />
      <span class="circle" style="background:${c.colorHex}"></span>
      <span class="cname">${escapeHtml(c.colorName)}</span>
    </label>
  `).join('');

  $swatches.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      $swatches.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      const input = sw.querySelector('input');
      selectedColor = product.colors.find(c => c.id === Number(input.value));
      updateSelected();
    });
  });

  selectedColor = product.colors[0];
  updateSelected();
}

function updateSelected() {
  if (!selectedColor) return;
  $selName.textContent = selectedColor.colorName;
  $pdot.style.background = selectedColor.colorHex;
  $ptext.textContent = selectedColor.colorName;
  $pprice.textContent = ' — ' + fmtPrice(selectedColor.price);
  document.title = product.name + ' (' + selectedColor.colorName + ') - ROMAND Beauty Store';
}

function setQty(v) {
  qty = Math.max(1, Math.min(99, v));
  $qty.value = qty;
}

async function loadProduct() {
  try {
    const { data: p } = await API.get('/api/products/' + encodeURIComponent(slug));
    product = p;
    document.querySelector('[data-dimg]').src = p.image;
    document.querySelector('[data-dimg]').alt = p.name;
    document.querySelector('[data-dname]').textContent = p.name;
    document.querySelector('[data-dline]').textContent = p.line;
    document.querySelector('[data-dweight]').textContent = p.weight;
    document.querySelector('[data-dsold]').textContent = p.sold + ' cái';
    document.querySelector('[data-ddesc]').textContent = p.description;
    const off = percentOff(p.oldPrice, p.price);
    document.querySelector('[data-dprice]').textContent = fmtPrice(p.price);
    document.querySelector('[data-dold]').textContent = p.oldPrice ? fmtPrice(p.oldPrice) : '';
    document.querySelector('[data-dsave]').textContent = off > 0 ? `Tiết kiệm ${off}%` : 'Giá tốt';
    $loading.style.display = 'none';
    $detail.style.display = 'grid';
    renderSwatches();
  } catch (err) {
    $loading.innerHTML = `<div class="empty"><div class="big">😢</div><h3>Không tìm thấy sản phẩm</h3><p>${escapeHtml(err.message)}</p><a class="btn btn-rose" href="./">Về trang chủ</a></div>`;
  }
}

function addToCart(goCheckout = false) {
  if (!product || !selectedColor) return;
  Cart.add({
    productId: product.id, name: product.name, line: product.line,
    image: product.image, colorId: selectedColor.id,
    colorName: selectedColor.colorName, colorHex: selectedColor.colorHex,
    price: selectedColor.price, qty
  });
  Toast.show('Đã thêm ' + product.name + ' (' + selectedColor.colorName + ') x' + qty + ' vào giỏ hàng', 'success');
  if (goCheckout) setTimeout(() => window.location.href = 'checkout.html', 600);
}

document.querySelector('[data-minus]').addEventListener('click', () => setQty(qty - 1));
document.querySelector('[data-plus]').addEventListener('click', () => setQty(qty + 1));
$qty.addEventListener('change', () => setQty(parseInt($qty.value, 10) || 1));
document.querySelector('[data-add]').addEventListener('click', () => addToCart(false));
document.querySelector('[data-buy]').addEventListener('click', () => addToCart(true));

loadProduct();
