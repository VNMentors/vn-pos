import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StoreSettingsProvider } from "@/hooks/useStoreSettings";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import CustomerHistory from "@/pages/CustomerHistory";
import Invoices from "@/pages/Invoices";
import StaffPage from "@/pages/Staff";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import NotFound from "@/pages/NotFound";
import Storefront from "@/pages/Storefront";
import ProductDetail from "@/pages/ProductDetail";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gold text-lg">Đang tải...</div></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center"><div className="text-gold text-lg">Đang tải hồ sơ...</div></div>;
  if (profile.role === "customer") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/products/:slug" element={<ProductDetail />} />
      <Route path="/shop" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/setup" element={<Navigate to="/admin/setup" replace />} />
      <Route path="/admin/login" element={!loading && user ? <Navigate to="/admin" replace /> : <Login />} />
      <Route path="/admin/setup" element={<Setup />} />
      <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pos" element={<POS />} />
        <Route path="products" element={<Products />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerHistory />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <AuthProvider>
        <StoreSettingsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </StoreSettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
