function productCard(p) {
  const off = percentOff(p.oldPrice, p.price);
  const dots = p.colors.slice(0, 4).map(c => `<span class="dot" style="background:${c.colorHex}" title="${escapeHtml(c.colorName)}"></span>`).join('');
  const more = p.colors.length > 4 ? `<span class="dot more">+${p.colors.length - 4}</span>` : '';
  return `
  <a class="card" href="product.html?slug=${encodeURIComponent(p.slug)}">
    <div class="card-img">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      ${off > 0 ? `<span class="badge discount">-${off}%</span>` : ''}
      ${p.featured ? `<span class="badge" style="left:auto; right:12px; background:#9c27b0">Nổi bật</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-line">${escapeHtml(p.line)}</div>
      <div class="card-name">${escapeHtml(p.name)}</div>
      <div class="card-dots">${dots}${more}</div>
      <div class="card-foot">
        <div class="price">${fmtPrice(p.price)}<span class="old">${p.oldPrice ? fmtPrice(p.oldPrice) : ''}</span></div>
        <button class="add-btn" title="Thêm vào giỏ" data-add="${p.id}">+</button>
      </div>
    </div>
  </a>`;
}

function emptyState(title, text) {
  return `<div class="empty"><div class="big">🛍️</div><h3>${title}</h3><p>${text}</p><a class="btn btn-rose" href="#products">Xem sản phẩm</a></div>`;
}

function orderStatusBadge(status) {
  const labels = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao hàng',
    delivered: 'Đã giao', cancelled: 'Đã huỷ', paid: 'Đã thanh toán', refunded: 'Hoàn tiền'
  };
  const cls = { pending: 'st-pending', confirmed: 'st-confirmed', shipping: 'st-shipping', delivered: 'st-delivered', cancelled: 'st-cancelled', paid: 'st-paid', refunded: 'st-pending' };
  return `<span class="order-status ${cls[status] || 'st-pending'}">${labels[status] || status}</span>`;
}
