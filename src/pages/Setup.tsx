import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function Setup() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });

  useEffect(() => {
    // Check if admin already exists
    supabase.from('profiles').select('id').eq('role', 'admin').limit(1).then(({ data }) => {
      if (data && data.length > 0) setHasAdmin(true);
      setChecking(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    const res = await supabase.functions.invoke('init-admin', {
      body: { name: form.name, email: form.email, password: form.password },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || 'Lỗi tạo tài khoản');
      setLoading(false);
      return;
    }
    toast.success('Tạo tài khoản admin thành công! Đang chuyển đến trang đăng nhập...');
    setTimeout(() => navigate('/login'), 1500);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-3 max-w-sm">
          <ShieldCheck size={48} className="mx-auto text-gold" />
          <h1 className="text-lg font-bold">Hệ thống đã được thiết lập</h1>
          <p className="text-sm text-muted-foreground">Trang này chỉ dùng để tạo tài khoản admin lần đầu. Vui lòng đăng nhập.</p>
          <Button className="bg-gold hover:bg-gold-dark text-primary-foreground w-full" onClick={() => navigate('/login')}>
            Đến trang đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <ShieldCheck size={40} className="mx-auto text-gold" />
          <h1 className="text-xl font-bold">Thiết lập hệ thống</h1>
          <p className="text-sm text-muted-foreground">Tạo tài khoản admin để bắt đầu sử dụng</p>
        </div>

        <div className="bg-card rounded-xl card-shadow p-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Họ tên</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email đăng nhập</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="admin@cuahang.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mật khẩu</Label>
            <Input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Tối thiểu 6 ký tự"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Xác nhận mật khẩu</Label>
            <Input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              placeholder="Nhập lại mật khẩu"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <Button
            className="w-full bg-gold hover:bg-gold-dark text-primary-foreground"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Đang tạo...</> : 'Tạo tài khoản admin'}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Trang này tự động bị khoá sau khi tạo admin thành công
        </p>
      </div>
    </div>
  );
}
