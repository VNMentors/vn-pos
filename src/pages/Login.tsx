import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    navigate("/admin/products");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1C1A14, #2C2820)" }}
    >
      <div className="w-full max-w-md bg-card rounded-2xl p-8 card-shadow">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gold text-2xl font-bold text-primary-foreground">
            POS
          </div>
          <h1 className="text-xl font-bold text-gold">Đăng nhập quản trị</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý bán hàng, kho, hoá đơn và báo cáo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@cuahang.com"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label>Mật khẩu</Label>
            <div className="relative mt-1">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gold hover:bg-gold-dark text-primary-foreground text-base font-semibold"
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </div>
  );
}
