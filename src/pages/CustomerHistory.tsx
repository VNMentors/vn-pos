import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Invoice {
  id: string; invoice_number: string; created_at: string; total: number;
  subtotal: number; discount_amount: number; payment_method: string;
  sale_type: string; status: string; note: string; staff_name: string;
}
interface InvoiceItem {
  id: string; product_name: string; quantity: number; unit: string;
  unit_price: number; subtotal: number;
}
interface Customer {
  id: string; name: string; phone: string; type: string;
  total_spent: number; total_orders: number; address: string;
}

export default function CustomerHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const [{ data: c }, { data: inv }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('invoices').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
      ]);
      if (c) setCustomer(c as unknown as Customer);
      if (inv) setInvoices(inv as unknown as Invoice[]);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const viewInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) setInvoiceItems(data as unknown as InvoiceItem[]);
  };

  const handlePrint = () => {
    if (!selectedInvoice) return;
    const w = window.open('', '_blank', 'width=350,height=600');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:monospace;width:72mm;margin:0 auto;padding:4mm;font-size:12px}
      .center{text-align:center} .right{text-align:right} .bold{font-weight:bold}
      table{width:100%;border-collapse:collapse} td{padding:2px 0} .line{border-top:1px dashed #000;margin:4px 0}
    </style></head><body>
      <div class="center bold">${selectedInvoice.invoice_number}</div>
      <div class="center">${formatDate(selectedInvoice.created_at)}</div>
      <div class="center">KH: ${customer?.name || 'Khách sỉ'}</div>
      <div class="line"></div>
      <table>${invoiceItems.map(it => `<tr><td>${it.product_name} x${it.quantity}</td><td class="right">${formatCurrency(it.subtotal)}</td></tr>`).join('')}</table>
      <div class="line"></div>
      <div class="right bold">Tổng: ${formatCurrency(selectedInvoice.total)}</div>
      ${selectedInvoice.discount_amount > 0 ? `<div class="right">Giảm: -${formatCurrency(selectedInvoice.discount_amount)}</div>` : ''}
      <div class="center" style="margin-top:8px">Cảm ơn quý khách!</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;
  if (!customer) return <div className="text-center py-12 text-muted-foreground">Không tìm thấy khách hàng</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}><ArrowLeft size={16} className="mr-1" />Quay lại</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-lg font-bold">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
            {customer.address && <p className="text-sm text-muted-foreground mt-1">{customer.address}</p>}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-gold">{formatCurrency(customer.total_spent)}</p>
              <p className="text-xs text-muted-foreground">Tổng chi tiêu</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{customer.total_orders}</p>
              <p className="text-xs text-muted-foreground">Tổng đơn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="p-3 border-b border-border font-medium">Lịch sử hoá đơn ({invoices.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3">Mã HĐ</th>
                <th className="text-left p-3 hidden sm:table-cell">Ngày</th>
                <th className="text-right p-3">Tổng tiền</th>
                <th className="text-right p-3">Tổng tiền</th>
                <th className="text-center p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Chưa có hoá đơn nào</td></tr>
              )}
              {invoices.map((inv, i) => (
                <tr key={inv.id} onClick={() => viewInvoice(inv)}
                  className={`border-b border-border cursor-pointer hover:bg-gold/5 ${i % 2 === 1 ? 'bg-[#FFFDF5]' : ''}`}>
                  <td className="p-3 font-medium text-gold">{inv.invoice_number}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{formatDate(inv.created_at)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(inv.total)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${inv.status === 'completed' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {inv.status === 'completed' ? 'Hoàn thành' : 'Đã huỷ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice detail dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết hoá đơn {selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>{selectedInvoice && formatDate(selectedInvoice.created_at)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Sản phẩm</th>
                  <th className="text-center py-2">SL</th>
                  <th className="text-right py-2">Đơn giá</th>
                  <th className="text-right py-2">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map(it => (
                  <tr key={it.id} className="border-b border-border/50">
                    <td className="py-2">{it.product_name}</td>
                    <td className="py-2 text-center">{it.quantity} {it.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(it.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedInvoice && (
              <div className="border-t border-border pt-2 space-y-1 text-sm">
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between"><span>Giảm giá:</span><span className="text-danger">-{formatCurrency(selectedInvoice.discount_amount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Tổng cộng:</span><span className="text-gold">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-1" />In hoá đơn</Button>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
