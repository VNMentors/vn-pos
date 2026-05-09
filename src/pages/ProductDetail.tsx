import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronDown, LogOut, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { formatCurrency } from "@/lib/utils";
import { productFallbackImage, productSlug, slugify } from "@/lib/storefront";
import { storefrontCategories, storefrontProducts, type StorefrontProduct } from "@/lib/storefrontData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AuthMode = "signin" | "signup";

interface ProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  stock: number;
  retail_price: number;
  wholesale_price: number;
  cost_price: number;
  attributes: Record<string, string>;
}

function mapDbProduct(product: any, categoryName = "Sản phẩm", index = 0): StorefrontProduct {
  return {
    id: product.id,
    name: product.name,
    code: product.code || `SP-${index + 1}`,
    category_id: product.category_id || "uncategorized",
    category_slug: product.category_id || "uncategorized",
    category_name: categoryName,
    unit: product.unit || "cái",
    cost_price: Number(product.cost_price || 0),
    retail_price: Number(product.retail_price || 0),
    wholesale_price: Number(product.wholesale_price || product.retail_price || 0),
    stock: Number(product.stock || 0),
    min_stock: Number(product.min_stock || 0),
    image_url: product.image_url || storefrontProducts[index % storefrontProducts.length].image_url,
    gallery: [product.image_url || storefrontProducts[index % storefrontProducts.length].image_url],
    status: "active",
    description: product.description || "Sản phẩm đang có sẵn tại cửa hàng.",
    rating: 4.7,
    sold: 120 + index * 17,
    badge: index < 3 ? "Nổi bật" : undefined,
  };
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { settings } = useStoreSettings();
  const { user, profile, signIn, signUp, signOut } = useAuth();
  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [related, setRelated] = useState<StorefrontProduct[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });

  const storeName = settings?.store_name || "Lumi Market";
  const isCustomer = profile?.role === "customer";
  const displayName = profile?.name || user?.email?.split("@")[0] || "Khách hàng";
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const unitPrice = selectedVariant?.retail_price || product?.retail_price || 0;
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;
  const total = unitPrice * quantity;

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const fallback = storefrontProducts.find((item) => productSlug(item) === slug || item.id === slug);

      const { data: productRows } = await supabase.from("products").select("*").eq("status", "active");
      const dbProduct = productRows?.find((item) => productSlug(mapDbProduct(item)) === slug || slugify(item.code || "") === slug);
      if (dbProduct) {
        const [{ data: category }, { data: variantRows }, { data: relatedRows }] = await Promise.all([
          dbProduct.category_id ? supabase.from("categories").select("name").eq("id", dbProduct.category_id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from("product_variants").select("*").eq("product_id", dbProduct.id).eq("status", "active"),
          supabase.from("products").select("*").eq("status", "active").eq("category_id", dbProduct.category_id).neq("id", dbProduct.id).limit(4),
        ]);

        setProduct(mapDbProduct(dbProduct, category?.name || "Sản phẩm"));
        const nextVariants = (variantRows || []) as unknown as ProductVariant[];
        setVariants(nextVariants);
        setSelectedVariantId(nextVariants[0]?.id || "");
        setRelated((relatedRows || []).map((item, index) => mapDbProduct(item, category?.name || "Sản phẩm", index)));
        return;
      }

      if (fallback) {
        setProduct(fallback);
        setRelated(storefrontProducts.filter((item) => item.category_id === fallback.category_id && item.id !== fallback.id).slice(0, 4));
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    if (profile?.name && !customer.name) {
      setCustomer((current) => ({ ...current, name: profile.name }));
    }
  }, [customer.name, profile?.name]);

  const categoryImage = useMemo(() => {
    const category = storefrontCategories.find((item) => item.id === product?.category_id || item.name === product?.category_name);
    return category?.image_url || product?.image_url || productFallbackImage;
  }, [product]);
  const detailImages = [product?.image_url, categoryImage, product?.gallery?.[1]].filter(Boolean) as string[];

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } =
      authMode === "signin"
        ? await signIn(authForm.email, authForm.password)
        : await signUp(authForm.email, authForm.password, authForm.name, "customer");
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(authMode === "signin" ? "Đăng nhập thành công" : "Tạo tài khoản thành công");
    setAuthOpen(false);
  };

  const openCheckout = () => {
    if (!user || !isCustomer) {
      setAuthMode("signin");
      setAuthOpen(true);
      toast.info("Đăng nhập tài khoản mua hàng để đặt mua");
      return;
    }
    setCheckoutOpen(true);
  };

  const submitOrder = async () => {
    if (!product) return;
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      toast.error("Vui lòng nhập đủ tên, số điện thoại và địa chỉ");
      return;
    }

    setSubmitting(true);
    try {
      const { data: customerRow } = await supabase
        .from("customers")
        .upsert(
          { name: customer.name, phone: customer.phone, address: customer.address, type: "retail", note: customer.note || null },
          { onConflict: "phone" },
        )
        .select()
        .single();

      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
      const invoiceNumber = `WEB${String((count || 0) + 1).padStart(5, "0")}`;
      const productName = selectedVariant ? `${product.name} - ${selectedVariant.variant_name}` : product.name;
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customerRow?.id || null,
          customer_name: customer.name,
          staff_name: "Website",
          sale_type: "retail",
          payment_method: "cash",
          subtotal: total,
          discount_amount: 0,
          tax_amount: 0,
          total,
          status: "completed",
          note: `Đơn website. SĐT: ${customer.phone}. Địa chỉ: ${customer.address}. ${customer.note || ""}`,
        })
        .select()
        .single();

      if (error || !invoice) throw error;

      await supabase.from("invoice_items").insert({
        invoice_id: invoice.id,
        product_id: product.id.startsWith("sf-") ? null : product.id,
        product_name: productName,
        product_code: selectedVariant?.sku || product.code,
        unit: product.unit,
        quantity,
        unit_price: unitPrice,
        cost_price: selectedVariant?.cost_price || product.cost_price,
        subtotal: total,
      });

      toast.success(`Đặt hàng thành công: ${invoiceNumber}`);
      setCheckoutOpen(false);
      setQuantity(1);
    } catch {
      const savedOrders = JSON.parse(localStorage.getItem("storefront-orders") || "[]");
      localStorage.setItem(
        "storefront-orders",
        JSON.stringify([...savedOrders, { customer, product, variant: selectedVariant, quantity, total, user_id: user?.id, created_at: new Date().toISOString() }]),
      );
      toast.success("Đã lưu đơn hàng. Cửa hàng sẽ liên hệ xác nhận");
      setCheckoutOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] px-4 py-16 text-center">
        <p className="font-semibold">Không tìm thấy sản phẩm</p>
        <Link to="/" className="mt-3 inline-block text-[#0f6b57]">Về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#111816]">
      <div className="bg-[#111816] px-4 py-2 text-center text-xs font-medium tracking-wide text-white/86">
        Chi tiết sản phẩm · Giao nhanh · Đổi trả trong 7 ngày
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#fffdfa]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-[#111816]">
            <ArrowLeft size={18} /> Tiếp tục mua sắm
          </Link>
          <Link to="/" className="font-black tracking-tight">{storeName}</Link>
          {user && isCustomer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User size={17} /> {displayName} <ChevronDown size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>Tài khoản mua hàng</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" /> Đăng xuất</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="gap-2" onClick={() => setAuthOpen(true)}>
              <User size={17} /> Đăng nhập
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 text-sm text-[#6d746f]">
          <Link to="/" className="hover:text-[#0f6b57]">Trang chủ</Link>
          <span className="px-2">/</span>
          <span>{product.category_name}</span>
          <span className="px-2">/</span>
          <span className="text-[#17211d]">{product.name}</span>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_440px] xl:grid-cols-[minmax(0,1.18fr)_460px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
              <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-black/5">
                <img src={product.image_url || productFallbackImage} alt={product.name} className="aspect-[4/5] w-full object-cover lg:aspect-[4/5]" />
              </div>
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/5">
                  <img src={detailImages[1] || product.image_url || productFallbackImage} alt={product.category_name} className="aspect-square h-full w-full object-cover" />
                </div>
                <div className="rounded-[28px] bg-[#111816] p-6 text-white shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/58">Why we like it</p>
                  <p className="mt-5 text-2xl font-black leading-tight">Dễ phối, dễ dùng, đủ đẹp để trở thành món mặc định hằng ngày.</p>
                  <div className="mt-6 grid gap-3 text-sm text-white/76">
                    <span className="flex items-center gap-2"><Check size={16} /> Có sẵn tại cửa hàng</span>
                    <span className="flex items-center gap-2"><Check size={16} /> Kiểm hàng khi nhận</span>
                    <span className="flex items-center gap-2"><Check size={16} /> Hỗ trợ đổi trong 7 ngày</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ["Chất liệu", product.material || "Hoàn thiện tốt, dùng hằng ngày"],
                ["Mã sản phẩm", selectedVariant?.sku || product.code],
                ["Tồn kho", `${stock} ${product.unit}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a918c]">{label}</p>
                  <p className="mt-2 font-bold text-[#111816]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="self-start rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-8 lg:sticky lg:top-28">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[#111816] text-white hover:bg-[#111816]">{product.category_name}</Badge>
              <span className="flex items-center gap-1 text-sm text-[#6d746f]"><Star size={15} className="fill-[#f3c557] text-[#f3c557]" /> {product.rating.toFixed(1)} · Đã bán {product.sold}</span>
            </div>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">{product.name}</h1>
            <div className="mt-5 flex items-end justify-between gap-4 border-b border-black/10 pb-6">
              <p className="text-4xl font-black text-[#b15c2d]">{formatCurrency(unitPrice)}</p>
              <p className="rounded-full bg-[#f1efe8] px-3 py-1 text-xs font-bold text-[#4c5752]">Còn {stock}</p>
            </div>
            <p className="mt-6 text-base leading-8 text-[#5f6964]">{product.description}</p>

            {variants.length > 0 && (
              <div className="mt-7">
                <Label className="text-sm font-black uppercase tracking-[0.12em] text-[#68736f]">Chọn biến thể</Label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selectedVariantId === variant.id ? "border-[#111816] bg-[#111816] text-white" : "border-black/10 bg-white hover:border-[#111816]/40"}`}
                    >
                      <span className="block">{variant.variant_name}</span>
                      <span className={`mt-1 block text-xs ${selectedVariantId === variant.id ? "text-white/60" : "text-[#8a918c]"}`}>{variant.stock} còn lại</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7">
              <Label className="text-sm font-black uppercase tracking-[0.12em] text-[#68736f]">Số lượng</Label>
              <div className="mt-3 flex h-12 w-fit items-center rounded-full border border-black/10 bg-white">
                <button className="px-3" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button className="px-3" onClick={() => setQuantity((value) => Math.min(stock, value + 1))}><Plus size={16} /></button>
              </div>
            </div>

            <div className="mt-7 grid gap-3">
              <Button className="h-12 flex-1 rounded-full bg-[#111816] text-base hover:bg-[#25302c] sm:flex-none sm:px-10" disabled={stock <= 0} onClick={openCheckout}>
                Đặt mua ngay
              </Button>
              <a href={`tel:${settings?.phone || "0909888777"}`} className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white text-sm font-bold hover:bg-[#f7f7f2]">
                Tư vấn sản phẩm
              </a>
            </div>

            <div className="mt-7 divide-y divide-black/10 rounded-2xl bg-[#f1efe8] px-5 text-sm text-[#4c5752]">
              <div className="flex items-center gap-3 py-4"><Truck size={18} className="text-[#b15c2d]" /> Miễn phí giao hàng từ 499.000 đ</div>
              <div className="flex items-center gap-3 py-4"><ShieldCheck size={18} className="text-[#b15c2d]" /> Kiểm hàng khi nhận, đổi trong 7 ngày</div>
              <div className="flex items-center gap-3 py-4"><ShoppingBag size={18} className="text-[#b15c2d]" /> Thanh toán khi nhận hàng hoặc chuyển khoản</div>
            </div>
          </section>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-3xl font-black tracking-tight">Sản phẩm liên quan</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <Link key={item.id} to={`/products/${productSlug(item)}`} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl">
                  <img src={item.image_url || productFallbackImage} alt={item.name} className="aspect-[4/5] w-full object-cover" />
                  <div className="p-4">
                    <p className="line-clamp-2 font-bold">{item.name}</p>
                    <p className="mt-2 font-black text-[#b15c2d]">{formatCurrency(item.retail_price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authMode === "signin" ? "Đăng nhập mua hàng" : "Tạo tài khoản mua hàng"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitAuth}>
            {authMode === "signup" && (
              <div className="space-y-2">
                <Label>Họ tên</Label>
                <Input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input type="password" minLength={6} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required />
            </div>
            <Button className="h-11 w-full bg-[#0f6b57] hover:bg-[#0b5646]" type="submit">
              {authMode === "signin" ? "Đăng nhập" : "Đăng ký"}
            </Button>
            <button type="button" className="w-full text-center text-sm font-medium text-[#0f6b57]" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
              {authMode === "signin" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Thông tin giao hàng</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-lg border border-[#e7e2d8] bg-[#fbfaf7] p-3">
              <p className="font-semibold">{selectedVariant ? `${product.name} - ${selectedVariant.variant_name}` : product.name}</p>
              <p className="mt-1 text-sm text-[#6d746f]">{quantity} x {formatCurrency(unitPrice)}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Họ tên *</Label>
                <Input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại *</Label>
                <Input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Địa chỉ nhận hàng *</Label>
              <Input value={customer.address} onChange={(event) => setCustomer({ ...customer, address: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea rows={3} value={customer.note} onChange={(event) => setCustomer({ ...customer, note: event.target.value })} />
            </div>
            <div className="flex justify-between rounded-lg bg-[#fbfaf7] p-4 font-bold">
              <span>Tổng cộng</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <Button className="h-11 bg-[#0f6b57] hover:bg-[#0b5646]" disabled={submitting} onClick={submitOrder}>
              {submitting ? "Đang gửi đơn..." : "Xác nhận đặt hàng"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
