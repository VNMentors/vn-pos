import { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  FileText,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";

const allNavItems = [
  { icon: Home, label: "Tổng quan", path: "/", moduleKey: "dashboard" },
  { icon: ShoppingCart, label: "Bán hàng", path: "/pos", moduleKey: "pos" },
  { icon: Package, label: "Hàng hoá", path: "/products", moduleKey: "products" },
  { icon: Users, label: "Khách hàng", path: "/customers", moduleKey: "customers" },
  { icon: FileText, label: "Hoá đơn", path: "/invoices", moduleKey: "invoices" },
  { icon: UserCog, label: "Nhân viên", path: "/staff", moduleKey: "staff" },
  { icon: BarChart3, label: "Báo cáo", path: "/reports", moduleKey: "reports" },
  { icon: Settings, label: "Cài đặt", path: "/settings", moduleKey: "settings" },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings: storeSettings } = useStoreSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [permsLoaded, setPermsLoaded] = useState(false);

  // Fetch staff permissions
  useEffect(() => {
    if (!profile) return;
    if (profile.role === "admin") {
      setAllowedModules(allNavItems.map((n) => n.moduleKey));
      setPermsLoaded(true);
      return;
    }
    // Staff: fetch permissions
    supabase
      .from("staff_permissions")
      .select("module, can_view")
      .eq("profile_id", profile.id)
      .then(({ data }) => {
        const allowed = (data || []).filter((p) => p.can_view).map((p) => p.module);
        setAllowedModules(allowed);
        setPermsLoaded(true);
      });
  }, [profile]);

  const navItems = permsLoaded ? allNavItems.filter((n) => allowedModules.includes(n.moduleKey)) : [];
  const mobileNav = navItems.slice(0, 4);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentPage = allNavItems.find((n) => n.path === location.pathname)?.label || "Tổng quan";
  const displayName = profile?.name || "User";
  const logo = storeSettings?.logo_url || "";
  const displayNameStore = storeSettings?.store_name ?? "Cập nhật tên cửa hàng";
  const displayRole = profile?.role === "admin" ? "Admin" : "Nhân viên";
  const avatar = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-60 bg-sidebar z-40">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gold-light">{displayNameStore}</span>
          </div>
        </div>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-primary-foreground font-semibold text-sm">
              {avatar}
            </div>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground">{displayName}</p>
              <p className="text-xs text-sidebar-muted">{displayRole}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-gold text-primary-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-danger hover:bg-sidebar-accent transition-colors w-full"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-6 h-6 inline-block" />
                ) : (
                  <span className="text-2xl">🌾</span>
                )}
                <span className="text-base font-bold text-gold-light">{displayNameStore}</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-gold text-primary-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen overflow-x-hidden">
        <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="text-sm text-muted-foreground">{currentPage}</div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{clock.toLocaleTimeString("vi-VN")}</span>
            <span className="font-medium text-foreground">{displayName}</span>
          </div>
        </header>

        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-sm">{currentPage}</span>
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-primary-foreground text-xs font-semibold">
            {avatar}
          </div>
        </header>

        <main
          className={`flex-1 pb-20 lg:pb-6 overflow-x-hidden ${location.pathname === "/pos" ? "p-0 lg:p-0" : "p-4 lg:p-6"}`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
        {mobileNav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] ${active ? "text-gold font-medium" : "text-muted-foreground"}`}
            >
              <item.icon size={20} />
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex-1 flex flex-col items-center py-2 text-[10px] ${moreOpen ? "text-gold font-medium" : "text-muted-foreground"}`}
        >
          <MoreHorizontal size={20} />
          <span className="mt-0.5">Thêm</span>
        </button>
      </div>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-card rounded-t-2xl border-t border-border p-4 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.slice(4).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-accent"
              >
                <item.icon size={18} className="text-gold" />
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={() => {
                setMoreOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-danger w-full"
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
