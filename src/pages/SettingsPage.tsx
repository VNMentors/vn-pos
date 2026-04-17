import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Plus, Pencil, Trash2, Eye, Star, Store, Palette, Printer, KeyRound, Database, RotateCcw, AlertTriangle } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { renderTemplate, openPrintWindow, getDefaultTemplateContent, type PrintData } from '@/lib/printTemplates';

interface StoreSettings {
  id: string; store_name: string; address: string; phone: string; email: string;
  invoice_footer: string; site_title: string; primary_color: string; accent_color: string; logo_url: string;
}

interface PrintTemplate {
  id: string; name: string; type: string; paper_size: string; content: string; is_default: boolean;
}

const samplePrintData: PrintData = {
  invoiceNumber: 'HD-001',
  date: new Date().toLocaleString('vi-VN'),
  customerName: 'Nguyễn Văn A',
  customerPhone: '0948374378',
  customerAddress: 'Công Viên Bến Xe Phía Nam',
  staffName: 'Nhân viên 1',
  saleType: 'retail',
  paymentMethod: 'cash',
  items: [
    { product_name: 'Thịt heo', quantity: 2, unit: 'kg', unit_price: 120000, subtotal: 240000 },
    { product_name: 'Rau muống', quantity: 3, unit: 'bó', unit_price: 8000, subtotal: 24000 },
    { product_name: 'Trứng gà', quantity: 1, unit: 'vỉ', unit_price: 35000, subtotal: 35000 },
  ],
  subtotal: 299000, discountAmount: 9000, total: 290000, cashReceived: 300000, change: 10000,
};

type Tab = 'store' | 'website' | 'print' | 'account' | 'data';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'store',   label: 'Cửa hàng',  icon: <Store size={16} /> },
  { key: 'website', label: 'Giao diện', icon: <Palette size={16} /> },
  { key: 'print',   label: 'Mẫu in',    icon: <Printer size={16} /> },
  { key: 'data',    label: 'Dữ liệu',   icon: <Database size={16} /> },
  { key: 'account', label: 'Tài khoản', icon: <KeyRound size={16} /> },
];

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('store');
  const { settings: globalSettings, refetch } = useStoreSettings();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ store_name: '', address: '', phone: '', email: '', invoice_footer: '' });
  const [webForm, setWebForm] = useState({ site_title: '', primary_color: '#B8860B', accent_color: '#C6991E', logo_url: '' });
  const [uploading, setUploading] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [seeding, setSeeding] = useState(false);

  const [templates, setTemplates] = useState<PrintTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', paper_size: '80mm', content: '' });
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        const s = data as unknown as StoreSettings;
        setSettings(s);
        setForm({ store_name: s.store_name, address: s.address || '', phone: s.phone || '', email: s.email || '', invoice_footer: s.invoice_footer || '' });
        setWebForm({ site_title: s.site_title || '', primary_color: s.primary_color || '#B8860B', accent_color: s.accent_color || '#C6991E', logo_url: s.logo_url || '' });
      }
    });
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('print_templates').select('*').order('created_at');
    if (data) setTemplates(data as unknown as PrintTemplate[]);
  };

  const saveStore = async () => {
    setSaving(true);
    let error;
    if (settings?.id) {
      ({ error } = await supabase.from('store_settings').update(form).eq('id', settings.id));
    } else {
      const res = await supabase.from('store_settings').insert(form).select().single();
      error = res.error;
      if (res.data) setSettings(res.data as unknown as StoreSettings);
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã lưu thông tin cửa hàng!');
    refetch();
  };

  const saveWebsite = async () => {
    setSaving(true);
    const payload = { site_title: webForm.site_title, primary_color: webForm.primary_color, accent_color: webForm.accent_color, logo_url: webForm.logo_url };
    let error;
    if (settings?.id) {
      ({ error } = await supabase.from('store_settings').update(payload).eq('id', settings.id));
    } else {
      const res = await supabase.from('store_settings').insert(payload).select().single();
      error = res.error;
      if (res.data) setSettings(res.data as unknown as StoreSettings);
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã lưu cấu hình giao diện!');
    refetch();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Chỉ chấp nhận file ảnh'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Ảnh tối đa 2MB'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `logo/store-logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    setWebForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast.success('Đã upload logo!');
  };

  const handleSeedDemo = async () => {
    if (!confirm('Tạo dữ liệu mẫu? Dữ liệu hiện tại (sản phẩm, hoá đơn, khách hàng) sẽ bị xoá.')) return;
    setSeeding(true);
    try {
      await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const { data: cats } = await supabase.from('categories').insert([
        { name: 'Thực phẩm khô' }, { name: 'Thực phẩm tươi' }, { name: 'Đồ uống' },
        { name: 'Gia vị' }, { name: 'Quần áo' }, { name: 'Khác' },
      ]).select();
      const catMap: Record<string, string> = {};
      cats?.forEach(c => { catMap[c.name] = c.id; });

      const { data: prods } = await supabase.from('products').insert([
        { name: 'Gạo ST25', code: 'SP001', category_id: catMap['Thực phẩm khô'], unit: 'kg', cost_price: 18000, retail_price: 25000, wholesale_price: 22000, stock: 100, min_stock: 20 },
        { name: 'Mì Hảo Hảo', code: 'SP002', category_id: catMap['Thực phẩm khô'], unit: 'gói', cost_price: 3000, retail_price: 5000, wholesale_price: 4000, stock: 500, min_stock: 50 },
        { name: 'Nước mắm Phú Quốc', code: 'SP003', category_id: catMap['Gia vị'], unit: 'chai', cost_price: 30000, retail_price: 45000, wholesale_price: 40000, stock: 45, min_stock: 10 },
        { name: 'Dầu ăn Neptune', code: 'SP004', category_id: catMap['Gia vị'], unit: 'chai', cost_price: 35000, retail_price: 52000, wholesale_price: 48000, stock: 30, min_stock: 10 },
        { name: 'Nước khoáng Lavie', code: 'SP005', category_id: catMap['Đồ uống'], unit: 'chai', cost_price: 3000, retail_price: 5000, wholesale_price: 4000, stock: 300, min_stock: 50 },
        { name: 'Rau cải xanh', code: 'SP006', category_id: catMap['Thực phẩm tươi'], unit: 'kg', cost_price: 10000, retail_price: 15000, wholesale_price: 13000, stock: 25, min_stock: 5 },
        { name: 'Trứng gà ta (vỉ 10)', code: 'SP007', category_id: catMap['Thực phẩm tươi'], unit: 'vỉ', cost_price: 25000, retail_price: 35000, wholesale_price: 32000, stock: 50, min_stock: 10 },
        { name: 'Quần Jean Nam', code: 'QA001', category_id: catMap['Quần áo'], unit: 'cái', cost_price: 150000, retail_price: 350000, wholesale_price: 280000, stock: 0, min_stock: 5 },
        { name: 'Áo Thun Nữ', code: 'QA002', category_id: catMap['Quần áo'], unit: 'cái', cost_price: 80000, retail_price: 180000, wholesale_price: 140000, stock: 0, min_stock: 5 },
      ]).select();

      if (prods) {
        for (const [code, sizes, colors, baseCost, baseRetail, baseWholesale] of [
          ['QA001', ['S','M','L','XL'], ['Xanh đậm','Xanh nhạt','Đen'], 150000, 350000, 280000],
          ['QA002', ['S','M','L'], ['Trắng','Hồng','Đen'], 80000, 180000, 140000],
        ] as [string, string[], string[], number, number, number][]) {
          const prod = prods.find(p => p.code === code);
          if (!prod) continue;
          await supabase.from('product_attributes').insert([
            { product_id: prod.id, attribute_name: 'Size', attribute_values: sizes },
            { product_id: prod.id, attribute_name: 'Màu', attribute_values: colors },
          ]);
          const variants = sizes.flatMap(s => colors.map(c => ({
            product_id: prod.id, variant_name: `${s} - ${c}`,
            sku: `${code}-${s}-${c.charAt(0)}`, attributes: { Size: s, Màu: c },
            cost_price: baseCost, retail_price: baseRetail, wholesale_price: baseWholesale,
            stock: Math.floor(Math.random() * 20) + 5, min_stock: 2,
          })));
          await supabase.from('product_variants').insert(variants);
          await supabase.from('products').update({ stock: variants.reduce((s, v) => s + v.stock, 0) }).eq('id', prod.id);
        }
      }

      await supabase.from('customers').insert([
        { name: 'Nhà hàng Phố Biển', phone: '0901234567', type: 'wholesale', address: '123 Trần Hưng Đạo, Q.1', total_spent: 45000000, total_orders: 35, points: 450 },
        { name: 'Tạp hoá Minh Thành', phone: '0923456789', type: 'wholesale', address: '789 Nguyễn Trãi, Q.5', total_spent: 62000000, total_orders: 48, points: 620 },
        { name: 'Nguyễn Thị Mai', phone: '0945678901', type: 'retail', total_spent: 2500000, total_orders: 12, points: 25 },
        { name: 'Trần Văn Hùng', phone: '0956789012', type: 'retail', total_spent: 1800000, total_orders: 8, points: 18 },
      ]);

      toast.success('Đã tạo dữ liệu mẫu thành công!');
    } catch (err: any) {
      toast.error('Lỗi: ' + (err?.message || 'Không xác định'));
    } finally {
      setSeeding(false);
    }
  };

  const handleResetDB = async () => {
    if (!confirm('⚠️ XOÁ TOÀN BỘ dữ liệu (trừ tài khoản nhân viên)? Hành động này không thể hoàn tác!')) return;
    if (!confirm('Xác nhận lần nữa: XOÁ TẤT CẢ?')) return;
    setSeeding(true);
    try {
      await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_attributes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('print_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      toast.success('Đã xoá toàn bộ dữ liệu!');
    } catch (err: any) {
      toast.error('Lỗi: ' + (err?.message || 'Không xác định'));
    } finally {
      setSeeding(false);
    }
  };

  const changePassword = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    if (newPw !== confirmPw) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { toast.error(error.message); return; }
    toast.success('Đã đổi mật khẩu!');
    setNewPw(''); setConfirmPw('');
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', paper_size: '80mm', content: '' });
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t: PrintTemplate) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, paper_size: t.paper_size, content: t.content });
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim()) { toast.error('Vui lòng nhập tên mẫu'); return; }
    const content = templateForm.content || getDefaultTemplateContent(templateForm.paper_size);
    if (editingTemplate) {
      const { error } = await supabase.from('print_templates').update({ name: templateForm.name, paper_size: templateForm.paper_size, content }).eq('id', editingTemplate.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Đã cập nhật mẫu in!');
    } else {
      const { error } = await supabase.from('print_templates').insert({ name: templateForm.name, paper_size: templateForm.paper_size, content, type: 'receipt' });
      if (error) { toast.error(error.message); return; }
      toast.success('Đã thêm mẫu in!');
    }
    setTemplateDialogOpen(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Xoá mẫu in này?')) return;
    const { error } = await supabase.from('print_templates').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã xoá!');
    fetchTemplates();
  };

  const setDefaultTemplate = async (id: string) => {
    await supabase.from('print_templates').update({ is_default: false }).neq('id', id);
    await supabase.from('print_templates').update({ is_default: true }).eq('id', id);
    toast.success('Đã đặt mẫu mặc định!');
    fetchTemplates();
  };

  const previewTemplate = (t: PrintTemplate) => {
    const html = renderTemplate(t.content, { ...samplePrintData, storeName: settings?.store_name, storeAddress: settings?.address, storePhone: settings?.phone, invoiceFooter: settings?.invoice_footer, logoUrl: webForm.logo_url });
    openPrintWindow(html);
  };

  const paperSizeLabel = (size: string) => ({ '80mm': 'Bill 80mm', 'A4': 'A4', 'A5': 'A5' }[size] ?? size);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Cài đặt</h1>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl card-shadow">
        {/* ── Cửa hàng ── */}
        {tab === 'store' && (
          <div className="p-6 max-w-xl space-y-6">
            <Section title="Thông tin cơ bản">
              <FieldGroup label="Tên cửa hàng" hint="Hiển thị trên hoá đơn và tiêu đề trang">
                <Input value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })} placeholder="VD: Cửa hàng thực phẩm Năm Thành" />
              </FieldGroup>
              <FieldGroup label="Địa chỉ">
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Số nhà, đường, phường, quận, tỉnh" />
              </FieldGroup>
            </Section>

            <div className="border-t border-border" />

            <Section title="Liên hệ">
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="Số điện thoại">
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901 234 567" />
                </FieldGroup>
                <FieldGroup label="Email">
                  <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cửahàng@gmail.com" />
                </FieldGroup>
              </div>
            </Section>

            <div className="border-t border-border" />

            <Section title="Hoá đơn">
              <FieldGroup label="Footer hoá đơn" hint="Dòng chữ cuối hoá đơn, VD: Cảm ơn quý khách, hẹn gặp lại!">
                <textarea
                  value={form.invoice_footer}
                  onChange={e => setForm({ ...form, invoice_footer: e.target.value })}
                  className="w-full p-2.5 border border-border rounded-lg text-sm bg-card h-20 resize-none focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="Cảm ơn quý khách! Hẹn gặp lại."
                />
              </FieldGroup>
            </Section>

            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={saveStore} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        )}

        {/* ── Giao diện ── */}
        {tab === 'website' && (
          <div className="p-6 max-w-xl space-y-6">
            <Section title="Thương hiệu">
              <FieldGroup label="Tiêu đề tab trình duyệt">
                <Input value={webForm.site_title} onChange={e => setWebForm({ ...webForm, site_title: e.target.value })} placeholder="Cung Cấp Thực Phẩm Sỉ Và Lẻ" />
              </FieldGroup>

              <FieldGroup label="Logo cửa hàng" hint="Hiển thị ở sidebar và hoá đơn. Tối đa 2MB.">
                {webForm.logo_url ? (
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                    <img src={webForm.logo_url} alt="Logo" className="h-12 object-contain rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{webForm.logo_url.split('/').pop()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setWebForm(f => ({ ...f, logo_url: '' }))} className="text-destructive hover:text-destructive shrink-0">
                      <X size={14} className="mr-1" /> Xoá
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload size={24} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading ? 'Đang upload...' : 'Kéo thả hoặc nhấn để chọn ảnh'}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </FieldGroup>
            </Section>

            <div className="border-t border-border" />

            <Section title="Màu sắc">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Màu chủ đạo', key: 'primary_color' as const, hint: 'Màu nút, viền nổi bật' },
                  { label: 'Màu phụ',     key: 'accent_color'  as const, hint: 'Màu hover, nhấn nhẹ' },
                ].map(({ label, key, hint }) => (
                  <FieldGroup key={key} label={label} hint={hint}>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={webForm[key]}
                          onChange={e => setWebForm(f => ({ ...f, [key]: e.target.value }))}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                        />
                      </div>
                      <Input
                        value={webForm[key]}
                        onChange={e => setWebForm(f => ({ ...f, [key]: e.target.value }))}
                        className="font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </FieldGroup>
                ))}
              </div>
              <div className="flex gap-3 p-3 border border-border rounded-lg bg-muted/20">
                <div className="flex-1 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium shadow-sm" style={{ backgroundColor: webForm.primary_color }}>Màu chủ đạo</div>
                <div className="flex-1 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium shadow-sm" style={{ backgroundColor: webForm.accent_color }}>Màu phụ</div>
              </div>
            </Section>

            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={saveWebsite} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        )}

        {/* ── Mẫu in ── */}
        {tab === 'print' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Mẫu in hoá đơn</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Nhấn ⭐ để đặt mẫu mặc định khi in</p>
              </div>
              <Button size="sm" className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={openNewTemplate}>
                <Plus size={14} className="mr-1.5" /> Thêm mẫu
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                <Printer size={36} className="mx-auto mb-3 opacity-30" />
                Chưa có mẫu in nào. Nhấn "Thêm mẫu" để tạo.
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${t.is_default ? 'border-gold/60 bg-gold/5' : 'border-border hover:bg-muted/30'}`}>
                    <button onClick={() => setDefaultTemplate(t.id)} title={t.is_default ? 'Mẫu mặc định' : 'Đặt làm mặc định'} className="shrink-0">
                      <Star size={18} className={t.is_default ? 'fill-gold text-gold' : 'text-muted-foreground hover:text-gold transition-colors'} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {paperSizeLabel(t.paper_size)}{t.is_default && <span className="ml-2 px-1.5 py-0.5 bg-gold/15 text-gold rounded text-xs">Mặc định</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => previewTemplate(t)} title="Xem trước"><Eye size={15} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTemplate(t)} title="Sửa"><Pencil size={15} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTemplate(t.id)} title="Xoá"><Trash2 size={15} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Dữ liệu ── */}
        {tab === 'data' && (
          <div className="p-6 max-w-xl space-y-6">
            <Section title="Dữ liệu mẫu">
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div>
                  <p className="font-medium text-sm">Tạo dữ liệu mẫu</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Tạo sẵn danh mục, sản phẩm (có biến thể), khách hàng mẫu để test thử hệ thống. Dữ liệu hiện tại sẽ bị xoá.</p>
                </div>
                <Button
                  variant="outline"
                  className="border-gold text-gold hover:bg-gold/5"
                  onClick={handleSeedDemo}
                  disabled={seeding}
                >
                  <Database size={15} className="mr-2" />
                  {seeding ? 'Đang xử lý...' : 'Tạo dữ liệu mẫu'}
                </Button>
              </div>
            </Section>

            <div className="border-t border-border" />

            <Section title="Vùng nguy hiểm">
              <div className="border border-danger/40 rounded-xl p-4 space-y-3 bg-danger/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-danger mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-danger">Xoá toàn bộ dữ liệu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Xoá tất cả sản phẩm, hoá đơn, khách hàng, mẫu in. Tài khoản nhân viên không bị ảnh hưởng. Hành động này không thể hoàn tác.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-danger text-danger hover:bg-danger/10"
                  onClick={handleResetDB}
                  disabled={seeding}
                >
                  <RotateCcw size={15} className="mr-2" />
                  {seeding ? 'Đang xử lý...' : 'Reset toàn bộ dữ liệu'}
                </Button>
              </div>
            </Section>
          </div>
        )}

        {/* ── Tài khoản ── */}
        {tab === 'account' && (
          <div className="p-6 max-w-sm space-y-6">
            <Section title="Bảo mật">
              <FieldGroup label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
              </FieldGroup>
              <FieldGroup label="Xác nhận mật khẩu">
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
              </FieldGroup>
              <Button className="bg-gold hover:bg-gold-dark text-primary-foreground w-full" onClick={changePassword}>
                Đổi mật khẩu
              </Button>
            </Section>
          </div>
        )}
      </div>

      {/* Template dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Sửa mẫu in' : 'Thêm mẫu in mới'}</DialogTitle>
            <DialogDescription>Chọn kích thước giấy và đặt tên cho mẫu in</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup label="Tên mẫu">
              <Input value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="VD: Bill 80mm nhỏ" />
            </FieldGroup>
            <FieldGroup label="Kích thước giấy">
              <div className="flex gap-2">
                {(['80mm', 'A5', 'A4'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setTemplateForm({ ...templateForm, paper_size: size, content: getDefaultTemplateContent(size) })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${templateForm.paper_size === size ? 'bg-gold text-primary-foreground border-gold' : 'bg-muted text-muted-foreground border-border hover:border-gold/40'}`}
                  >
                    {paperSizeLabel(size)}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup label="Nội dung HTML (tuỳ chỉnh)" hint={`Biến: {{store_name}}, {{invoice_number}}, {{date}}, {{customer_name}}, {{items_html}}, {{total}}, {{footer}}`}>
              <textarea
                value={templateForm.content.startsWith('default_') ? '' : templateForm.content}
                onChange={e => setTemplateForm({ ...templateForm, content: e.target.value })}
                className="w-full p-2.5 border border-border rounded-lg text-xs bg-card h-32 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="Để trống để dùng mẫu mặc định..."
              />
            </FieldGroup>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Huỷ</Button>
              <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={saveTemplate}>Lưu mẫu</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
