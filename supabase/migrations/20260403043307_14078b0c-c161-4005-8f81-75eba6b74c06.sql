
-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  category_id uuid REFERENCES public.categories(id),
  unit text NOT NULL DEFAULT 'cái',
  cost_price numeric(15,2) NOT NULL DEFAULT 0,
  retail_price numeric(15,2) NOT NULL DEFAULT 0,
  wholesale_price numeric(15,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 10,
  image_url text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  type text NOT NULL DEFAULT 'retail',
  address text DEFAULT '',
  note text DEFAULT '',
  birthday date,
  total_spent numeric(15,2) NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles (for staff info linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  role text DEFAULT 'staff',
  shift text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Staff permissions
CREATE TABLE public.staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  UNIQUE(profile_id, module)
);
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view permissions" ON public.staff_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage permissions" ON public.staff_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store settings
CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL DEFAULT 'Cung Cấp Thực Phẩm Sỉ Và Lẻ',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  logo_url text DEFAULT '',
  invoice_footer text DEFAULT 'Cảm ơn quý khách! Hẹn gặp lại!',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view settings" ON public.store_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage settings" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES public.customers(id),
  staff_id uuid REFERENCES public.profiles(id),
  customer_name text DEFAULT 'Khách vãng lai',
  staff_name text DEFAULT '',
  sale_type text NOT NULL DEFAULT 'retail',
  payment_method text NOT NULL DEFAULT 'cash',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  discount_amount numeric(15,2) NOT NULL DEFAULT 0,
  discount_reason text DEFAULT '',
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total numeric(15,2) NOT NULL DEFAULT 0,
  cash_received numeric(15,2) DEFAULT 0,
  change_amount numeric(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Invoice items
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  product_code text DEFAULT '',
  unit text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  cost_price numeric(15,2) NOT NULL DEFAULT 0,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  subtotal numeric(15,2) NOT NULL DEFAULT 0
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed categories
INSERT INTO public.categories (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Thực phẩm khô'),
  ('22222222-2222-2222-2222-222222222222', 'Thực phẩm tươi'),
  ('33333333-3333-3333-3333-333333333333', 'Đồ uống'),
  ('44444444-4444-4444-4444-444444444444', 'Gia vị'),
  ('55555555-5555-5555-5555-555555555555', 'Khác');

-- Seed products
INSERT INTO public.products (name, code, category_id, unit, cost_price, retail_price, wholesale_price, stock, min_stock, status, description) VALUES
  ('Gạo ST25', 'SP001', '11111111-1111-1111-1111-111111111111', 'kg', 18000, 25000, 22000, 100, 20, 'active', 'Gạo ST25 thơm ngon'),
  ('Gạo Jasmine', 'SP002', '11111111-1111-1111-1111-111111111111', 'kg', 15000, 20000, 18000, 80, 20, 'active', ''),
  ('Nước mắm Phú Quốc', 'SP003', '44444444-4444-4444-4444-444444444444', 'chai', 30000, 45000, 40000, 45, 10, 'active', 'Nước mắm truyền thống'),
  ('Dầu ăn Neptune', 'SP004', '44444444-4444-4444-4444-444444444444', 'chai', 35000, 52000, 48000, 30, 10, 'active', ''),
  ('Đường cát trắng', 'SP005', '11111111-1111-1111-1111-111111111111', 'kg', 12000, 18000, 16000, 60, 15, 'active', ''),
  ('Muối iốt', 'SP006', '44444444-4444-4444-4444-444444444444', 'gói', 3000, 5000, 4500, 200, 30, 'active', ''),
  ('Nước tương Maggi', 'SP007', '44444444-4444-4444-4444-444444444444', 'chai', 12000, 18000, 16000, 50, 10, 'active', ''),
  ('Mì Hảo Hảo', 'SP008', '11111111-1111-1111-1111-111111111111', 'gói', 3000, 5000, 4000, 500, 50, 'active', ''),
  ('Bún gạo khô', 'SP009', '11111111-1111-1111-1111-111111111111', 'gói', 8000, 12000, 10000, 8, 10, 'active', ''),
  ('Miến dong', 'SP010', '11111111-1111-1111-1111-111111111111', 'gói', 10000, 15000, 13000, 40, 10, 'active', ''),
  ('Nước khoáng Lavie', 'SP011', '33333333-3333-3333-3333-333333333333', 'chai', 3000, 5000, 4000, 300, 50, 'active', ''),
  ('Nước ngọt Pepsi 1.5L', 'SP012', '33333333-3333-3333-3333-333333333333', 'chai', 10000, 15000, 13000, 0, 20, 'active', ''),
  ('Rau cải xanh', 'SP013', '22222222-2222-2222-2222-222222222222', 'kg', 10000, 15000, 13000, 25, 5, 'active', ''),
  ('Trứng gà ta (vỉ 10)', 'SP014', '22222222-2222-2222-2222-222222222222', 'vỉ', 25000, 35000, 32000, 50, 10, 'active', ''),
  ('Hành tím', 'SP015', '22222222-2222-2222-2222-222222222222', 'kg', 20000, 30000, 27000, 15, 5, 'active', '');

-- Seed customers
INSERT INTO public.customers (name, phone, type, address, note, total_spent, total_orders, points) VALUES
  ('Nhà hàng Phố Biển', '0901234567', 'wholesale', '123 Trần Hưng Đạo, Q.1', 'Khách quen', 45000000, 35, 450),
  ('Quán Cơm Tấm Bà Tư', '0912345678', 'wholesale', '456 Lý Thường Kiệt, Q.5', '', 28000000, 22, 280),
  ('Tạp hoá Minh Thành', '0923456789', 'wholesale', '789 Nguyễn Trãi, Q.5', 'Mua sỉ hàng tuần', 62000000, 48, 620),
  ('Bếp Ăn Công Nghiệp ABC', '0934567890', 'wholesale', 'KCN Tân Bình', '', 85000000, 60, 850),
  ('Nguyễn Thị Mai', '0945678901', 'retail', '', '', 2500000, 12, 25),
  ('Trần Văn Hùng', '0956789012', 'retail', '', '', 1800000, 8, 18),
  ('Lê Thị Hoa', '0967890123', 'retail', '', '', 3200000, 15, 32),
  ('Phạm Minh Tuấn', '0978901234', 'retail', '', '', 950000, 5, 10),
  ('Võ Thị Lan', '0989012345', 'retail', '', '', 4100000, 18, 41),
  ('Đặng Quốc Bảo', '0990123456', 'retail', '', '', 1200000, 6, 12);

-- Seed store settings
INSERT INTO public.store_settings (store_name, address, phone, email, invoice_footer) VALUES
  ('Cung Cấp Thực Phẩm Sỉ Và Lẻ', '123 Đường ABC, Quận 1, TP.HCM', '0901234567', 'admin@thucpham.vn', 'Cảm ơn quý khách! Hẹn gặp lại!');
