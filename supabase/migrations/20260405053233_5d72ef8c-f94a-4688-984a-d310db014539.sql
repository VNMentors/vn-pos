
CREATE TABLE public.print_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'receipt',
  paper_size text NOT NULL DEFAULT '80mm',
  content text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.print_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view print templates" ON public.print_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage print templates" ON public.print_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default templates
INSERT INTO public.print_templates (name, type, paper_size, content, is_default) VALUES
('Mẫu hoá đơn 80mm', 'receipt', '80mm', 'default_80mm', true),
('Mẫu hoá đơn A4', 'receipt', 'A4', 'default_a4', false),
('Mẫu hoá đơn A5', 'receipt', 'A5', 'default_a5', false);
