initLayout();

const state = {
  line: '',
  sort: 'default',
  q: new URLSearchParams(window.location.search).get('q') || ''
};

const $featured = document.querySelector('[data-featured]');
const $products = document.querySelector('[data-products]');
const $lines = document.querySelector('[data-lines]');
const $sort = document.querySelector('[data-sort]');
const $count = document.querySelector('[data-count]');

function render(grid, list, emptyTitle, emptyText) {
  if (!list.length) {
    grid.innerHTML = emptyState(emptyTitle, emptyText);
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
  grid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.add;
      try {
        const { data: p } = await API.get('/api/products/' + id);
        const c = p.colors[0];
        Cart.add({ productId: p.id, name: p.name, line: p.line, image: p.image, colorId: c.id, colorName: c.colorName, colorHex: c.colorHex, price: c.price, qty: 1 });
        Toast.show('Đã thêm vào giỏ hàng: ' + p.name + ' (' + c.colorName + ')', 'success');
      } catch (err) { Toast.show(err.message, 'error'); }
    });
  });
}

async function loadLines() {
  const { data: lines } = await API.get('/api/product-lines');
  $lines.innerHTML = lines.map(l =>
    `<button class="filter-chip" data-line="${escapeHtml(l)}">${escapeHtml(l)}</button>`
  ).join('');
  const allChips = [...document.querySelectorAll('.filters .filter-chip')];
  allChips.forEach(chip => {
    chip.addEventListener('click', () => {
      allChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.line = chip.dataset.line || '';
      loadProducts();
    });
  });
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (state.line) params.set('line', state.line);
  if (state.sort) params.set('sort', state.sort);
  if (state.q) params.set('search', state.q);
  const { data } = await API.get('/api/products?' + params.toString());
  render($products, data, 'Không tìm thấy sản phẩm', state.q ? `Không có kết quả cho "${state.q}". Thử từ khoá khác nhé!` : 'Chưa có sản phẩm phù hợp.');
  $count.textContent = `Hiển thị ${data.length} sản phẩm`;
}

async function loadFeatured() {
  try {
    const { data } = await API.get('/api/products/featured');
    render($featured, data.slice(0, 4), 'Chưa có sản phẩm nổi bật', '');
  } catch (err) { /* ignore */ }
}

async function loadHero() {
  try {
    const { data } = await API.get('/api/products/featured');
    const imgs = data.slice(0, 3);
    const hero = document.querySelector('[data-hero]');
    hero.innerHTML = imgs.map(p => `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" />`).join('');
  } catch (err) { /* ignore */ }
}

$sort.addEventListener('change', () => { state.sort = $sort.value; loadProducts(); });

loadLines();
loadProducts();
loadFeatured();
loadHero();
