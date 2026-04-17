import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Check, Trash2, Pencil, Printer, ChevronRight } from 'lucide-react';

interface PrinterDevice {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  is_default: boolean;
  paper_size: string;
  copies: number;
  preview_before_print: boolean;
  choose_template_before_print: boolean;
  open_cash_drawer: boolean;
}

export default function PrinterSettings() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [view, setView] = useState<'list' | 'settings' | 'add'>('settings');
  const [addForm, setAddForm] = useState({ name: '', ip_address: '', port: 9100 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterDevice | null>(null);

  // Settings state
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [copies, setCopies] = useState(1);
  const [previewBeforePrint, setPreviewBeforePrint] = useState(true);
  const [chooseTemplate, setChooseTemplate] = useState(false);
  const [openCashDrawer, setOpenCashDrawer] = useState(false);

  useEffect(() => {
    fetchPrinters();
  }, []);

  const fetchPrinters = async () => {
    const { data } = await supabase.from('printers').select('*').order('created_at');
    if (data) {
      const list = data as unknown as PrinterDevice[];
      setPrinters(list);
      const def = list.find(p => p.is_default);
      if (def) {
        setSelectedPrinter(def);
        setPrinterEnabled(true);
        setCopies(def.copies);
        setPreviewBeforePrint(def.preview_before_print);
        setChooseTemplate(def.choose_template_before_print);
        setOpenCashDrawer(def.open_cash_drawer);
      }
    }
  };

  const selectPrinter = async (printer: PrinterDevice) => {
    // Set as default
    await supabase.from('printers').update({ is_default: false }).neq('id', printer.id);
    await supabase.from('printers').update({ is_default: true }).eq('id', printer.id);
    setSelectedPrinter(printer);
    setPrinterEnabled(true);
    setCopies(printer.copies);
    setPreviewBeforePrint(printer.preview_before_print);
    setChooseTemplate(printer.choose_template_before_print);
    setOpenCashDrawer(printer.open_cash_drawer);
    setView('settings');
    fetchPrinters();
    toast.success('Đã chọn máy in!');
  };

  const savePrinter = async () => {
    if (!addForm.name.trim() || !addForm.ip_address.trim()) {
      toast.error('Vui lòng nhập tên và địa chỉ IP');
      return;
    }

    if (editingPrinter) {
      const { error } = await supabase.from('printers').update({
        name: addForm.name,
        ip_address: addForm.ip_address,
        port: addForm.port,
      }).eq('id', editingPrinter.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Đã cập nhật máy in!');
    } else {
      const { error } = await supabase.from('printers').insert({
        name: addForm.name,
        ip_address: addForm.ip_address,
        port: addForm.port,
        is_default: printers.length === 0,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Đã thêm máy in!');
    }
    setDialogOpen(false);
    setEditingPrinter(null);
    setAddForm({ name: '', ip_address: '', port: 9100 });
    fetchPrinters();
  };

  const deletePrinter = async (id: string) => {
    await supabase.from('printers').delete().eq('id', id);
    if (selectedPrinter?.id === id) setSelectedPrinter(null);
    toast.success('Đã xoá máy in!');
    fetchPrinters();
  };

  const updateSetting = async (field: string, value: boolean | number) => {
    if (!selectedPrinter) return;
    const updatePayload: Record<string, boolean | number> = {};
    updatePayload[field] = value;
    await supabase.from('printers').update(updatePayload as any).eq('id', selectedPrinter.id);

    if (field === 'copies') setCopies(value as number);
    if (field === 'preview_before_print') setPreviewBeforePrint(value as boolean);
    if (field === 'choose_template_before_print') setChooseTemplate(value as boolean);
    if (field === 'open_cash_drawer') setOpenCashDrawer(value as boolean);
  };

  const togglePrinterEnabled = (val: boolean) => {
    setPrinterEnabled(val);
    if (!val) {
      // Unset default
      if (selectedPrinter) {
        supabase.from('printers').update({ is_default: false }).eq('id', selectedPrinter.id);
      }
      setSelectedPrinter(null);
    }
  };

  // Printer list view
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('settings')} className="text-sm text-muted-foreground flex items-center gap-1">
            ← Quay lại
          </button>
          <Button size="sm" variant="ghost" onClick={() => {
            setEditingPrinter(null);
            setAddForm({ name: '', ip_address: '', port: 9100 });
            setDialogOpen(true);
          }}>
            <Plus size={18} />
          </Button>
        </div>
        <h2 className="font-semibold text-base">Máy in hoá đơn</h2>

        {printers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Chưa có máy in nào. Nhấn + để thêm.
          </div>
        ) : (
          <div className="bg-card rounded-xl overflow-hidden border border-border">
            {printers.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => selectPrinter(p)}
                >
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.ip_address}:{p.port}</p>
                </button>
                <div className="flex items-center gap-2">
                  {p.is_default && <Check size={18} className="text-primary" />}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                    e.stopPropagation();
                    setEditingPrinter(p);
                    setAddForm({ name: p.name, ip_address: p.ip_address, port: p.port });
                    setDialogOpen(true);
                  }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => {
                    e.stopPropagation();
                    deletePrinter(p.id);
                  }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingPrinter ? 'Sửa máy in' : 'Thêm máy in'}</DialogTitle>
              <DialogDescription>Nhập thông tin kết nối máy in qua mạng LAN</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Tên máy in</Label><Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="VD: Birch BP-T3" /></div>
              <div><Label>Địa chỉ IP</Label><Input value={addForm.ip_address} onChange={e => setAddForm({ ...addForm, ip_address: e.target.value })} placeholder="VD: 192.168.2.120" /></div>
              <div><Label>Cổng (Port)</Label><Input type="number" value={addForm.port} onChange={e => setAddForm({ ...addForm, port: parseInt(e.target.value) || 9100 })} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
                <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={savePrinter}>Lưu</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Main settings view
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base flex items-center gap-2">
        <Printer size={18} /> Cài đặt máy in hoá đơn
      </h2>

      {/* Section 1: Printer toggle + selection */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm font-medium">Thiết lập máy in</span>
          <Switch checked={printerEnabled} onCheckedChange={togglePrinterEnabled} />
        </div>

        {printerEnabled && (
          <>
            <div className="border-t border-border">
              <button
                className="w-full flex items-center justify-between p-4 text-sm hover:bg-muted/30 transition-colors"
                onClick={() => setView('list')}
              >
                <span>Máy in</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {selectedPrinter?.name || 'Chưa chọn'}
                  <ChevronRight size={16} />
                </span>
              </button>
            </div>

            <div className="border-t border-border">
              <div className="flex items-center justify-between p-4 text-sm">
                <span>Số liên được in</span>
                <div className="flex items-center gap-2">
                  <button
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm"
                    onClick={() => { if (copies > 1) { setCopies(copies - 1); updateSetting('copies', copies - 1); } }}
                  >−</button>
                  <span className="text-sm w-8 text-center">{copies} liên</span>
                  <button
                    className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm"
                    onClick={() => { setCopies(copies + 1); updateSetting('copies', copies + 1); }}
                  >+</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section 2: Print options */}
      {printerEnabled && selectedPrinter && (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm">Chọn mẫu trước khi in</span>
              <Switch checked={chooseTemplate} onCheckedChange={v => { setChooseTemplate(v); updateSetting('choose_template_before_print', v); }} />
            </div>
            <div className="border-t border-border flex items-center justify-between p-4">
              <span className="text-sm">Xem trước khi in</span>
              <Switch checked={previewBeforePrint} onCheckedChange={v => { setPreviewBeforePrint(v); updateSetting('preview_before_print', v); }} />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <span className="text-sm">Mở ngăn kéo đựng tiền</span>
              <Switch checked={openCashDrawer} onCheckedChange={v => { setOpenCashDrawer(v); updateSetting('open_cash_drawer', v); }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
