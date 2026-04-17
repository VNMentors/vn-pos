# VN Sales — Phần mềm quản lý bán hàng

Phần mềm POS quản lý bán hàng miễn phí, mã nguồn mở. Mỗi người tự cài Supabase riêng, không phụ thuộc server trung tâm.

**Tính năng:** Bán lẻ/sỉ · Hàng hoá & biến thể · Khách hàng · Nhân viên & phân quyền · Báo cáo · In hoá đơn

---

## Cài đặt

### 1. Tải code về máy

```bash
git clone <url-repo>
cd vn-sales
npm install
```

---

### 2. Tạo dự án Supabase

1. Vào [supabase.com](https://supabase.com) → đăng ký miễn phí → **New project**
2. Chọn region **Southeast Asia (Singapore)**
3. Chờ ~1 phút để project khởi tạo

---

### 3. Tạo database

1. Trong Supabase dashboard → **SQL Editor** → **New query**
2. Copy toàn bộ nội dung file `supabase-setup-simple.sql` trong dự án
3. Dán vào SQL Editor → **Run**

Thành công khi thấy `Success. No rows returned`.

---

### 4. Lấy API Key

Vào **Project Settings → API**, lấy 2 giá trị:

| | Lấy ở đâu |
|---|---|
| `VITE_SUPABASE_URL` | **Project URL** — dạng `https://xxxxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **anon / public** key — chuỗi bắt đầu bằng `eyJ...` |

---

### 5. Tạo file `.env`

Tạo file `.env` ở thư mục gốc (cùng cấp `package.json`):

```env
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUz...
```

---

### 6. Deploy Edge Functions

Dự án có 2 Edge Functions — đây là những đoạn code chạy trên server Supabase, cần thiết để tạo tài khoản người dùng (Supabase không cho tạo auth user trực tiếp từ frontend).

| Function | Dùng để |
|---|---|
| `init-admin` | Tạo tài khoản admin lần đầu qua trang `/setup` |
| `create-user` | Admin tạo thêm nhân viên mới trong app |

**Cách A — Qua Dashboard** (không cần cài gì thêm, làm lần lượt cho cả 2):

1. Supabase dashboard → **Edge Functions** → **New function**
2. Đặt tên đúng: `init-admin` (hoặc `create-user`)
3. Xoá code mặc định, dán nội dung file tương ứng trong `supabase/functions/<tên>/index.ts`
4. **Deploy**
5. Lặp lại cho function còn lại

**Cách B — Qua CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-id>   # project-id lấy từ URL supabase
supabase functions deploy init-admin
supabase functions deploy create-user
```

---

### 7. Tạo tài khoản admin

Chạy app (`npm run dev`) rồi truy cập:

```
http://localhost:5173/setup
```

Điền họ tên, email, mật khẩu → **Tạo tài khoản admin** → xong, trang này tự khoá lại.

---

### 8. Đăng nhập

```bash
npm run dev
```

Truy cập [http://localhost:5173](http://localhost:5173) và đăng nhập.

---

## Deploy lên internet

### Cloudflare Pages

1. Push code lên GitHub
2. Vào [pages.cloudflare.com](https://pages.cloudflare.com) → **Create a project → Connect to Git** → chọn repo
3. Cấu hình build:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Mở **Environment variables**, thêm 2 biến:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. **Save and Deploy**

> Lần sau push code lên GitHub là Cloudflare tự động deploy lại.

### Vercel

1. Push code lên GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → chọn repo
3. **Settings → Environment Variables** → thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Redeploy

---

## Câu hỏi thường gặp

**Trang `/setup` báo lỗi khi tạo admin?**
→ Edge Function `init-admin` chưa được deploy. Làm lại Bước 6.

**Tạo nhân viên không được?**
→ Edge Function `create-user` chưa deploy. Kiểm tra Supabase dashboard → Edge Functions.

**Báo cáo không có dữ liệu?**
→ Cần có hoá đơn đã thanh toán trong khoảng ngày đã chọn. Vào **Cài đặt → Dữ liệu → Tạo dữ liệu mẫu** để test thử.

**Muốn đổi tên cửa hàng, logo, SĐT?**
→ Trong app → **Cài đặt → Cửa hàng**.
