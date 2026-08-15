function layoutHeader() {
  return `
  <div class="topbar"><div class="container">Miễn phí vận chuyển đơn từ <b>500.000₫</b> &nbsp;|&nbsp; Cam kết <b>hàng chính hãng Hàn Quốc</b></div></div>
  <header class="header">
    <div class="header-inner">
      <button class="hamburger" data-menu>☰</button>
      <a class="brand" href="./">
        <span class="logo">R</span>
        <span class="bname">ROMAND <em>Beauty</em></span>
      </a>
      <form class="search" data-search-form>
        <input name="q" placeholder="Tìm kiếm son Romand... (vd: Juicy, Velvet, Glossing)" />
        <button type="submit">Tìm</button>
      </form>
      <nav class="nav" data-nav>
        <a href="./">Trang chủ</a>
        <a href="#products">Sản phẩm</a>
        <a href="cart.html">Giỏ hàng <span class="cart-badge" data-cart-count style="display:none">0</span></a>
        <a href="track.html">Tra cứu đơn</a>
        <a href="admin/">Admin</a>
      </nav>
    </div>
  </header>`;
}

function layoutFooter() {
  return `
  <footer class="footer">
    <div class="footer-inner">
      <div>
        <a class="brand" href="./">
          <span class="logo">R</span>
          <span class="bname">ROMAND <em style="color:#ff9fb0">Beauty</em></span>
        </a>
        <p class="about">Cửa hàng chuyên phân phối son Romand chính hãng Hàn Quốc. Nguồn hàng nhập khẩu 100% chính hãng, đầy đủ hóa đơn, tem mác. Đổi trả trong 7 ngày nếu lỗi.</p>
      </div>
      <div>
        <h4>Liên hệ</h4>
        <a href="tel:0795683918">Hotline: 0795683918</a>
        <a href="mailto:daolyy291106@gmail.com">daolyy291106@gmail.com</a>
        <a href="#">Bình Dương</a>
      </div>
      <div>
        <h4>Hỗ trợ khách hàng</h4>
        <a href="track.html">Tra cứu đơn hàng</a>
        <a href="cart.html">Giỏ hàng</a>
        <a href="./">Hướng dẫn mua hàng</a>
        <a href="./">Chính sách đổi trả</a>
      </div>
      <div>
        <h4>Về shop</h4>
        <a href="./">Giới thiệu</a>
        <a href="#products">Sản phẩm</a>
        <a href="admin/">Quản trị</a>
      </div>
    </div>
    <div class="footer-bottom">© 2026 Romand Beauty Store · Made with 💗 · romandstore.io.vn</div>
  </footer>`;
}

function initLayout(activeNav) {
  const header = document.createElement('div');
  header.innerHTML = layoutHeader();
  document.body.prepend(header);

  const footer = document.createElement('div');
  footer.innerHTML = layoutFooter();
  document.body.appendChild(footer);

  const nav = document.querySelector('[data-nav]');
  const hamburger = document.querySelector('[data-menu]');
  if (nav && hamburger) {
    hamburger.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  const searchForm = document.querySelector('[data-search-form]');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchForm.q.value.trim();
      window.location.href = './?q=' + encodeURIComponent(q) + '#products';
    });
  }

  Cart.updateBadge();
}
