ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS site_title text DEFAULT 'Cung Cấp Thực Phẩm Sỉ Và Lẻ';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#B8860B';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#C6991E';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Be Vietnam Pro';