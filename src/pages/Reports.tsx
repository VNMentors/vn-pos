import { useState, useEffect, useMemo } from 'react';
import { subDays, startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, Download, Search } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function Reports() {
  const [fromDate, setFromDate] = useState<Date>(subDays(new Date(), 7));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Product report separate date range
  const [prodFrom, setProdFrom] = useState<Date>(subDays(new Date(), 7));
  const [prodTo, setProdTo] = useState<Date>(new Date());
  const [prodItems, setProdItems] = useState<any[]>([]);
  const [prodLoading, setProdLoading] = useState(true);
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategory, setProdCategory] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Profit by invoice date
  const [profitFrom, setProfitFrom] = useState<Date>(subDays(new Date(), 7));
  const [profitTo, setProfitTo] = useState<Date>(new Date());
  const [profitInvoices, setProfitInvoices] = useState<any[]>([]);
  const [profitItems, setProfitItems] = useState<any[]>([]);
  const [profitLoading, setProfitLoading] = useState(true);

  // Customer report
  const [custFrom, setCustFrom] = useState<Date>(subDays(new Date(), 7));
  const [custTo, setCustTo] = useState<Date>(new Date());
  const [custInvoices, setCustInvoices] = useState<any[]>([]);
  const [custLoading, setCustLoading] = useState(true);
  const [custSearch, setCustSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('products').select('id, name, code, category_id').neq('status', 'hidden'),
      supabase.from('customers').select('id, name, phone'),
    ]).then(([catRes, prodRes, custRes]) => {
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      setAllCustomers(custRes.data || []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const from = startOfDay(fromDate).toISOString();
    const to = endOfDay(toDate).toISOString();
    Promise.all([
      supabase.from('invoices').select('*').eq('status', 'completed').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false }),
      supabase.from('invoice_items').select('*, invoices!inner(status, created_at)').eq('invoices.status', 'completed').gte('invoices.created_at', from).lte('invoices.created_at', to),
    ]).then(([invRes, itemRes]) => {
      setInvoices(invRes.data || []);
      setInvoiceItems(itemRes.data || []);
      setLoading(false);
    });
  }, [fromDate, toDate]);

  useEffect(() => {
    setProdLoading(true);
    const from = startOfDay(prodFrom).toISOString();
    const to = endOfDay(prodTo).toISOString();
    supabase.from('invoice_items').select('*, invoices!inner(status, created_at)').eq('invoices.status', 'completed').gte('invoices.created_at', from).lte('invoices.created_at', to).then(({ data }) => {
      setProdItems(data || []);
      setProdLoading(false);
    });
  }, [prodFrom, prodTo]);

  useEffect(() => {
    setProfitLoading(true);
    const from = startOfDay(profitFrom).toISOString();
    const to = endOfDay(profitTo).toISOString();
    Promise.all([
      supabase.from('invoices').select('*').eq('status', 'completed').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false }),
      supabase.from('invoice_items').select('*, invoices!inner(status, created_at)').eq('invoices.status', 'completed').gte('invoices.created_at', from).lte('invoices.created_at', to),
    ]).then(([invRes, itemRes]) => {
      setProfitInvoices(invRes.data || []);
      setProfitItems(itemRes.data || []);
      setProfitLoading(false);
    });
  }, [profitFrom, profitTo]);

  useEffect(() => {
    setCustLoading(true);
    const from = startOfDay(custFrom).toISOString();
    const to = endOfDay(custTo).toISOString();
    supabase.from('invoices').select('*').eq('status', 'completed').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false })
      .then(({ data }) => { setCustInvoices(data || []); setCustLoading(false); });
  }, [custFrom, custTo]);

  const totalRev = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalSubtotal = invoices.reduce((s, i) => s + Number(i.subtotal), 0);
  const totalDiscount = invoices.reduce((s, i) => s + Number(i.discount_amount || 0), 0);
  const totalCost = invoiceItems.reduce((s, i) => s + Number(i.cost_price) * Number(i.quantity), 0);
  const totalProfit = totalRev - totalCost;

  // Product revenue aggregation with filters
  const productStats = useMemo(() => {
    const map: Record<string, { name: string; code: string; revenue: number; cost: number; qty: number; category_id: string }> = {};
    prodItems.forEach(item => {
      // Use product_id + product_name as key so variants show separately
      const key = (item.product_id || '') + '|' + item.product_name;
      if (!map[key]) {
        const prod = products.find(p => p.id === item.product_id);
        map[key] = { name: item.product_name, code: item.product_code || prod?.code || '', revenue: 0, cost: 0, qty: 0, category_id: prod?.category_id || '' };
      }
      map[key].revenue += Number(item.subtotal);
      map[key].cost += Number(item.cost_price) * Number(item.quantity);
      map[key].qty += Number(item.quantity);
    });
    let results = Object.values(map);
    // Filter by search
    if (prodSearch.trim()) {
      const q = prodSearch.toLowerCase();
      results = results.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    // Filter by category
    if (prodCategory !== 'all') {
      results = results.filter(p => p.category_id === prodCategory);
    }
    return results.sort((a, b) => b.revenue - a.revenue);
  }, [prodItems, prodSearch, prodCategory, products]);

  const top10 = productStats.slice(0, 10);

  const setQuickRange = (from: Date, to: Date) => { setProdFrom(from); setProdTo(to); };
  const setQuickProfitRange = (from: Date, to: Date) => { setProfitFrom(from); setProfitTo(to); };
  const setQuickCustRange = (from: Date, to: Date) => { setCustFrom(from); setCustTo(to); };

  // Customer stats aggregation
  const customerStats = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; orders: number }> = {};
    custInvoices.forEach(inv => {
      const key = inv.customer_id || inv.customer_name || 'Khách vãng lai';
      const name = inv.customer_name || 'Khách vãng lai';
      if (!map[key]) map[key] = { name, revenue: 0, orders: 0 };
      map[key].revenue += Number(inv.total);
      map[key].orders += 1;
    });
    let results = Object.values(map);
    if (custSearch.trim()) {
      const q = custSearch.toLowerCase();
      results = results.filter(c => c.name.toLowerCase().includes(q));
    }
    return results.sort((a, b) => b.revenue - a.revenue);
  }, [custInvoices, custSearch]);

  const custTotals = useMemo(() => customerStats.reduce((acc, c) => ({
    revenue: acc.revenue + c.revenue, orders: acc.orders + c.orders
  }), { revenue: 0, orders: 0 }), [customerStats]);

  // Profit by date aggregation
  const profitByDate = useMemo(() => {
    const dateMap: Record<string, { subtotal: number; discount: number; revenue: number; cost: number }> = {};
    profitInvoices.forEach(inv => {
      const dateKey = format(new Date(inv.created_at), 'dd/MM/yyyy');
      if (!dateMap[dateKey]) dateMap[dateKey] = { subtotal: 0, discount: 0, revenue: 0, cost: 0 };
      dateMap[dateKey].subtotal += Number(inv.subtotal);
      dateMap[dateKey].discount += Number(inv.discount_amount || 0);
      dateMap[dateKey].revenue += Number(inv.total);
    });
    profitItems.forEach(item => {
      const dateKey = format(new Date(item.invoices.created_at), 'dd/MM/yyyy');
      if (!dateMap[dateKey]) dateMap[dateKey] = { subtotal: 0, discount: 0, revenue: 0, cost: 0 };
      dateMap[dateKey].cost += Number(item.cost_price) * Number(item.quantity);
    });
    return Object.entries(dateMap)
      .map(([date, d]) => ({ date, ...d, profit: d.revenue - d.cost }))
      .sort((a, b) => {
        const [dA, mA, yA] = a.date.split('/').map(Number);
        const [dB, mB, yB] = b.date.split('/').map(Number);
        return new Date(yB, mB - 1, dB).getTime() - new Date(yA, mA - 1, dA).getTime();
      });
  }, [profitInvoices, profitItems]);

  const profitTotals = useMemo(() => profitByDate.reduce((acc, d) => ({
    subtotal: acc.subtotal + d.subtotal, discount: acc.discount + d.discount,
    revenue: acc.revenue + d.revenue, cost: acc.cost + d.cost, profit: acc.profit + d.profit
  }), { subtotal: 0, discount: 0, revenue: 0, cost: 0, profit: 0 }), [profitByDate]);

  const DateFilter = ({ from, to, setFrom, setTo }: { from: Date; to: Date; setFrom: (d: Date) => void; setTo: (d: Date) => void }) => (
    <div className="flex gap-2 items-center flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(from, 'dd/MM/yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={from} onSelect={(d) => d && setFrom(d)} className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-xs">→</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(to, 'dd/MM/yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={to} onSelect={(d) => d && setTo(d)} className={cn("p-3 pointer-events-auto")} />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Báo cáo</h1>
        <Button variant="outline" size="sm" className="gap-1.5 border-gold/30 text-gold hover:bg-gold-bg" onClick={() => {
          const overviewRows = [
            { 'Chỉ tiêu': 'Doanh thu', 'Giá trị': totalRev },
            { 'Chỉ tiêu': 'Giá vốn', 'Giá trị': totalCost },
            { 'Chỉ tiêu': 'Lợi nhuận', 'Giá trị': totalProfit },
            { 'Chỉ tiêu': 'Số đơn hàng', 'Giá trị': invoices.length },
            { 'Chỉ tiêu': 'Tổng giảm giá', 'Giá trị': totalDiscount },
            { 'Chỉ tiêu': 'Biên lợi nhuận (%)', 'Giá trị': totalRev > 0 ? Number(((totalProfit / totalRev) * 100).toFixed(1)) : 0 },
          ];
          const productRows = productStats.map(p => ({
            'Sản phẩm': p.name,
            'SL bán': p.qty,
            'Doanh thu': p.revenue,
            'Giá vốn': p.cost,
            'Lợi nhuận': p.revenue - p.cost,
          }));
          if (productRows.length > 0) {
            const totalProdRev = productStats.reduce((s, p) => s + p.revenue, 0);
            productRows.push({ 'Sản phẩm': 'TỔNG DOANH THU', 'SL bán': productStats.reduce((s, p) => s + p.qty, 0), 'Doanh thu': totalProdRev, 'Giá vốn': productStats.reduce((s, p) => s + p.cost, 0), 'Lợi nhuận': productStats.reduce((s, p) => s + p.revenue - p.cost, 0) });
          }
          // Export both sheets
          import('xlsx').then(XLSX => {
            const wb = XLSX.utils.book_new();
            const ws1 = XLSX.utils.json_to_sheet(overviewRows);
            XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
            if (productRows.length > 0) {
              const ws2 = XLSX.utils.json_to_sheet(productRows);
              XLSX.utils.book_append_sheet(wb, ws2, 'Theo sản phẩm');
            }
            XLSX.writeFile(wb, `bao-cao-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
          });
          toast.success('Đã xuất file Excel!');
        }}>
          <Download size={14} /> Xuất Excel
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="products">Theo sản phẩm</TabsTrigger>
          <TabsTrigger value="profit">Lợi nhuận theo hoá đơn</TabsTrigger>
          <TabsTrigger value="customers">Theo khách hàng</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <DateFilter from={fromDate} to={toDate} setFrom={setFromDate} setTo={setToDate} />

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Doanh thu', value: formatCurrency(totalRev) },
                  { label: 'Lợi nhuận', value: formatCurrency(totalProfit) },
                  { label: 'Số đơn hàng', value: String(invoices.length) },
                  { label: 'Tổng giảm giá', value: formatCurrency(totalDiscount) },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-lg font-bold text-gold">{s.value}</p>
                  </div>
                ))}
              </div>


              <div className="bg-card rounded-xl card-shadow p-4">
                <h2 className="font-semibold mb-4">Chi tiết</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Tổng đơn</span><span className="font-medium">{invoices.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Trung bình/đơn</span><span className="font-medium">{formatCurrency(invoices.length ? totalRev / invoices.length : 0)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Tổng giá vốn</span><span className="font-medium">{formatCurrency(totalCost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Biên lợi nhuận</span><span className="font-medium">{totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : 0}%</span></div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="bg-card rounded-xl card-shadow p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground mr-1">Thời gian:</span>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickRange(startOfDay(new Date()), new Date())}>Hôm nay</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickRange(subDays(new Date(), 6), new Date())}>7 ngày</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickRange(startOfMonth(new Date()), new Date())}>Tháng này</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { const prev = subMonths(new Date(), 1); setQuickRange(startOfMonth(prev), endOfMonth(prev)); }}>Tháng trước</Button>
              <DateFilter from={prodFrom} to={prodTo} setFrom={setProdFrom} setTo={setProdTo} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Tìm tên, mã hàng hoá..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="pl-8 w-52 h-8 text-xs" />
              </div>
              <select value={prodCategory} onChange={e => setProdCategory(e.target.value)} className="p-1.5 border border-border rounded-lg text-xs bg-card h-8">
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {prodLoading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : (
            <>
              {top10.length > 0 && (
                <div className="bg-card rounded-xl card-shadow p-4">
                  <h2 className="font-semibold mb-4">Top 10 sản phẩm theo doanh thu</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#B8860B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="bg-card rounded-xl card-shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Mã SP</th>
                        <th className="text-left p-3 font-medium">Sản phẩm</th>
                        <th className="text-right p-3 font-medium">SL bán</th>
                        <th className="text-right p-3 font-medium">Doanh thu</th>
                        <th className="text-right p-3 font-medium">Giá vốn</th>
                        <th className="text-right p-3 font-medium">Lợi nhuận</th>
                      </tr>
                     </thead>
                    <tbody>
                      {productStats.map((p, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-xs text-muted-foreground">{p.code || '—'}</td>
                          <td className="p-3">{p.name}</td>
                          <td className="p-3 text-right">{p.qty}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(p.revenue)}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(p.cost)}</td>
                          <td className="p-3 text-right font-medium text-gold">{formatCurrency(p.revenue - p.cost)}</td>
                        </tr>
                      ))}
                      {productStats.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có dữ liệu</td></tr>
                      )}
                    </tbody>
                    {productStats.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/50 font-semibold">
                          <td className="p-3" colSpan={2}>Tổng ({productStats.length} sản phẩm)</td>
                          <td className="p-3 text-right">{productStats.reduce((s, p) => s + p.qty, 0)}</td>
                          <td className="p-3 text-right">{formatCurrency(productStats.reduce((s, p) => s + p.revenue, 0))}</td>
                          <td className="p-3 text-right">{formatCurrency(productStats.reduce((s, p) => s + p.cost, 0))}</td>
                          <td className="p-3 text-right text-gold">{formatCurrency(productStats.reduce((s, p) => s + p.revenue - p.cost, 0))}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="profit" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="bg-card rounded-xl card-shadow p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground mr-1">Thời gian:</span>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickProfitRange(startOfDay(new Date()), new Date())}>Hôm nay</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickProfitRange(subDays(new Date(), 6), new Date())}>7 ngày</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickProfitRange(startOfMonth(new Date()), new Date())}>Tháng này</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { const prev = subMonths(new Date(), 1); setQuickProfitRange(startOfMonth(prev), endOfMonth(prev)); }}>Tháng trước</Button>
              <DateFilter from={profitFrom} to={profitTo} setFrom={setProfitFrom} setTo={setProfitTo} />
            </div>
          </div>

          {profitLoading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : (
            <div className="bg-card rounded-xl card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Thời gian</th>
                      <th className="text-right p-3 font-medium">Tổng tiền hàng</th>
                      <th className="text-right p-3 font-medium">Giảm giá</th>
                      <th className="text-right p-3 font-medium">Doanh thu</th>
                      <th className="text-right p-3 font-medium">Tổng giá vốn</th>
                      <th className="text-right p-3 font-medium">Lợi nhuận gộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Summary row */}
                    {profitByDate.length > 0 && (
                      <tr className="bg-gold/5 font-semibold border-b">
                        <td className="p-3">Tổng cộng</td>
                        <td className="p-3 text-right">{formatCurrency(profitTotals.subtotal)}</td>
                        <td className="p-3 text-right">{formatCurrency(profitTotals.discount)}</td>
                        <td className="p-3 text-right">{formatCurrency(profitTotals.revenue)}</td>
                        <td className="p-3 text-right">{formatCurrency(profitTotals.cost)}</td>
                        <td className="p-3 text-right text-gold">{formatCurrency(profitTotals.profit)}</td>
                      </tr>
                    )}
                    {profitByDate.map((d, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 text-gold font-medium">{d.date}</td>
                        <td className="p-3 text-right">{formatCurrency(d.subtotal)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.discount)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.revenue)}</td>
                        <td className="p-3 text-right">{formatCurrency(d.cost)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(d.profit)}</td>
                      </tr>
                    ))}
                    {profitByDate.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl card-shadow p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground mr-1">Thời gian:</span>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickCustRange(startOfDay(new Date()), new Date())}>Hôm nay</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickCustRange(subDays(new Date(), 6), new Date())}>7 ngày</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setQuickCustRange(startOfMonth(new Date()), new Date())}>Tháng này</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { const prev = subMonths(new Date(), 1); setQuickCustRange(startOfMonth(prev), endOfMonth(prev)); }}>Tháng trước</Button>
              <DateFilter from={custFrom} to={custTo} setFrom={setCustFrom} setTo={setCustTo} />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Tìm tên khách hàng..." value={custSearch} onChange={e => setCustSearch(e.target.value)} className="pl-8 w-52 h-8 text-xs" />
              </div>
            </div>
          </div>

          {custLoading ? (
            <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
          ) : (
            <div className="bg-card rounded-xl card-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Khách hàng</th>
                      <th className="text-right p-3 font-medium">Số đơn</th>
                      <th className="text-right p-3 font-medium">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerStats.length > 0 && (
                      <tr className="bg-gold/5 font-semibold border-b">
                        <td className="p-3">SL khách hàng: {customerStats.length}</td>
                        <td className="p-3 text-right">{custTotals.orders}</td>
                        <td className="p-3 text-right text-gold">{formatCurrency(custTotals.revenue)}</td>
                      </tr>
                    )}
                    {customerStats.map((c, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">{c.name}</td>
                        <td className="p-3 text-right">{c.orders}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(c.revenue)}</td>
                      </tr>
                    ))}
                    {customerStats.length === 0 && (
                      <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Chưa có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
