# vn-pos — Phần Mềm Quản Lý Bán Hàng

Hệ thống POS (Point of Sale) cho cửa hàng thực phẩm sỉ lẻ. Web app chạy trên browser, dùng Supabase làm backend.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui (Radix UI)
- **State/Data**: React Query (TanStack Query v5)
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Package manager**: bun

## Dev Commands

```bash
bun dev        # chạy local dev server
bun build      # build production
bun test       # chạy unit test (Vitest)
```

## Cấu Trúc Thư Mục

```
src/
  pages/          # Các trang chính (1 file = 1 route)
  components/
    ui/           # shadcn components — KHÔNG sửa trực tiếp
    settings/     # Component phần cài đặt
    AppLayout.tsx # Layout chính với sidebar + mobile nav
  hooks/
    useAuth.tsx         # Auth context (user, profile, signIn, signOut)
    useStoreSettings.tsx # Store settings context
  integrations/
    supabase/
      client.ts   # Supabase client (dùng anon key từ .env)
      types.ts    # TypeScript types tự generate từ Supabase
  lib/
    exportExcel.ts    # Xuất Excel
    printTemplates.ts # Template in hoá đơn
    mockData.ts       # Dữ liệu mẫu cho setup ban đầu
supabase/
  functions/
    create-user/  # Edge function: admin tạo tài khoản nhân viên
    init-admin/   # Edge function: tạo admin lần đầu (chỉ chạy 1 lần)
  migrations/     # Migration SQL history
supabase-setup-simple.sql  # Schema đầy đủ để setup DB từ đầu
```

## Supabase

- **Project ID**: `lcmruhjizzdipmtceisq`
- **Region**: ap-southeast-1
- **Anon key**: trong `.env` — `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Edge functions** dùng `SUPABASE_SERVICE_ROLE_KEY` (tự inject bởi Supabase, không cần set thủ công)

Import client: `import { supabase } from "@/integrations/supabase/client"`

## Database Schema

| Table | Mô tả |
|---|---|
| `profiles` | Thông tin nhân viên/admin (link với `auth.users`) |
| `products` | Sản phẩm |
| `product_attributes` | Thuộc tính sản phẩm (màu, size...) |
| `product_variants` | Biến thể sản phẩm |
| `categories` | Danh mục sản phẩm |
| `customers` | Khách hàng |
| `invoices` | Hoá đơn |
| `invoice_items` | Chi tiết hoá đơn |
| `printers` | Cấu hình máy in |
| `print_templates` | Template in hoá đơn |
| `store_settings` | Cài đặt cửa hàng (tên, logo, màu sắc) |
| `staff_permissions` | Phân quyền nhân viên theo module |

Trigger `on_auth_user_created` tự tạo `profiles` record khi có user mới trong `auth.users`.

## Auth & Phân Quyền

- **2 role**: `admin` và `staff`
- `admin`: full quyền tất cả module
- `staff`: quyền theo `staff_permissions` (can_view, can_create, can_update, can_delete)
- Navigation sidebar tự filter theo quyền của user hiện tại

**Tại sao dùng Edge Function để tạo user?**
Client SDK chỉ có `anon key` — không gọi được `auth.admin.*`. Edge functions chạy server-side với `service_role key` nên làm được.

## Storage

- Bucket: `product-images` — lưu ảnh sản phẩm
- Public URL qua: `supabase.storage.from('product-images').getPublicUrl(fileName)`

## Conventions

- Import alias `@/` trỏ vào `src/`
- Không dùng comment giải thích code — đặt tên biến/hàm rõ ràng thay thế
- Không tạo abstraction thừa — ưu tiên code thẳng vào page/component
- Màu theme: `text-gold`, `bg-gold` (màu chủ đạo vàng đồng)
- Tất cả text UI dùng tiếng Việt
