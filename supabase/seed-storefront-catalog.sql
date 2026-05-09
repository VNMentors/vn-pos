-- Seed catalog for the public storefront.
-- Run this after the main schema if you want the shop page to use real Supabase data.

INSERT INTO public.categories (name)
VALUES
  ('Thời trang'),
  ('Phụ kiện'),
  ('Dụng cụ học tập'),
  ('Góc làm việc')
ON CONFLICT (name) DO NOTHING;

WITH category_map AS (
  SELECT id, name FROM public.categories
  WHERE name IN ('Thời trang', 'Phụ kiện', 'Dụng cụ học tập', 'Góc làm việc')
)
INSERT INTO public.products (
  name,
  code,
  category_id,
  unit,
  cost_price,
  retail_price,
  wholesale_price,
  stock,
  min_stock,
  image_url,
  status,
  description
)
VALUES
  (
    'Áo thun cotton premium',
    'TEE-PREMIUM-01',
    (SELECT id FROM category_map WHERE name = 'Thời trang'),
    'cái',
    119000,
    249000,
    219000,
    42,
    8,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
    'active',
    'Form regular dễ mặc, vải cotton mềm, phù hợp đi học, đi làm và dạo phố.'
  ),
  (
    'Sơ mi linen ngắn tay',
    'SHIRT-LINEN-02',
    (SELECT id FROM category_map WHERE name = 'Thời trang'),
    'cái',
    165000,
    329000,
    289000,
    24,
    6,
    'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85',
    'active',
    'Chất linen pha thoáng, màu trung tính, dễ phối quần jeans hoặc kaki.'
  ),
  (
    'Túi tote canvas khóa kéo',
    'BAG-TOTE-03',
    (SELECT id FROM category_map WHERE name = 'Phụ kiện'),
    'cái',
    82000,
    179000,
    155000,
    58,
    10,
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85',
    'active',
    'Túi canvas dày, có khóa kéo và ngăn nhỏ, đựng laptop 13 inch, sách vở hoặc đồ cá nhân.'
  ),
  (
    'Kính mát gọng vuông',
    'SUN-SQUARE-04',
    (SELECT id FROM category_map WHERE name = 'Phụ kiện'),
    'cái',
    92000,
    219000,
    189000,
    31,
    6,
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85',
    'active',
    'Gọng vuông hiện đại, tròng chống UV400, hợp đi chơi và du lịch.'
  ),
  (
    'Bộ bút gel pastel 6 màu',
    'PEN-PASTEL-05',
    (SELECT id FROM category_map WHERE name = 'Dụng cụ học tập'),
    'bộ',
    36000,
    79000,
    69000,
    120,
    20,
    'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85',
    'active',
    'Mực gel ra đều, màu pastel nhẹ, hợp ghi chú, bullet journal và trang trí vở.'
  ),
  (
    'Sổ planner bìa cứng A5',
    'NOTE-A5-06',
    (SELECT id FROM category_map WHERE name = 'Dụng cụ học tập'),
    'quyển',
    54000,
    129000,
    109000,
    76,
    12,
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85',
    'active',
    'Layout tuần/tháng rõ ràng, giấy dày hạn chế lem mực, bìa cứng bảo vệ tốt.'
  ),
  (
    'Đèn bàn LED gập gọn',
    'LAMP-LED-07',
    (SELECT id FROM category_map WHERE name = 'Góc làm việc'),
    'cái',
    148000,
    299000,
    269000,
    18,
    5,
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85',
    'active',
    'Ba nhiệt màu, cảm ứng chạm, gập gọn cho bàn học nhỏ.'
  ),
  (
    'Kệ bàn học module',
    'DESK-SHELF-08',
    (SELECT id FROM category_map WHERE name = 'Góc làm việc'),
    'bộ',
    175000,
    359000,
    329000,
    14,
    4,
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=85',
    'active',
    'Kệ lắp ghép để sách, tai nghe, phụ kiện nhỏ, giúp góc làm việc gọn hơn.'
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  unit = EXCLUDED.unit,
  cost_price = EXCLUDED.cost_price,
  retail_price = EXCLUDED.retail_price,
  wholesale_price = EXCLUDED.wholesale_price,
  stock = EXCLUDED.stock,
  min_stock = EXCLUDED.min_stock,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;
