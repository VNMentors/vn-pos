import { useEffect, useState, useMemo, useCallback } from 'react';
import { DollarSign, RotateCcw, TrendingDown, TrendingUp, Printer, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';

interface Invoice {
  id: string; invoice_number: string; customer_name: string; staff_name: string;
  sale_type: string; payment_method: string; subtotal: number; discount_amount: number;
  total: number; status: string; created_at: string;
}
interface InvoiceItem { product_name: string; product_code: string; unit: string; quantity: number; unit_price: number; subtotal: number; cost_price: number; }
interface InvoiceWithItems extends Invoice { items?: InvoiceItem[]; }

type DateRange = 'today' | 'yesterday' | '7days' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  '7days': '7 ngày qua',
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  this_year: 'Năm nay',
  last_year: 'Năm trước',
};

function getDateRange(range: DateRange): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  switch (range) {
    case 'today': return { from: today, to: tomorrow };
    case 'yesterday': { const y = new Date(today); y.setDate(y.getDate() - 1); return { from: y, to: today }; }
    case '7days': { const d = new Date(today); d.setDate(d.getDate() - 6); return { from: d, to: tomorrow }; }
    case 'this_month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow };
    case 'last_month': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'this_year': return { from: new Date(now.getFullYear(), 0, 1), to: tomorrow };
    case 'last_year': return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear(), 0, 1) };
  }
}

const formatVN = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + ' k';
  return n.toLocaleString('vi-VN');
};

const DateRangeSelect = ({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) => (
  <select value={value} onChange={e => onChange(e.target.value as DateRange)} className="p-1.5 border border-border rounded-lg text-xs bg-card">
    {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
      <option key={key} value={key}>{label}</option>
    ))}
  </select>
);

export default function Dashboard() {
  // Stat cards range
  const [statRange, setStatRange] = useState<DateRange>('today');
  const [statInvoices, setStatInvoices] = useState<InvoiceWithItems[]>([]);
  const [prevRevenue, setPrevRevenue] = useState(0);

  // Chart range
  const [chartRange, setChartRange] = useState<DateRange>('today');
  const [chartInvoices, setChartInvoices] = useState<InvoiceWithItems[]>([]);
  const [chartTab, setChartTab] = useState<'day' | 'hour' | 'weekday'>('day');

  // Top products range
  const [prodRange, setProdRange] = useState<DateRange>('today');
  const [prodItems, setProdItems] = useState<(InvoiceItem & { invoice_id: string })[]>([]);

  // Top customers range
  const [custRange, setCustRange] = useState<DateRange>('this_month');
  const [custInvoices, setCustInvoices] = useState<any[]>([]);

  // Shared
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  // Load stat cards
  useEffect(() => {
    const load = async () => {
      const { from, to } = getDateRange(statRange);
      const duration = to.getTime() - from.getTime();
      const prevFrom = new Date(from.getTime() - duration);
      const [{ data: inv }, { data: prevInv }] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).order('created_at', { ascending: false }),
        supabase.from('invoices').select('total').gte('created_at', prevFrom.toISOString()).lt('created_at', from.toISOString()).eq('status', 'completed'),
      ]);
      setStatInvoices((inv || []) as unknown as InvoiceWithItems[]);
      setPrevRevenue((prevInv || []).reduce((s: number, i: any) => s + Number(i.total), 0));
    };
    load();
  }, [statRange]);

  // Load chart
  useEffect(() => {
    const load = async () => {
      const { from, to } = getDateRange(chartRange);
      const { data } = await supabase.from('invoices').select('*').gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).eq('status', 'completed').order('created_at', { ascending: false });
      setChartInvoices((data || []) as unknown as InvoiceWithItems[]);
    };
    load();
  }, [chartRange]);

  // Load top products
  useEffect(() => {
    const load = async () => {
      const { from, to } = getDateRange(prodRange);
      const { data: inv } = await supabase.from('invoices').select('id').gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).eq('status', 'completed');
      const ids = (inv || []).map((i: any) => i.id);
      if (ids.length > 0) {
        const { data: items } = await supabase.from('invoice_items').select('*').in('invoice_id', ids);
        setProdItems((items || []) as any);
      } else {
        setProdItems([]);
      }
    };
    load();
  }, [prodRange]);

  // Load top customers
  useEffect(() => {
    const load = async () => {
      const { from, to } = getDateRange(custRange);
      const { data } = await supabase.from('invoices').select('customer_name, customer_id, total').gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).eq('status', 'completed');
      setCustInvoices(data || []);
    };
    load();
  }, [custRange]);

  // Stat computations
  const completedStat = useMemo(() => statInvoices.filter(i => i.status === 'completed'), [statInvoices]);
  const revenue = useMemo(() => completedStat.reduce((s, i) => s + Number(i.total), 0), [completedStat]);
  const prevDiff = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;

  // Chart data
  const chartNetRevenue = useMemo(() => chartInvoices.reduce((s, i) => s + Number(i.total), 0), [chartInvoices]);
  const chartData = useMemo(() => {
    if (chartTab === 'hour') {
      const hours: { [h: number]: number } = {};
      chartInvoices.forEach(inv => { const h = new Date(inv.created_at).getHours(); hours[h] = (hours[h] || 0) + Number(inv.total); });
      return Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, value: hours[i] || 0 }));
    }
    if (chartTab === 'weekday') {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const map: { [d: number]: number } = {};
      chartInvoices.forEach(inv => { const d = new Date(inv.created_at).getDay(); map[d] = (map[d] || 0) + Number(inv.total); });
      return days.map((name, i) => ({ name, value: map[i] || 0 }));
    }
    const dayMap: { [d: string]: number } = {};
    chartInvoices.forEach(inv => {
      const d = new Date(inv.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      dayMap[d] = (dayMap[d] || 0) + Number(inv.total);
    });
    return Object.entries(dayMap).map(([name, value]) => ({ name, value }));
  }, [chartInvoices, chartTab]);

  // Top products
  const topProducts = useMemo(() => {
    const map: { [name: string]: number } = {};
    prodItems.forEach(it => { map[it.product_name] = (map[it.product_name] || 0) + Number(it.subtotal); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [prodItems]);

  // Top customers
  const topCustomers = useMemo(() => {
    const map: { [name: string]: number } = {};
    custInvoices.forEach((inv: any) => {
      const name = inv.customer_name || 'Khách sỉ';
      map[name] = (map[name] || 0) + Number(inv.total);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [custInvoices]);

  const viewInvoice = async (inv: InvoiceWithItems) => {
    setSelectedInvoice(inv);
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id);
    if (data) setInvoiceItems(data as unknown as InvoiceItem[]);
  };

  const handlePrint = () => {
    if (!selectedInvoice) return;
    const target = selectedInvoice;
    const itemsHtml = invoiceItems.map(it => `
      <tr><td style="padding:4px;border-bottom:1px solid #eee">${it.product_name}</td>
      <td style="padding:4px;text-align:center;border-bottom:1px solid #eee">${it.quantity}${it.unit}</td>
      <td style="padding:4px;text-align:right;border-bottom:1px solid #eee">${Number(it.unit_price).toLocaleString('vi-VN')}đ</td>
      <td style="padding:4px;text-align:right;border-bottom:1px solid #eee">${Number(it.subtotal).toLocaleString('vi-VN')}đ</td></tr>
    `).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hoá đơn ${target.invoice_number}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Be Vietnam Pro',sans-serif;font-size:13px;padding:10mm;max-width:80mm;margin:auto}
    .center{text-align:center}.bold{font-weight:bold}.mt{margin-top:8px}.mb{margin-bottom:8px}
    table{width:100%;border-collapse:collapse}th{text-align:left;padding:4px;border-bottom:2px solid #333;font-size:12px}
    .total{font-size:16px;font-weight:bold;border-top:2px solid #333;padding-top:6px;margin-top:6px}
    @media print{body{padding:0}@page{margin:5mm;size:80mm auto}}</style></head><body>
    <div class="center mb"><p style="font-size:16px" class="bold">CUNG CẤP THỰC PHẨM SỈ VÀ LẺ</p></div>
    <div class="center mb" style="border-bottom:1px dashed #999;padding-bottom:8px">
    <p class="bold" style="font-size:14px">HOÁ ĐƠN BÁN HÀNG</p>
    <p style="font-size:11px">Mã: ${target.invoice_number}</p></div>
    <div class="mt mb" style="font-size:12px">
    <p><b>Ngày:</b> ${formatDate(target.created_at)}</p>
    <p><b>Khách:</b> ${target.customer_name || 'Khách sỉ'}</p>
    <p><b>Thu ngân:</b> ${target.staff_name || ''}</p></div>
    <table><thead><tr><th>SP</th><th style="text-align:center">SL</th><th style="text-align:right">Giá</th><th style="text-align:right">TT</th></tr></thead>
    <tbody>${itemsHtml}</tbody></table>
    <div class="mt"><div style="display:flex;justify-content:space-between"><span>Tạm tính</span><span>${Number(target.subtotal).toLocaleString('vi-VN')}đ</span></div>
    ${target.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;color:red"><span>Giảm giá</span><span>-${Number(target.discount_amount).toLocaleString('vi-VN')}đ</span></div>` : ''}
    <div class="total" style="display:flex;justify-content:space-between"><span>TỔNG CỘNG</span><span>${Number(target.total).toLocaleString('vi-VN')}đ</span></div></div>
    <div class="center mt" style="font-size:11px;color:#666;border-top:1px dashed #999;padding-top:8px;margin-top:12px">
    <p>Cảm ơn quý khách!</p></div>
    <script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  const maxProduct = topProducts.length > 0 ? topProducts[0].value : 1;
  const maxCustomer = topCustomers.length > 0 ? topCustomers[0].value : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Tổng quan</h1>

      <div className="flex gap-4 flex-col xl:flex-row">
        <div className="flex-1 space-y-4 min-w-0">
          {/* Stat cards */}
          <div className="bg-card rounded-xl card-shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Kết quả bán hàng</h2>
              <DateRangeSelect value={statRange} onChange={setStatRange} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <DollarSign size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doanh thu</p>
                  <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
                  <p className="text-xs text-muted-foreground">{completedStat.length} hoá đơn</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                  <RotateCcw size={20} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trả hàng</p>
                  <p className="text-lg font-bold">0</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${prevDiff >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {prevDiff >= 0 ? <TrendingUp size={20} className="text-green-600" /> : <TrendingDown size={20} className="text-red-500" />}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">So với kỳ trước</p>
                  <p className={`text-lg font-bold ${prevDiff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {prevDiff >= 0 ? '+' : ''}{prevDiff.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(prevRevenue)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <DollarSign size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doanh thu thuần</p>
                  <p className="text-lg font-bold">{formatCurrency(revenue)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="bg-card rounded-xl card-shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">Doanh thu thuần</span>
                <span className="text-lg font-bold text-gold">{formatCurrency(chartNetRevenue)}</span>
              </div>
              <DateRangeSelect value={chartRange} onChange={setChartRange} />
            </div>
            <div className="flex gap-4 border-b border-border mb-4">
              {[['day', 'Theo ngày'], ['hour', 'Theo giờ'], ['weekday', 'Theo thứ']].map(([key, label]) => (
                <button key={key} onClick={() => setChartTab(key as any)} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${chartTab === key ? 'border-gold text-gold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatVN(v)} />
                  <ReTooltip formatter={(v: number) => [formatCurrency(v), 'Doanh thu']} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="value" fill="hsl(var(--gold, 43 74% 49%))" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl card-shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Top 10 hàng bán chạy</h3>
                <DateRangeSelect value={prodRange} onChange={setProdRange} />
              </div>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i}>
                      <p className="text-xs truncate mb-1">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-blue-500 rounded" style={{ width: `${(p.value / maxProduct) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-14 text-right shrink-0">{formatVN(p.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl card-shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Top 10 khách mua nhiều nhất</h3>
                <DateRangeSelect value={custRange} onChange={setCustRange} />
              </div>
              {topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((c, i) => (
                    <div key={i}>
                      <p className="text-xs truncate mb-1">{c.name}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-blue-500 rounded" style={{ width: `${(c.value / maxCustomer) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-14 text-right shrink-0">{formatVN(c.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="xl:w-[320px] shrink-0">
          <div className="bg-card rounded-xl card-shadow p-4">
            <h3 className="text-sm font-semibold mb-3">Hoạt động gần đây</h3>
            {statInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có hoạt động</p>
            ) : (
              <div className="space-y-0">
                {statInvoices.slice(0, 15).map((inv) => {
                  const timeAgo = getTimeAgo(inv.created_at);
                  return (
                    <button key={inv.id} onClick={() => viewInvoice(inv)} className="w-full flex items-start gap-3 py-3 border-b border-border/50 last:border-0 text-left hover:bg-accent/30 rounded-lg px-2 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                        <Package size={14} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium text-gold">{inv.staff_name || 'NV'}</span>
                          {' vừa '}
                          <span className="text-blue-600 font-medium">bán đơn hàng</span>
                          {' với giá trị '}
                          <span className="font-bold">{formatCurrency(inv.total)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết hoá đơn</DialogTitle>
            <DialogDescription>Hoá đơn {selectedInvoice?.invoice_number}</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Mã HĐ:</span> <span className="font-medium">{selectedInvoice.invoice_number}</span></div>
                <div><span className="text-muted-foreground">Ngày:</span> {formatDate(selectedInvoice.created_at)}</div>
                <div><span className="text-muted-foreground">Khách:</span> {selectedInvoice.customer_name}</div>
                <div><span className="text-muted-foreground">Thu ngân:</span> {selectedInvoice.staff_name}</div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="table-header"><th className="text-left p-2">Tên SP</th><th className="text-center p-2">SL</th><th className="text-right p-2">Đơn giá</th><th className="text-right p-2">Thành tiền</th></tr></thead>
                <tbody>
                  {invoiceItems.map((it, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-2">{it.product_name}</td>
                      <td className="p-2 text-center">{it.quantity}{it.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span>{formatCurrency(selectedInvoice.subtotal)}</span></div>
                {selectedInvoice.discount_amount > 0 && <div className="flex justify-between text-red-500"><span>Giảm giá</span><span>-{formatCurrency(selectedInvoice.discount_amount)}</span></div>}
                <div className="flex justify-between font-bold text-lg text-gold border-t border-border pt-2"><span>TỔNG CỘNG</span><span>{formatCurrency(selectedInvoice.total)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedInvoice(null)}>Đóng</Button>
                <Button className="flex-1 bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handlePrint}><Printer size={16} className="mr-1" />In hoá đơn</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
