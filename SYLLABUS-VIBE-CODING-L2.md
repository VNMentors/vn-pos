# Vibe Coding — Khoá Học Level 2
### Từ Lovable → Làm Chủ Máy Tính Cá Nhân

**Đối tượng:** Non-tech, đã hoàn thành Level 1 (Lovable)  
**Thời lượng:** 8 buổi × 2.5 giờ  
**Công cụ:** Claude Code + VS Code + Supabase  
**Nguyên tắc:** Chấm theo artifact. Phải đạt DoD mới được sang buổi tiếp theo.

---

## Hệ Thống Level

| Level | Tên | Học viên làm được gì |
|---|---|---|
| **L0** | Khởi động | Mở được dự án trên máy, thấy app chạy |
| **L1** | Làm chủ giao diện | Thay đổi được app bằng cách nói chuyện với AI |
| **L2** | Làm chủ dữ liệu | Tạo/sửa/xoá dữ liệu thật, build được tính năng mới |
| **L3** | Đưa lên internet | App có link thật, ai cũng vào được |
| **L4** | Tự làm từ đầu | Tự build app mới không cần dự án mẫu |

> **Mục tiêu khoá học:** L0 → L4 trong 8 buổi

---

## Buổi 1 — Khởi Động Máy Tính
### Mục tiêu: Đạt L0

**Một câu:** Cuối buổi, học viên mở được app trên máy tính của mình và nói chuyện được với Claude Code lần đầu tiên.

---

### Cần cài gì? (Làm trước ở nhà)

> Gửi học viên checklist này trước buổi 1 tối thiểu 1 ngày.

| # | Việc cần làm | Link | Kiểm tra |
|---|---|---|---|
| 1 | Tải VS Code | https://code.visualstudio.com | Mở lên thấy giao diện xanh |
| 2 | Tải Node.js (bản LTS) | https://nodejs.org | Mở Terminal, gõ `node -v`, thấy số |
| 3 | Tạo tài khoản Claude | https://claude.ai | Đăng nhập được |
| 4 | Tạo tài khoản Supabase | https://supabase.com | Đăng nhập được |
| 5 | Tạo tài khoản GitHub | https://github.com | Đăng nhập được |

---

### Nội dung buổi học

**Phần 1 — Cài Claude Code (30 phút)**

Mở Terminal (Mac) hoặc Command Prompt (Windows), gõ:
```
npm install -g @anthropic-ai/claude-code
```
Sau đó gõ `claude` và đăng nhập tài khoản Claude.

> **Giải thích cho học viên:** Terminal là "cửa sổ lệnh" — thay vì click chuột, mình gõ chữ để ra lệnh cho máy tính. Chỉ cần biết 3 lệnh: `cd` (đi vào thư mục), `npm install` (cài phần mềm), `npm run dev` (chạy app).

**Phần 2 — Lấy dự án mẫu (20 phút)**

```
git clone [link dự án]
cd vn-pos
npm install
```

**Phần 3 — Kết nối Supabase (30 phút)**

1. Vào Supabase → tạo project mới → đặt tên tuỳ ý
2. Vào Settings → API → copy **Project URL** và **anon public key**
3. Tạo file `.env` trong thư mục dự án, điền vào:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxxx...
```

**Phần 4 — Chạy app lần đầu (10 phút)**
```
npm run dev
```
Mở trình duyệt → `http://localhost:5173` → thấy màn hình đăng nhập.

**Phần 5 — Nói chuyện với Claude Code lần đầu (30 phút)**

Mở VS Code → mở Terminal → gõ `claude`

Câu hỏi đầu tiên cho Claude:
> *"Đây là dự án gì? Giải thích cho tôi hiểu bằng ngôn ngữ đơn giản nhất"*

---

### ✅ Definition of Done — Buổi 1 (phải đạt trước khi sang buổi 2)

- [ ] Gõ `npm run dev` → app hiện ra trong trình duyệt
- [ ] Gõ `claude` trong Terminal → nói chuyện được với Claude
- [ ] Claude trả lời được câu hỏi về dự án

---

## Buổi 2 — Làm Chủ Giao Diện
### Mục tiêu: Đạt L1

**Một câu:** Học viên tự thay đổi được giao diện app bằng cách ra lệnh cho Claude, không cần chạm vào code.

---

### Nội dung buổi học

**Phần 1 — Hiểu dự án (không cần hiểu code) (30 phút)**

> **Dùng phép so sánh:** Dự án này như một ngôi nhà. `src/pages/` là các phòng (Tổng quan, Bán hàng, Hàng hoá...). `src/components/` là nội thất dùng chung (sidebar, nút bấm...). File `CLAUDE.md` là bản thiết kế — Claude đọc file này để hiểu ngôi nhà trước khi sửa.

Hỏi Claude:
> *"Đọc file CLAUDE.md và cho tôi biết dự án có những trang nào, mỗi trang làm gì?"*

**Phần 2 — 3 loại yêu cầu cơ bản (30 phút)**

| Loại | Ví dụ prompt |
|---|---|
| Sửa giao diện | *"Đổi màu nền trang đăng nhập thành trắng"* |
| Thêm nội dung | *"Thêm dòng chữ 'Hotline: 0909...' ở cuối sidebar"* |
| Hỏi thông tin | *"File nào chứa trang Bán hàng?"* |

**Phần 3 — Bí quyết viết prompt hiệu quả (30 phút)**

❌ Prompt mơ hồ: *"Làm đẹp hơn"*  
✅ Prompt rõ: *"Trang Đăng nhập — đổi nút 'Đăng nhập' thành màu xanh lá, chữ trắng, bo tròn góc nhiều hơn"*

**Công thức:** `[Trang nào]` + `[Phần nào]` + `[Muốn thay đổi thành gì]`

**Phần 4 — Thực hành tự do (40 phút)**

Mỗi học viên tự thay đổi 5 thứ trong giao diện theo ý muốn.

---

### ✅ Definition of Done — Buổi 2

- [ ] Tự đổi được tên cửa hàng hiển thị trong app
- [ ] Tự thêm được 1 dòng chữ mới vào bất kỳ trang nào
- [ ] Tự đổi được màu 1 nút bấm
- [ ] Giải thích được: file nào trong dự án là trang nào

---

## Buổi 3 — Làm Chủ Dữ Liệu
### Mục tiêu: Đạt L2 (phần 1)

**Một câu:** Học viên hiểu dữ liệu lưu ở đâu và điều khiển được "kho dữ liệu" bằng cách nói chuyện với Claude — không cần vào Supabase dashboard.

---

### Nội dung buổi học

**Phần 1 — Kho dữ liệu là gì? (20 phút)**

> **Dùng phép so sánh:** Kho dữ liệu (database) giống file Excel trên mây. Mỗi bảng (table) là 1 sheet. App đọc/ghi vào đó mỗi khi bạn thêm sản phẩm, tạo hoá đơn, hay lưu thông tin khách hàng.

Các "sheet" trong dự án này:
- `products` → danh sách hàng hoá
- `customers` → danh sách khách
- `invoices` → danh sách hoá đơn
- `profiles` → tài khoản nhân viên

**Phần 2 — Kết nối Claude Code với Supabase (30 phút)**

Hỏi Claude:
> *"Kết nối Supabase MCP cho project này. Project ID là lcmruhjizzdipmtceisq"*

Sau khi kết nối, Claude có thể làm thẳng với database mà không cần mày lên dashboard.

**Phần 3 — Ra lệnh cho kho dữ liệu (40 phút)**

Thử các lệnh này với Claude:
```
"Xem tất cả sản phẩm trong kho dữ liệu"
"Thêm 3 sản phẩm mẫu vào bảng products"
"Thêm danh mục mới tên 'Đồ uống'"
```
Sau mỗi lệnh → vào app xem dữ liệu có xuất hiện không.

**Phần 4 — Thêm cột mới vào bảng (30 phút)**

> **Tình huống thực tế:** Cửa hàng muốn lưu thêm tên nhà cung cấp cho mỗi sản phẩm.

```
"Thêm cột 'nha_cung_cap' vào bảng products để lưu tên nhà cung cấp"
```
Kiểm tra: vào app → sửa 1 sản phẩm → có ô nhập nhà cung cấp chưa?

---

### ✅ Definition of Done — Buổi 3

- [ ] Thêm được dữ liệu vào database qua Claude (không vào Supabase dashboard)
- [ ] Dữ liệu hiện ra trong app sau khi thêm
- [ ] Thêm được 1 cột mới vào bảng sản phẩm

---

## Buổi 4 — Build Tính Năng Mới
### Mục tiêu: Đạt L2 (phần 2)

**Một câu:** Học viên tự build được 1 tính năng hoàn chỉnh từ đầu — có dữ liệu, có giao diện, dùng được thật.

---

### Nội dung buổi học

**Phần 1 — Quy trình build 1 tính năng (30 phút)**

> Luôn theo thứ tự: **Dữ liệu trước → Giao diện sau → Test cuối**

Ví dụ tính năng: **Ghi chú nội bộ cho sản phẩm**

| Bước | Prompt cho Claude |
|---|---|
| 1. Thêm chỗ lưu | *"Thêm cột 'ghi_chu' vào bảng products"* |
| 2. Thêm giao diện | *"Thêm ô nhập ghi chú khi thêm/sửa sản phẩm. Hiển thị ghi chú trong danh sách"* |
| 3. Kiểm tra | *"Test thử — nhập ghi chú cho 1 sản phẩm, xem có lưu được không"* |

**Phần 2 — Khi AI làm sai, phải làm gì? (20 phút)**

Đừng xoá hết bắt đầu lại. Hỏi Claude:
> *"Tính năng [tên] đang bị [mô tả lỗi]. Tôi mong đợi [kết quả đúng]. Fix giúp tôi."*

**Phần 3 — Tự chọn tính năng và build (60 phút)**

Mỗi học viên chọn 1 trong các tính năng sau để build:

- Thêm trường "ngày hết hạn" cho sản phẩm
- Thêm trường "nguồn gốc" (trong nước / nhập khẩu) cho sản phẩm  
- Thêm ghi chú khi tạo hoá đơn
- Thêm trường "sinh nhật" cho khách hàng

---

### ✅ Definition of Done — Buổi 4

- [ ] Build được 1 tính năng có dữ liệu + giao diện
- [ ] Tính năng lưu được dữ liệu thật vào database
- [ ] Giải thích được quy trình: làm dữ liệu trước, giao diện sau

---

## Buổi 5 — Đăng Nhập & Phân Quyền
### Mục tiêu: Đạt L2 (phần 3)

**Một câu:** Học viên hiểu hệ thống tài khoản và tự tạo được tài khoản nhân viên mới.

---

### Nội dung buổi học

**Phần 1 — Luồng đăng nhập hoạt động thế nào (20 phút)**

> **Phép so sánh:** Đăng nhập như chìa khoá vào cửa hàng. Supabase là "người bảo vệ" — giữ danh sách ai có chìa khoá, ai không có. App của mình hỏi người bảo vệ trước khi cho vào.

**Phần 2 — 2 loại tài khoản trong hệ thống (20 phút)**

| | Admin | Nhân viên |
|---|---|---|
| Tạo tài khoản nhân viên | ✅ | ❌ |
| Xem tất cả báo cáo | ✅ | Tuỳ quyền |
| Xoá dữ liệu | ✅ | ❌ |

**Phần 3 — Tại sao tạo tài khoản phức tạp hơn tưởng? (20 phút)**

> **Giải thích đơn giản:** App trên trình duyệt của mình chỉ có "chìa khoá thường" — dùng được nhưng không có quyền tạo tài khoản mới. Để tạo tài khoản, phải dùng "chìa khoá master" — chỉ chạy được trên server của Supabase. Cái đó gọi là Edge Function — hiểu đơn giản là "nhân viên bảo vệ phòng server".

**Phần 4 — Tạo tài khoản nhân viên mới (40 phút)**

Hỏi Claude:
> *"Tạo tài khoản nhân viên mới: email nhanvien@demo.vn, mật khẩu 123456, tên Nguyễn Văn A"*

Claude sẽ gọi Edge Function `create-user` tự động.

Kiểm tra: đăng xuất → đăng nhập bằng tài khoản nhân viên vừa tạo → thấy khác gì so với admin?

**Phần 5 — Cấp và thu quyền (20 phút)**

> *"Cấp quyền cho nhân viên Nguyễn Văn A được xem trang Báo cáo"*  
> *"Thu quyền xem trang Nhân viên của Nguyễn Văn A"*

---

### ✅ Definition of Done — Buổi 5

- [ ] Tạo được tài khoản nhân viên mới qua Claude
- [ ] Đăng nhập được bằng tài khoản nhân viên đó
- [ ] Cấp/thu quyền xem ít nhất 1 trang cho nhân viên

---

## Buổi 6 — Khi App Bị Lỗi
### Mục tiêu: Giữ vững L2, không bị mắc kẹt khi gặp lỗi

**Một câu:** Học viên biết cách đọc thông báo lỗi và prompt đúng cách để Claude fix — không bị bí khi app hỏng.

---

### Nội dung buổi học

**Phần 1 — 3 loại lỗi hay gặp (30 phút)**

| Loại lỗi | Dấu hiệu | Tìm thông tin ở đâu |
|---|---|---|
| Lỗi hiển thị | Màn hình trắng, trang trống | F12 → tab Console → chữ đỏ |
| Lỗi dữ liệu | Lưu không được, load không ra | F12 → tab Network → dòng màu đỏ → click → xem Response |
| Lỗi logic | Tính sai số tiền, hiển thị sai | Mô tả kết quả mong đợi vs thực tế |

**Phần 2 — Công thức prompt debug (20 phút)**

```
"Trang [tên trang] đang bị lỗi.

Lỗi tôi thấy: [copy chữ đỏ từ Console]

Tôi vừa làm: [mô tả bước vừa làm trước khi lỗi]

Đáng lẽ phải: [kết quả đúng phải như thế nào]"
```

**Phần 3 — Thực hành debug (60 phút)**

Giảng viên cố tình tạo 3 lỗi khác nhau trong dự án. Học viên tự:
1. Nhận ra có lỗi
2. Tìm thông tin lỗi
3. Prompt Claude để fix

---

### ✅ Definition of Done — Buổi 6

- [ ] Fix được ít nhất 2 trong 3 lỗi giảng viên tạo ra
- [ ] Biết mở DevTools (F12) và tìm thông báo lỗi
- [ ] Viết được prompt debug đúng công thức

---

## Buổi 7 — Đưa App Lên Internet
### Mục tiêu: Đạt L3

**Một câu:** App có link thật trên internet, ai cũng vào được, không cần máy học viên phải đang bật.

---

### Nội dung buổi học

**Phần 1 — Tại sao cần deploy? (15 phút)**

> Hiện tại app chỉ chạy khi máy tính đang bật và gõ `npm run dev`. Deploy = đưa app lên "máy chủ" của Vercel — chạy 24/7, có link chia sẻ được.

**Phần 2 — Đẩy code lên GitHub (30 phút)**

GitHub như "Google Drive cho code" — lưu trữ, quản lý phiên bản.

```
git init
git add .
git commit -m "dự án của tôi"
```
Tạo repo mới trên GitHub → làm theo hướng dẫn GitHub để đẩy code lên.

**Phần 3 — Deploy lên Vercel (30 phút)**

1. Vào https://vercel.com → đăng nhập bằng GitHub
2. "Add New Project" → chọn repo vừa tạo
3. **Quan trọng — thêm biến môi trường:**
   - `VITE_SUPABASE_URL` → giá trị từ file `.env`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` → giá trị từ file `.env`
4. Bấm Deploy → chờ 2 phút → có link!

**Phần 4 — Deploy Edge Functions (20 phút)**

Hỏi Claude:
> *"Deploy edge functions create-user và init-admin lên Supabase project lcmruhjizzdipmtceisq"*

**Phần 5 — Cập nhật app sau khi sửa (15 phút)**

Sau này mỗi khi sửa xong:
```
git add .
git commit -m "mô tả thay đổi"
git push
```
→ Vercel tự động cập nhật link.

---

### ✅ Definition of Done — Buổi 7

- [ ] App có link Vercel, mở được trên điện thoại
- [ ] Đăng nhập được trên link Vercel (không phải localhost)
- [ ] Chia sẻ link cho người khác vào được

---

## Buổi 8 — Tự Build Từ Đầu
### Mục tiêu: Đạt L4

**Một câu:** Học viên tự build và deploy được 1 app mới hoàn toàn, không dùng dự án mẫu.

---

### Nội dung buổi học

**Phần 1 — Chọn ý tưởng & viết spec (30 phút)**

Mỗi học viên chọn 1 ý tưởng và viết spec 1 trang:

| Mục | Điền vào |
|---|---|
| App này giải quyết vấn đề gì? | |
| Ai sẽ dùng? | |
| 3 tính năng chính là gì? | |
| Thế nào là "xong"? | |

**Phần 2 — Build (90 phút)**

Học viên tự build. Giảng viên và trợ giảng hỗ trợ.

Gợi ý ý tưởng phù hợp:
- Quản lý đặt bàn nhà hàng
- Quản lý lịch dạy học / học viên
- Danh sách công việc nhóm có phân quyền
- Quản lý thu chi cá nhân

**Phần 3 — Demo (30 phút)**

Mỗi học viên demo 5 phút theo cấu trúc:
1. **Vấn đề:** App này giải quyết gì?
2. **Demo live:** Làm thử 1 tính năng chính ngay trên màn hình
3. **Tự đánh giá:** Làm được gì, chưa làm được gì

---

### ✅ Definition of Done — Buổi 8 (Tốt nghiệp)

- [ ] App chạy được, không báo lỗi
- [ ] Có ít nhất 1 bảng dữ liệu tự tạo (không có trong dự án mẫu)
- [ ] Có đăng nhập / đăng xuất
- [ ] Có link Vercel chạy được
- [ ] Demo được 5 phút không cần giảng viên hỗ trợ

---

## AI Review Gate — Cổng Kiểm Tra Cuối Khoá

Trước khi cấp chứng nhận hoàn thành, học viên phải pass:

| Kiểm tra | Nội dung |
|---|---|
| **Teach-back** | Giải thích app của mình cho Claude nghe — Claude hỏi lại, học viên trả lời được |
| **Bug live** | Giảng viên tạo 1 lỗi ngay tại chỗ — học viên tự fix trong 15 phút |
| **Artifact** | Link app chạy được + có dữ liệu thật = PASS |

---

## Tổng Quan Hành Trình

| Buổi | Level | Tên | Artifact kiểm tra |
|---|---|---|---|
| 1 | L0 | Khởi động máy tính | App chạy local + nói chuyện được với Claude |
| 2 | L1 | Làm chủ giao diện | Tự thay đổi được 3 thứ trong app |
| 3 | L2 | Làm chủ dữ liệu | Thêm dữ liệu qua Claude, hiện ra trong app |
| 4 | L2 | Build tính năng mới | 1 tính năng hoàn chỉnh có DB + UI |
| 5 | L2 | Đăng nhập & phân quyền | Tạo được tài khoản nhân viên |
| 6 | L2 | Xử lý lỗi | Fix được 2/3 lỗi giảng viên tạo |
| 7 | L3 | Đưa lên internet | Link Vercel chạy được |
| 8 | L4 | Tự build từ đầu | App mới + demo 5 phút |

---

## Checklist Gửi Học Viên Trước Buổi 1

```
□ Máy tính: Windows 10+ hoặc macOS 12+, RAM 8GB trở lên
□ Tải VS Code: https://code.visualstudio.com
□ Tải Node.js (bản LTS): https://nodejs.org
□ Tạo tài khoản Claude: https://claude.ai
□ Tạo tài khoản Supabase: https://supabase.com
□ Tạo tài khoản GitHub: https://github.com
□ Đã hoàn thành Level 1 (Lovable)
```
