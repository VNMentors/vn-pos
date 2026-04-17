import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shield, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  id: string; name: string; phone: string; email: string; role: string; shift: string; status: string;
}

interface Permission {
  id: string; profile_id: string; module: string;
  can_view: boolean; can_create: boolean; can_update: boolean; can_delete: boolean;
}

// Simplified: permissions = which sidebar modules staff can access
const MODULES = [
  { key: 'dashboard', label: 'Tổng quan', icon: '📊' },
  { key: 'pos', label: 'Bán hàng', icon: '🛒' },
  { key: 'products', label: 'Hàng hoá', icon: '📦' },
  { key: 'customers', label: 'Khách hàng', icon: '👥' },
  { key: 'invoices', label: 'Hoá đơn', icon: '📄' },
  { key: 'reports', label: 'Báo cáo', icon: '📈' },
  { key: 'settings', label: 'Cài đặt', icon: '⚙️' },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permStaff, setPermStaff] = useState<Profile | null>(null);
  const { profile } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', shift: 'Sáng' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', shift: '', status: 'active' });

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setStaff(data as unknown as Profile[]);
    setLoading(false);
  };

  useEffect(() => { fetchStaff(); }, []);

  const createStaffAccount = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: { email: form.email, password: form.password, name: form.name, role: 'staff', phone: form.phone, shift: form.shift },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || 'Lỗi tạo tài khoản');
        setCreating(false);
        return;
      }

      // Create default permissions: staff gets POS + dashboard access by default
      const newUserId = res.data?.user?.id;
      if (newUserId) {
        const defaultPerms = MODULES.map(m => ({
          profile_id: newUserId,
          module: m.key,
          can_view: m.key === 'pos' || m.key === 'dashboard',
          can_create: m.key === 'pos' || m.key === 'dashboard',
          can_update: m.key === 'pos' || m.key === 'dashboard',
          can_delete: false,
        }));
        await supabase.from('staff_permissions').insert(defaultPerms);
      }

      toast.success('Đã tạo tài khoản nhân viên!');
      setModalOpen(false);
      setForm({ email: '', password: '', name: '', phone: '', shift: 'Sáng' });
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const openEdit = (s: Profile) => {
    setEditingStaff(s);
    setEditForm({ name: s.name, phone: s.phone || '', shift: s.shift || '', status: s.status });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingStaff) return;
    const { error } = await supabase.from('profiles').update({
      name: editForm.name, phone: editForm.phone, shift: editForm.shift, status: editForm.status,
    }).eq('id', editingStaff.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã cập nhật nhân viên!');
    setEditModalOpen(false);
    fetchStaff();
  };

  const handleDelete = async (s: Profile) => {
    if (s.id === profile?.id) { toast.error('Không thể xoá chính mình'); return; }
    if (!confirm(`Bạn có chắc muốn xoá nhân viên "${s.name}"?`)) return;
    // Delete permissions first, then deactivate profile
    await supabase.from('staff_permissions').delete().eq('profile_id', s.id);
    const { error } = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', s.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã vô hiệu hoá nhân viên');
    fetchStaff();
  };

  const openPermissions = async (s: Profile) => {
    if (s.role === 'admin') {
      toast.info('Admin có toàn quyền, không cần phân quyền');
      return;
    }
    setPermStaff(s);
    const { data } = await supabase.from('staff_permissions').select('*').eq('profile_id', s.id);
    if (data && data.length > 0) {
      setPermissions(data as unknown as Permission[]);
    } else {
      // Default: staff can access POS + dashboard
      const defaultPerms = MODULES.map(m => ({
        id: '', profile_id: s.id, module: m.key,
        can_view: m.key === 'pos' || m.key === 'dashboard',
        can_create: m.key === 'pos' || m.key === 'dashboard',
        can_update: m.key === 'pos' || m.key === 'dashboard',
        can_delete: false,
      }));
      setPermissions(defaultPerms as Permission[]);
    }
    setPermModalOpen(true);
  };

  const toggleModuleAccess = (module: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.module !== module) return p;
      const newAccess = !p.can_view;
      return { ...p, can_view: newAccess, can_create: newAccess, can_update: newAccess, can_delete: false };
    }));
  };

  const savePermissions = async () => {
    if (!permStaff) return;
    await supabase.from('staff_permissions').delete().eq('profile_id', permStaff.id);
    const rows = permissions.map(p => ({
      profile_id: permStaff.id, module: p.module,
      can_view: p.can_view, can_create: p.can_create, can_update: p.can_update, can_delete: p.can_delete,
    }));
    const { error } = await supabase.from('staff_permissions').insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã lưu phân quyền!');
    setPermModalOpen(false);
  };

  const colors = ['bg-gold', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger'];

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nhân viên ({staff.length})</h1>
        <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" /> Thêm nhân viên
        </Button>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="p-3 text-left">Nhân viên</th>
              <th className="p-3 text-left hidden sm:table-cell">SĐT</th>
              <th className="p-3 text-left hidden md:table-cell">Email</th>
              <th className="p-3 text-center hidden lg:table-cell">Ca làm</th>
              <th className="p-3 text-center">Trạng thái</th>
              <th className="p-3 text-center">Thao tác</th>
            </tr></thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-accent/30' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-primary-foreground text-xs font-bold`}>{s.name?.charAt(0)?.toUpperCase() || '?'}</div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">{s.phone || '—'}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{s.email}</td>
                  <td className="p-3 text-center hidden lg:table-cell text-muted-foreground text-xs">{s.shift || '—'}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {s.status === 'active' ? 'Đang làm' : 'Tạm nghỉ'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {s.role !== 'admin' && (
                        <button onClick={() => openPermissions(s)} className="p-1.5 rounded hover:bg-accent text-info" title="Phân quyền"><Shield size={14} /></button>
                      )}
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-accent text-gold" title="Sửa"><Pencil size={14} /></button>
                      {s.id !== profile?.id && s.role !== 'admin' && (
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded hover:bg-accent text-danger" title="Xoá"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản nhân viên</DialogTitle>
            <DialogDescription>Nhập thông tin để tạo tài khoản mới</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" className="mt-1" /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nhanvien@thucpham.vn" className="mt-1" /></div>
            <div><Label>Mật khẩu *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" className="mt-1" /></div>
            <div><Label>Số điện thoại</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" className="mt-1" /></div>
            <div>
              <Label>Ca làm</Label>
              <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sáng">Sáng</SelectItem>
                  <SelectItem value="Chiều">Chiều</SelectItem>
                  <SelectItem value="Cả ngày">Cả ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-gold hover:bg-gold-dark text-primary-foreground" onClick={createStaffAccount} disabled={creating}>
              {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhân viên</DialogTitle>
            <DialogDescription>{editingStaff?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" /></div>
            <div><Label>Số điện thoại</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ca làm</Label>
                <Select value={editForm.shift} onValueChange={v => setEditForm({ ...editForm, shift: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sáng">Sáng</SelectItem>
                    <SelectItem value="Chiều">Chiều</SelectItem>
                    <SelectItem value="Cả ngày">Cả ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang làm</SelectItem>
                    <SelectItem value="inactive">Tạm nghỉ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleEditSave}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Phân quyền chức năng</DialogTitle>
            <DialogDescription>Nhân viên: {permStaff?.name} — Bật/tắt quyền truy cập từng module</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MODULES.map(m => {
              const perm = permissions.find(p => p.module === m.key);
              const hasAccess = perm?.can_view ?? false;
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModuleAccess(m.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${hasAccess ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m.icon}</span>
                    <span className="font-medium text-sm">{m.label}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hasAccess ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                    {hasAccess ? <Check size={14} /> : <X size={14} />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setPermModalOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={savePermissions}>Lưu phân quyền</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
