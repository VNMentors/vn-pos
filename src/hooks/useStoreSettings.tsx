import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreSettings {
  id: string;
  store_name: string;
  address: string;
  phone: string;
  email: string;
  invoice_footer: string;
  site_title: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
  logo_url: string;
}

interface StoreSettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType>({ settings: null, loading: true, refetch: async () => {} });

function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColors(primary: string, accent: string) {
  const root = document.documentElement;
  if (primary) {
    const hsl = hexToHSL(primary);
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--gold-primary', hsl);
    root.style.setProperty('--accent-foreground', hsl);
  }
  if (accent) {
    const hsl = hexToHSL(accent);
    root.style.setProperty('--gold-light', hsl);
  }
}

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('store_settings').select('*').limit(1).single();
    if (data) {
      const s = data as unknown as StoreSettings;
      setSettings(s);
      document.title = s.site_title || s.store_name || 'Cung Cấp Thực Phẩm Sỉ Và Lẻ';
      applyColors(s.primary_color, s.accent_color);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
