import { useState, useEffect, useRef } from 'react';
import { Search, Eye, Printer, CalendarIcon, Pencil, ChevronLeft, ChevronRight, Download, XCircle } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { getTemplates, renderTemplate, openPrintWindow, type PrintData } from '@/lib/printTemplates';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface InvoiceItem { id: string; product_name: string; product_code: string; unit: string; quantity: number; unit_price: number; subtotal: number; cost_price: number; }
interface Invoice {
  id: string; invoice_number: string; customer_id: string | null; customer_name: string; staff_name: string;
  sale_type: string; payment_method: string; subtotal: number; discount_amount: number;
  discount_reason: string; total: number; status: string; created_at: string;
  note: string; cash_received: number; change_amount: number;
}

const ITEMS_PER_PAGE = 50;

export default function Invoices() {
  const { settings: storeSettings } = useStoreSettings();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [customerInvoiceInfo, setCustomerInvoiceInfo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ customer_name: '', note: '', discount_amount: '', discount_reason: '', status: 'completed', payment_method: 'cash' });
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePrintData, setTemplatePrintData] = useState<PrintData | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<{ id: string; name: string; paper_size: string; content: string; is_default: boolean }[]>([]);

  const fetchInvoices = async () => {
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (dateFrom) query = query.gte('created_at', startOfDay(dateFrom).toISOString());
    if (dateTo) query = query.lte('created_at', endOfDay(dateTo).toISOString());
    const { data } = await query;
    if (data) setInvoices(data as unknown as Invoice[]);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, [dateFrom, dateTo]);
  useEffect(() => { setPage(1); }, [search, filterType]);

  const viewInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) setInvoiceItems(data as unknown as InvoiceItem[]);
    if (inv.customer_id) {
      const { data: cust } = await supabase.from('customers').select('invoice_info').eq('id', inv.customer_id).single();
      setCustomerInvoiceInfo((cust as any)?.invoice_info || '');
    } else {
      setCustomerInvoiceInfo('');
    }
  };

  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditForm({
      customer_name: inv.customer_name || '',
      note: inv.note || '',
      discount_amount: inv.discount_amount ? String(inv.discount_amount) : '',
      discount_reason: inv.discount_reason || '',
      status: inv.status,
      payment_method: inv.payment_method,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingInvoice) return;
    const discountAmt = Number(editForm.discount_amount || 0);
    const newTotal = editingInvoice.subtotal - discountAmt;
    const { error } = await supabase.from('invoices').update({
      customer_name: editForm.customer_name,
      note: editForm.note,
      discount_amount: discountAmt,
      discount_reason: editForm.discount_reason,
      status: editForm.status,
      payment_method: editForm.payment_method,
      total: newTotal > 0 ? newTotal : 0,
    }).eq('id', editingInvoice.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã cập nhật hoá đơn!');
    setEditOpen(false);
    fetchInvoices();
  };

  const handlePrint = async (inv?: Invoice) => {
    const target = inv || selectedInvoice;
    if (!target) return;
    // Fetch customer phone & address if customer_id exists
    let customerPhone = '';
    let customerAddress = '';
    if (target.customer_id) {
      const { data: cust } = await supabase.from('customers').select('phone, address').eq('id', target.customer_id).single();
      if (cust) {
        customerPhone = cust.phone || '';
        customerAddress = cust.address || '';
      }
    }
    const data: PrintData = {
      invoiceNumber: target.invoice_number,
      date: formatDate(target.created_at),
      customerName: target.customer_name || 'Khách sỉ',
      customerPhone,
      customerAddress,
      staffName: target.staff_name || '',
      saleType: target.sale_type as 'retail' | 'wholesale',
      paymentMethod: target.payment_method as 'cash' | 'transfer',
      items: invoiceItems.map(it => ({ product_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, subtotal: it.subtotal })),
      subtotal: target.subtotal,
      discountAmount: target.discount_amount,
      total: target.total,
      cashReceived: target.cash_received,
      change: target.change_amount,
      storeName: storeSettings?.store_name,
      storeAddress: storeSettings?.address,
      storePhone: storeSettings?.phone,
      invoiceFooter: storeSettings?.invoice_footer,
      logoUrl: storeSettings?.logo_url,
    };

    const templates = await getTemplates();
    const defaultTpl = templates.find(t => t.is_default) || templates[0];

    if (templates.length > 1) {
      setTemplatePrintData(data);
      setAvailableTemplates(templates);
      setTemplatePickerOpen(true);
    } else if (defaultTpl) {
      const html = renderTemplate(defaultTpl.content, data);
      openPrintWindow(html);
    }
  };

  const printFromList = async (inv: Invoice) => {
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) {
      setInvoiceItems(data as unknown as InvoiceItem[]);
      setTimeout(() => handlePrint(inv), 100);
    }
  };

  const handleCancel = async (inv: Invoice) => {
    if (!confirm(`Bạn có chắc muốn huỷ hoá đơn ${inv.invoice_number}?`)) return;
    const { error } = await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Đã huỷ hoá đơn ${inv.invoice_number}`);
    fetchInvoices();
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || inv.status === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h1 className="text-xl font-bold">Hoá đơn ({invoices.length})</h1>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm mã HĐ, khách..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="p-2 border border-border rounded-lg text-sm bg-card h-10">
              <option value="all">Tất cả</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 text-sm px-3", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon size={14} className="mr-1" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Từ ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 text-sm px-3", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon size={14} className="mr-1" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Đến ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="text-xs text-muted-foreground">Xoá lọc</Button>
            )}
            <Button variant="outline" size="sm" className="h-10 gap-1.5 border-gold/30 text-gold hover:bg-gold-bg" onClick={() => {
              const totalRevenue = filtered.reduce((s, inv) => s + Number(inv.total), 0);
              const rows = filtered.map(inv => ({
                'Mã HĐ': inv.invoice_number,
                'Khách hàng': inv.customer_name,
                'Loại': inv.sale_type === 'wholesale' ? 'Sỉ' : 'Lẻ',
                'Thanh toán': inv.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
                'Tạm tính': Number(inv.subtotal),
                'Giảm giá': Number(inv.discount_amount),
                'Tổng tiền': Number(inv.total),
                'Trạng thái': inv.status === 'completed' ? 'Hoàn thành' : 'Đã huỷ',
                'Ngày': formatDate(inv.created_at),
                'Thu ngân': inv.staff_name,
              }));
              rows.push({ 'Mã HĐ': '', 'Khách hàng': '', 'Loại': '', 'Thanh toán': '', 'Tạm tính': 0, 'Giảm giá': 0, 'Tổng tiền': 0, 'Trạng thái': '', 'Ngày': '', 'Thu ngân': '' } as any);
              rows.push({ 'Mã HĐ': 'TỔNG DOANH THU', 'Khách hàng': '', 'Loại': '', 'Thanh toán': '', 'Tạm tính': 0, 'Giảm giá': 0, 'Tổng tiền': totalRevenue, 'Trạng thái': '', 'Ngày': '', 'Thu ngân': '' } as any);
              exportToExcel(rows, `hoa-don-${format(new Date(), 'dd-MM-yyyy')}`, 'Hoá đơn');
              toast.success('Đã xuất file Excel!');
            }}>
              <Download size={14} /> Xuất Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="table-header">
                <th className="text-left p-3">Mã HĐ</th>
                <th className="text-left p-3 hidden sm:table-cell">Khách</th>
                <th className="text-right p-3">Tổng tiền</th>
                <th className="text-center p-3">Trạng thái</th>
                <th className="text-left p-3 hidden lg:table-cell">Ngày giờ</th>
                <th className="text-center p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((inv, i) => (
                <tr key={inv.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-[#FFFDF5]' : ''}`}>
                  <td className="p-3 font-medium text-gold cursor-pointer hover:underline" onClick={() => viewInvoice(inv)}>{inv.invoice_number}</td>
                  <td className="p-3 hidden sm:table-cell truncate max-w-[140px]">{inv.customer_name}</td>
                  <td className="p-3 text-right font-medium text-gold">{formatCurrency(inv.total)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${inv.status === 'completed' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {inv.status === 'completed' ? 'Hoàn thành' : 'Đã huỷ'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs">{formatDate(inv.created_at)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => viewInvoice(inv)} className="p-1.5 rounded hover:bg-accent text-gold" title="Xem"><Eye size={14} /></button>
                      <button onClick={() => openEdit(inv)} className="p-1.5 rounded hover:bg-accent text-info" title="Sửa"><Pencil size={14} /></button>
                      <button onClick={() => printFromList(inv)} className="p-1.5 rounded hover:bg-accent text-muted-foreground" title="In"><Printer size={14} /></button>
                      {inv.status === 'completed' && (
                        <button onClick={() => handleCancel(inv)} className="p-1.5 rounded hover:bg-accent text-danger" title="Huỷ"><XCircle size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex-shrink-0 p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gold">Tổng doanh thu: {formatCurrency(filtered.reduce((s, inv) => s + (inv.status === 'completed' ? Number(inv.total) : 0), 0))}</span>
            <span className="text-xs text-muted-foreground">{filtered.filter(i => i.status === 'completed').length} đơn hoàn thành</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Hiển thị {filtered.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} / {filtered.length} hoá đơn</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <Button key={pageNum} variant={page === pageNum ? 'default' : 'ghost'} size="sm"
                    className={page === pageNum ? 'bg-gold hover:bg-gold-dark text-primary-foreground' : ''}
                    onClick={() => setPage(pageNum)}>{pageNum}</Button>
                );
              })}
              <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></Button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* View Invoice Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl w-[65vw]">
          <DialogHeader>
            <DialogTitle>Chi tiết hoá đơn</DialogTitle>
            <DialogDescription>Hoá đơn {selectedInvoice?.invoice_number}</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4" ref={printRef}>
              <div className="text-center border-b border-border pb-3">
                <p className="text-2xl mb-1">🌾</p>
                <p className="font-bold">CUNG CẤP THỰC PHẨM SỈ VÀ LẺ</p>
                <p className="text-xs text-muted-foreground">Uy tín – Chất lượng – Giá tốt</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Mã HĐ:</span> <span className="font-medium">{selectedInvoice.invoice_number}</span></div>
                <div><span className="text-muted-foreground">Ngày:</span> {formatDate(selectedInvoice.created_at)}</div>
                <div><span className="text-muted-foreground">Khách:</span> {selectedInvoice.customer_name}</div>
                <div><span className="text-muted-foreground">Thanh toán:</span> {selectedInvoice.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="table-header"><th className="text-left p-2">Tên SP</th><th className="text-center p-2">SL</th><th className="text-center p-2">ĐVT</th><th className="text-right p-2">Đơn giá</th><th className="text-right p-2">Thành tiền</th></tr></thead>
                <tbody>
                  {invoiceItems.map((it, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-2">{it.product_name}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-center">{it.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                {selectedInvoice.discount_amount > 0 && <div className="flex justify-between text-danger"><span>Giảm giá</span><span>-{formatCurrency(selectedInvoice.discount_amount)}</span></div>}
                <div className="flex justify-between font-bold text-lg text-gold border-t border-border pt-2"><span>TỔNG CỘNG</span><span>{formatCurrency(selectedInvoice.total)}</span></div>
              </div>
              {selectedInvoice.note && <div className="text-sm text-muted-foreground">Ghi chú: {selectedInvoice.note}</div>}
              {customerInvoiceInfo && <div className="text-sm text-muted-foreground border-t border-border pt-2">Xuất hoá đơn: {customerInvoiceInfo}</div>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedInvoice(null)}>Đóng</Button>
                <Button className="flex-1 bg-gold hover:bg-gold-dark text-primary-foreground" onClick={() => handlePrint()}><Printer size={16} className="mr-1" />In hoá đơn</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hoá đơn</DialogTitle>
            <DialogDescription>Hoá đơn {editingInvoice?.invoice_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên khách hàng</Label><Input value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} /></div>
            <div>
              <Label>Trạng thái</Label>
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card">
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã huỷ</option>
              </select>
            </div>
            <div><Label>Giảm giá (VNĐ)</Label><Input type="number" value={editForm.discount_amount} onChange={e => setEditForm({ ...editForm, discount_amount: e.target.value })} /></div>
            <div><Label>Lý do giảm giá</Label><Input value={editForm.discount_reason} onChange={e => setEditForm({ ...editForm, discount_reason: e.target.value })} /></div>
            <div><Label>Ghi chú</Label><textarea value={editForm.note} onChange={e => setEditForm({ ...editForm, note: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card h-16 resize-none" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleEditSave}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template picker */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chọn mẫu in</DialogTitle>
            <DialogDescription>Chọn dạng hoá đơn muốn in</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {availableTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  if (templatePrintData) {
                    const html = renderTemplate(t.content, templatePrintData);
                    openPrintWindow(html);
                  }
                  setTemplatePickerOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${t.is_default ? 'border-gold bg-gold/5' : 'border-border'}`}
              >
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.paper_size} {t.is_default && '· Mặc định'}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
