CREATE TABLE public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER DEFAULT 9100,
  is_default BOOLEAN DEFAULT false,
  paper_size TEXT DEFAULT '80mm',
  copies INTEGER DEFAULT 1,
  preview_before_print BOOLEAN DEFAULT true,
  choose_template_before_print BOOLEAN DEFAULT false,
  open_cash_drawer BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage printers"
ON public.printers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);