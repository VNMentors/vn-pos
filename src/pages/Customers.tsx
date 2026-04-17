import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string; name: string; phone: string; type: string; address: string;
  note: string; invoice_info: string; total_spent: number; total_orders: number; birthday: string | null;
}

const ITEMS_PER_PAGE = 50;

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ name: '', phone: '', type: 'retail', address: '', note: '', invoice_info: '', birthday: '' });

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').neq('status', 'hidden').order('created_at', { ascending: false });
    if (data) setCustomers(data as unknown as Customer[]);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { setPage(1); }, [search, filterType]);

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const openAdd = () => {
    setEditCustomer(null);
    setForm({ name: '', phone: '', type: 'retail', address: '', note: '', invoice_info: '', birthday: '' });
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone || '', type: c.type, address: c.address || '', note: c.note || '', invoice_info: c.invoice_info || '', birthday: c.birthday || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Vui lòng nhập tên và SĐT'); return; }
    const payload = { ...form, birthday: form.birthday || null, invoice_info: form.invoice_info || '' };
    if (editCustomer) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editCustomer.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('customers').insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    setModalOpen(false);
    toast.success(editCustomer ? 'Đã cập nhật khách hàng!' : 'Đã thêm khách hàng!');
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá khách hàng này?')) return;
    // Check if customer has any invoices
    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('customer_id', id);
    if (count && count > 0) {
      // Has invoices — just hide
      const { error } = await supabase.from('customers').update({ status: 'hidden' }).eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('Khách hàng đã được ẩn (đã phát sinh hoá đơn)');
    } else {
      // No invoices — delete from database
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('Đã xoá khách hàng');
    }
    fetchCustomers();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex-shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h1 className="text-xl font-bold">Khách hàng ({customers.length})</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm tên, SĐT..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
            </div>
            <Button variant="outline" size="sm" className="h-10 gap-1.5 border-gold/30 text-gold hover:bg-gold-bg" onClick={() => {
              const totalSpent = filtered.reduce((s, c) => s + Number(c.total_spent), 0);
              const rows = filtered.map(c => ({
                'Tên KH': c.name,
                'SĐT': c.phone,
                'Loại': c.type === 'wholesale' ? 'Sỉ' : 'Lẻ',
                'Tổng chi tiêu': Number(c.total_spent),
                'Số đơn': c.total_orders,
                'Địa chỉ': c.address || '',
                'Ghi chú': c.note || '',
              }));
              rows.push({ 'Tên KH': '', 'SĐT': '', 'Loại': '', 'Tổng chi tiêu': 0, 'Số đơn': 0, 'Địa chỉ': '', 'Ghi chú': '' } as any);
              rows.push({ 'Tên KH': 'TỔNG DOANH THU TỪ KHÁCH HÀNG', 'SĐT': '', 'Loại': '', 'Tổng chi tiêu': totalSpent, 'Số đơn': 0, 'Địa chỉ': '', 'Ghi chú': '' } as any);
              exportToExcel(rows, `khach-hang-${new Date().toISOString().slice(0,10)}`, 'Khách hàng');
              toast.success('Đã xuất file Excel!');
            }}>
              <Download size={14} /> Xuất Excel
            </Button>
            <Button onClick={openAdd} className="bg-gold hover:bg-gold-dark text-primary-foreground">
              <Plus size={16} className="mr-1" />Thêm KH
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="table-header">
                <th className="text-left p-3">Tên KH</th>
                <th className="text-left p-3 hidden sm:table-cell">SĐT</th>
                
                <th className="text-right p-3">Tổng chi tiêu</th>
                <th className="text-center p-3 hidden md:table-cell">Số đơn</th>
                <th className="text-center p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr key={c.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-[#FFFDF5]' : ''}`}>
                  <td className="p-3 font-medium text-gold cursor-pointer hover:underline" onClick={() => navigate(`/customers/${c.id}`)}>{c.name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{c.phone}</td>
                  <td className="p-3 text-right font-medium text-gold">{formatCurrency(c.total_spent)}</td>
                  <td className="p-3 text-center hidden md:table-cell">{c.total_orders}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate(`/customers/${c.id}`)} className="p-1.5 rounded hover:bg-accent text-info" title="Xem hoá đơn"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-accent text-gold" title="Sửa"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-accent text-danger" title="Xoá"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex-shrink-0 p-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>Hiển thị {filtered.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} / {filtered.length} khách hàng</span>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}</DialogTitle>
            <DialogDescription>Nhập thông tin khách hàng</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" /></div>
            <div><Label>Số điện thoại *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" /></div>
            <div><Label>Ngày sinh</Label><Input type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} /></div>
            <div><Label>Địa chỉ</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Địa chỉ (tuỳ chọn)" /></div>
            <div><Label>Ghi chú</Label><textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card h-16 resize-none" /></div>
            <div><Label>Xuất hoá đơn</Label><textarea value={form.invoice_info} onChange={e => setForm({ ...form, invoice_info: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card h-16 resize-none" placeholder="Thông tin xuất hoá đơn (tên công ty, MST...)" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleSave}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
