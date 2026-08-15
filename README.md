# 💄 ROMAND Beauty Store

Website bán son Romand chính hãng (tham khảo mục son Romand tại thegioiskinfood.com), xây dựng bằng **Node.js + Express + SQLite**.

## ✨ Tính năng

**Khách hàng**
- Trang chủ hiển thị sản phẩm nổi bật + toàn bộ sản phẩm
- **Tìm kiếm** theo tên/dòng son, **lọc theo dòng son** (Juicy Lasting Tint, Zero Velvet Tint, Glasting Water Tint...), **sắp xếp** theo giá / bán chạy
- **Trang chi tiết sản phẩm**: mô tả, giá, **chọn màu son** (bảng màu chuẩn từng sản phẩm), chọn số lượng
- **Giỏ hàng**: thêm / sửa số lượng / xoá, tự tính phí ship (freeship từ 500.000đ)
- **Đặt hàng**: điền thông tin giao hàng + chọn phương thức thanh toán (COD / Chuyển khoản / MoMo)
- **Tra cứu đơn hàng**: theo mã đơn hoặc số điện thoại, xem trạng thái + timeline

**Quản trị** (`/admin/`)
- Thống kê doanh thu, số đơn, số sản phẩm
- Quản lý đơn hàng: xem, cập nhật trạng thái (chờ xác nhận → xác nhận → đang giao → đã giao / huỷ), trạng thái thanh toán, xoá
- Quản lý sản phẩm: thêm / sửa / xoá, quản lý màu son, giá, tồn kho
- Cài đặt: phí ship, ngưỡng freeship, thông tin shop, đổi mật khẩu admin

## 🚀 Cách chạy

**Cách 1 — Nhanh nhất:** double-click `start.bat` (tự mở trình duyệt).

**Cách 2 — Thủ công:**
```
cd D:\romand-shop
npm install
node server.js
```
Mở trình duyệt: http://localhost:3000

> Yêu cầu: Node.js >= 22.5 (đã cài sẵn trong lúc dựng). SQLite dùng module tích hợp sẵn của Node, **không cần cài database riêng**.

## 🔐 Tài khoản quản trị

| | |
|---|---|
| URL | http://localhost:3000/admin/ |
| Mật khẩu mặc định | `admin123` |

⚠️ Đổi mật khẩu ngay tại **Cài đặt** trước khi đưa lên mạng!

## 🗂 Cấu trúc thư mục

```
D:\romand-shop\
├── server.js              # Backend Express + API
├── lib\
│   ├── db.js              # Kết nối SQLite + truy vấn
│   ├── seed.js            # Script nạp dữ liệu mẫu (npm run seed)
│   └── seed-data.js       # Dữ liệu 15 sản phẩm / 100 màu son
├── scripts\gen-images.js  # Sinh ảnh sản phẩm SVG (npm run images)
├── data\romand.db         # Database SQLite (tự tạo khi chạy lần đầu)
└── public\                # Giao diện
    ├── index.html         # Trang chủ
    ├── product.html       # Chi tiết sản phẩm + chọn màu
    ├── cart.html          # Giỏ hàng
    ├── checkout.html      # Đặt hàng
    ├── track.html         # Tra cứu đơn hàng
    └── admin\             # Trang quản trị
```

## 🔄 Các lệnh hữu ích

```bash
npm start        # Chạy server
npm run seed     # Khôi phục lại dữ liệu sản phẩm mẫu (xoá đơn + sản phẩm đã sửa)
npm run images   # Sinh lại ảnh sản phẩm SVG (dự phòng)
npm run fetch-images  # Tải lại ảnh thật từ thegioiskinfood.com (cập nhật DB)
npm run build-static  # Tạo bản tĩnh cho GitHub Pages (thư mục static\)
npm run serve-static  # Chạy thử bản tĩnh tại http://localhost:8088
npm run test-static   # Tự kiểm tra 27 thao tác của bản tĩnh
```

## 🌐 Đưa lên domain .io.vn

Website sẵn sàng đưa lên bất kỳ host/domain nào có đuôi `.io.vn` (ví dụ `romandstore.io.vn`):

1. **Đơn giản nhất — dùng VPS:** cài Node.js, copy thư mục `D:\romand-shop`, chạy `node server.js` (nên dùng PM2: `pm2 start server.js`), trỏ tên miền `.io.vn` về IP VPS và để reverse proxy (nginx) chuyển cổng 80 → 3000.
2. **Host tĩnh (Vercel/Netlify/Render):** Render có thể chạy Node app trực tiếp. Các nền tảng serverless cần bỏ SQLite file — đổi `lib/db.js` sang dịch vụ DB khác (MySQL/PostgreSQL).
3. Nhớ **đổi mật khẩu admin** và cập nhật **thông tin shop** ở trang Cài đặt.

## 🌐 GitHub Pages — miễn phí vĩnh viễn (bản tĩnh)

GitHub Pages **không chạy được backend Node.js**. Thư mục `static\` là phiên bản tĩnh chạy hoàn toàn trên trình duyệt:
- Dữ liệu 15 sản phẩm / 100 màu được nhúng vào `js\store-data.js`.
- Đơn hàng, cài đặt, chỉnh sửa admin lưu vào `localStorage` của từng trình duyệt (mỗi người xem có dữ liệu riêng, admin chỉ thấy đơn đặt trên chính máy đó).
- Toàn bộ đường dẫn đã là tương đối → chạy được ở mọi sub-path (`https://username.github.io/repo/`).

**Bước làm:**
```bash
cd D:\romand-shop
node scripts/build-static.js   # tạo lại thư mục static\ (sau khi sửa dữ liệu/ảnh)
```
1. Lên github.com → **New repository** → đặt tên (vd `romand-store`) → chọn **Public** → Create.
2. Trong repo vừa tạo, bấm **uploading an existing file**, kéo thả **toàn bộ nội dung thư mục `D:\romand-shop\static`** vào (đừng kéo cả thư mục `static` — chỉ lấy các file bên trong: `index.html`, `admin/`, `css/`, `js/`, `images/`...). Commit.
3. Repo → **Settings** → **Pages** → **Source**: chọn `Deploy from a branch`, branch `main`, thư mục `/ (root)` → **Save**.
4. Chờ ~1 phút, web sống tại `https://<TEN-BAN>.github.io/<ten-repo>/`.

> Mẹo: nếu tên repo là `<TEN-BAN>.github.io` thì web nằm ngay tại `https://<TEN-BAN>.github.io/`.

**Chạy thử bản tĩnh trên máy:**
```bash
node scripts/serve-static.js   # mở http://localhost:8088
```

## ⚠️ Lưu ý
- Phiên bản server (chạy Node): giỏ hàng lưu ở trình duyệt (localStorage), đơn hàng lưu ở server (SQLite).
- Phiên bản tĩnh (GitHub Pages): mọi thứ lưu ở localStorage của trình duyệt — chỉ nên dùng để **demo / giới thiệu**; nếu muốn kinh doanh thật, dùng bản server với cơ sở dữ liệu dùng chung.
- Ảnh sản phẩm là **ảnh thật** tải từ thegioiskinfood.com (script `scripts/fetch-images.js`), lưu trong `public\images\products\` và được sao chép sang bản tĩnh khi build.
