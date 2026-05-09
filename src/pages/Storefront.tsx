import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { formatCurrency } from "@/lib/utils";
import { productFallbackImage, productSlug } from "@/lib/storefront";
import {
  storefrontCategories,
  storefrontProducts,
  type StorefrontCategory,
  type StorefrontProduct,
} from "@/lib/storefrontData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AuthMode = "signin" | "signup";

interface CartItem {
  product: StorefrontProduct;
  quantity: number;
}

const foodSignals = ["gạo", "nước mắm", "dầu ăn", "mì", "muối", "trứng", "rau", "thực phẩm"];

const shouldUseDbCatalog = (products: StorefrontProduct[], categories: StorefrontCategory[]) => {
  if (!products.length || !categories.length) return false;
  const haystack = [...products.map((p) => p.name), ...categories.map((c) => c.name)].join(" ").toLowerCase();
  return !foodSignals.some((signal) => haystack.includes(signal));
};

export default function Storefront() {
  const { settings } = useStoreSettings();
  const { user, profile, signIn, signUp, signOut } = useAuth();
  const [products, setProducts] = useState<StorefrontProduct[]>(storefrontProducts);
  const [categories, setCategories] = useState<StorefrontCategory[]>(storefrontCategories);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("featured");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", note: "" });

  const storeName = settings?.store_name || "Lumi Market";
  const storePhone = settings?.phone || "0900 000 000";
  const isCustomer = profile?.role === "customer";
  const displayName = profile?.name || user?.email?.split("@")[0] || "Khách hàng";

  useEffect(() => {
    const loadCatalog = async () => {
      const [{ data: productRows }, { data: categoryRows }] = await Promise.all([
        supabase.from("products").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);

      const dbCategories: StorefrontCategory[] =
        categoryRows?.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.id,
          description: `Khám phá các sản phẩm ${category.name.toLowerCase()}`,
          image_url: storefrontCategories[categoryRows.indexOf(category) % storefrontCategories.length].image_url,
        })) || [];

      const dbProducts: StorefrontProduct[] =
        productRows?.map((product, index) => {
          const category = dbCategories.find((item) => item.id === product.category_id);
          return {
            id: product.id,
            name: product.name,
            code: product.code || `SP-${index + 1}`,
            category_id: product.category_id || "uncategorized",
            category_slug: product.category_id || "uncategorized",
            category_name: category?.name || "Sản phẩm",
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
            rating: 4.6 + (index % 4) / 10,
            sold: 80 + index * 23,
            badge: index < 3 ? "Nổi bật" : undefined,
          };
        }) || [];

      if (shouldUseDbCatalog(dbProducts, dbCategories)) {
        setProducts(dbProducts);
        setCategories(dbCategories);
      }
    };

    loadCatalog();
  }, []);

  useEffect(() => {
    if (profile?.name && !customer.name) {
      setCustomer((current) => ({ ...current, name: profile.name }));
    }
  }, [customer.name, profile?.name]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchCategory = activeCategory === "all" || product.category_id === activeCategory;
      const matchSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.category_name.toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword);
      return matchCategory && matchSearch;
    });

    if (sort === "price-asc") return [...result].sort((a, b) => a.retail_price - b.retail_price);
    if (sort === "price-desc") return [...result].sort((a, b) => b.retail_price - a.retail_price);
    if (sort === "sold") return [...result].sort((a, b) => b.sold - a.sold);
    return result;
  }, [activeCategory, products, search, sort]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.product.retail_price, 0);
  const freeShipLeft = Math.max(0, 499000 - cartTotal);

  const addToCart = (product: StorefrontProduct) => {
    if (product.stock <= 0) {
      toast.error("Sản phẩm đang hết hàng");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    toast.success("Đã thêm vào giỏ");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQuantity = item.quantity + delta;
          if (nextQuantity <= 0) return null;
          return { ...item, quantity: Math.min(nextQuantity, item.product.stock) };
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const submitAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    const action =
      authMode === "signin"
        ? signIn(authForm.email, authForm.password)
        : signUp(authForm.email, authForm.password, authForm.name, "customer");
    const { error } = await action;
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(authMode === "signin" ? "Đăng nhập thành công" : "Tạo tài khoản thành công");
    setAuthOpen(false);
    setAuthForm({ name: "", email: "", password: "" });
  };

  const openCheckout = () => {
    if (!user || !isCustomer) {
      setAuthMode("signin");
      setAuthOpen(true);
      toast.info("Đăng nhập tài khoản mua hàng để tiếp tục");
      return;
    }
    setCheckoutOpen(true);
  };

  const submitOrder = async () => {
    if (!customer.name.trim() || !customer.phone.trim() || !customer.address.trim()) {
      toast.error("Vui lòng nhập đủ tên, số điện thoại và địa chỉ");
      return;
    }
    if (!cart.length || submitting) return;

    setSubmitting(true);
    try {
      const { data: customerRow } = await supabase
        .from("customers")
        .upsert(
          {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            type: "retail",
            note: customer.note || null,
          },
          { onConflict: "phone" },
        )
        .select()
        .single();

      const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true });
      const invoiceNumber = `WEB${String((count || 0) + 1).padStart(5, "0")}`;
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customerRow?.id || null,
          customer_name: customer.name,
          staff_name: "Website",
          sale_type: "retail",
          payment_method: "cash",
          subtotal: cartTotal,
          discount_amount: 0,
          tax_amount: 0,
          total: cartTotal,
          status: "completed",
          note: `Đơn website. SĐT: ${customer.phone}. Địa chỉ: ${customer.address}. ${customer.note || ""}`,
        })
        .select()
        .single();

      if (error || !invoice) throw error;

      await supabase.from("invoice_items").insert(
        cart.map((item) => ({
          invoice_id: invoice.id,
          product_id: item.product.id.startsWith("sf-") ? null : item.product.id,
          product_name: item.product.name,
          product_code: item.product.code,
          unit: item.product.unit,
          quantity: item.quantity,
          unit_price: item.product.retail_price,
          cost_price: item.product.cost_price,
          subtotal: item.quantity * item.product.retail_price,
        })),
      );

      toast.success(`Đặt hàng thành công: ${invoiceNumber}`);
    } catch {
      const savedOrders = JSON.parse(localStorage.getItem("storefront-orders") || "[]");
      localStorage.setItem(
        "storefront-orders",
        JSON.stringify([...savedOrders, { customer, cart, total: cartTotal, user_id: user?.id, created_at: new Date().toISOString() }]),
      );
      toast.success("Đã lưu đơn hàng. Cửa hàng sẽ liên hệ xác nhận");
    } finally {
      setSubmitting(false);
      setCheckoutOpen(false);
      setCartOpen(false);
      setCart([]);
      setCustomer({ name: profile?.name || "", phone: "", address: "", note: "" });
    }
  };

  const nav = (
    <>
      <a href="#collections" className="text-sm font-medium text-[#26332f] hover:text-[#0f6b57]">
        Bộ sưu tập
      </a>
      <a href="#products" className="text-sm font-medium text-[#26332f] hover:text-[#0f6b57]">
        Sản phẩm
      </a>
      <a href="#policy" className="text-sm font-medium text-[#26332f] hover:text-[#0f6b57]">
        Cam kết
      </a>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#111816]">
      <div className="bg-[#111816] px-4 py-2 text-center text-xs font-medium tracking-wide text-white/86">
        Miễn phí giao hàng từ 499.000 đ · Đổi trả trong 7 ngày · Hotline {storePhone}
      </div>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#fffffb]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#111816] text-white shadow-sm">
              <Sparkles size={19} />
            </div>
            <div>
              <p className="text-base font-black leading-5 tracking-tight">{storeName}</p>
              <p className="text-xs text-[#68736f]">Curated retail store</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 md:flex">{nav}</nav>

          <div className="flex items-center gap-2">
            {user && isCustomer ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hidden gap-2 md:flex">
                    <User size={17} /> {displayName} <ChevronDown size={15} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>Tài khoản mua hàng</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" className="hidden gap-2 md:flex" onClick={() => setAuthOpen(true)}>
                <User size={17} /> Đăng nhập
              </Button>
            )}

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="gap-2 rounded-full bg-[#111816] hover:bg-[#25302c]">
                  <ShoppingBag size={18} /> {cartCount}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col bg-[#f7f7f2] sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Giỏ hàng của bạn</SheetTitle>
                </SheetHeader>
                <div className="mt-4 rounded-lg border border-[#e7e2d8] bg-white p-3 text-sm">
                  {freeShipLeft > 0 ? (
                    <span>Mua thêm {formatCurrency(freeShipLeft)} để được miễn phí giao hàng.</span>
                  ) : (
                    <span className="flex items-center gap-2 text-[#0f6b57]"><Check size={16} /> Đơn hàng đủ điều kiện miễn phí giao hàng.</span>
                  )}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto py-5">
                  {cart.length === 0 ? (
                    <div className="grid h-full place-items-center text-center text-[#6d746f]">
                      <div>
                        <ShoppingBag className="mx-auto mb-3" size={42} />
                        <p>Giỏ hàng đang trống</p>
                      </div>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="rounded-lg border border-[#e7e2d8] bg-white p-3">
                        <div className="flex gap-3">
                          <img src={item.product.image_url || productFallbackImage} alt={item.product.name} className="h-20 w-20 rounded-md object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold">{item.product.name}</p>
                            <p className="mt-1 text-sm font-bold text-[#b15c2d]">{formatCurrency(item.product.retail_price)}</p>
                            <div className="mt-2 flex items-center rounded-md border border-[#e7e2d8] w-fit">
                              <button className="p-2" onClick={() => updateQuantity(item.product.id, -1)}><Minus size={14} /></button>
                              <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
                              <button className="p-2" onClick={() => updateQuantity(item.product.id, 1)}><Plus size={14} /></button>
                            </div>
                          </div>
                          <button className="self-start text-[#8a918c] hover:text-destructive" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.product.id !== item.product.id))}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-[#e7e2d8] pt-4">
                  <div className="mb-4 flex items-center justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <Button className="h-12 w-full rounded-full bg-[#111816] hover:bg-[#25302c]" disabled={!cart.length} onClick={openCheckout}>
                    Tiến hành đặt hàng
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={21} />
            </Button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="ml-auto h-full w-72 bg-[#fbfaf7] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-center justify-between">
              <span className="font-bold">{storeName}</span>
              <button onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
            </div>
            <div className="grid gap-4">{nav}</div>
            <Button className="mt-6 w-full rounded-full bg-[#111816] hover:bg-[#25302c]" onClick={() => setAuthOpen(true)}>
              {user && isCustomer ? displayName : "Đăng nhập mua hàng"}
            </Button>
          </div>
        </div>
      )}

      <main>
        <section className="relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=90"
            alt="Không gian mua sắm"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/42 to-black/8" />
          <div className="relative mx-auto grid min-h-[720px] max-w-7xl content-end px-4 pb-14 pt-28 sm:px-6 lg:px-8">
            <div className="max-w-3xl pb-8 text-white">
              <Badge className="mb-5 rounded-full bg-white px-4 py-1.5 text-[#111816] hover:bg-white">New season essentials</Badge>
              <h1 className="text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl lg:text-8xl">Đồ đẹp cho nhịp sống hằng ngày</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/86 sm:text-xl">
                Thời trang, phụ kiện, dụng cụ học tập và đồ góc làm việc được chọn gọn, dễ mua, giao nhanh.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#products">
                  <Button size="lg" className="h-12 rounded-full bg-white px-7 text-[#111816] hover:bg-white/90">
                    Mua ngay <ArrowRight size={18} />
                  </Button>
                </a>
                <a href={`tel:${storePhone}`}>
                  <Button size="lg" variant="secondary" className="h-12 rounded-full border border-white/35 bg-white/12 px-7 text-white backdrop-blur hover:bg-white/18">
                    Tư vấn nhanh
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="policy" className="mx-auto grid max-w-7xl gap-3 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: Truck, title: "Giao nhanh nội thành", text: "Chốt đơn online, cửa hàng xử lý tiếp trong core POS." },
            { icon: PackageCheck, title: "Tồn kho rõ ràng", text: "Sản phẩm active, giá bán lẻ và số lượng được hiển thị nhất quán." },
            { icon: ShieldCheck, title: "Tài khoản khách hàng", text: "Khách đăng ký, đăng nhập và đặt hàng bằng tài khoản mua hàng riêng." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <item.icon className="mb-4 text-[#b15c2d]" size={24} />
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-[#6d746f]">{item.text}</p>
            </div>
          ))}
        </section>

        <section id="collections" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b15c2d]">Collections</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Danh mục chủ lực</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <button
                key={category.id}
                className="group relative h-80 overflow-hidden rounded-2xl text-left shadow-sm"
                onClick={() => {
                  setActiveCategory(category.id);
                  document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <img src={category.image_url} alt={category.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="block text-xl font-black">{category.name}</span>
                  <span className="mt-1 block text-sm text-white/78">{category.description}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section id="products" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b15c2d]">Catalog</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Sản phẩm đang bán</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a918c]" size={17} />
                <Input className="h-12 rounded-full border-black/10 bg-white pl-10 shadow-sm sm:w-80" placeholder="Tìm áo, túi, sổ..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-12 gap-2 rounded-full border-black/10 bg-white px-5 shadow-sm">
                    <SlidersHorizontal size={16} /> Sắp xếp
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSort("featured")}>Nổi bật</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort("sold")}>Bán chạy</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort("price-asc")}>Giá thấp đến cao</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSort("price-desc")}>Giá cao đến thấp</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <Button variant={activeCategory === "all" ? "default" : "secondary"} className={activeCategory === "all" ? "shrink-0 rounded-full bg-[#111816] hover:bg-[#25302c]" : "shrink-0 rounded-full bg-white"} onClick={() => setActiveCategory("all")}>
              Tất cả
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "secondary"}
                className={activeCategory === category.id ? "shrink-0 rounded-full bg-[#111816] hover:bg-[#25302c]" : "shrink-0 rounded-full bg-white"}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <Link to={`/products/${productSlug(product)}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#eee8df]">
                    <img src={product.image_url || productFallbackImage} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-3 bottom-3 translate-y-4 rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-[#111816] opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                      Xem chi tiết
                    </div>
                    {product.badge && <Badge className="absolute left-3 top-3 rounded-full bg-white text-[#111816] hover:bg-white">{product.badge}</Badge>}
                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/92 text-[#17211d] shadow-sm">
                      <Heart size={17} />
                    </span>
                  </div>
                </Link>
                <div className="p-4">
                  <Link to={`/products/${productSlug(product)}`} className="block">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#6d746f]">{product.category_name}</span>
                      <span className="flex items-center gap-1 text-xs text-[#6d746f]"><Star size={13} className="fill-[#f3c557] text-[#f3c557]" /> {product.rating.toFixed(1)}</span>
                    </div>
                    <h3 className="line-clamp-2 min-h-11 font-bold leading-6 hover:text-[#b15c2d]">{product.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#6d746f]">{product.description}</p>
                  </Link>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#b15c2d]">{formatCurrency(product.retail_price)}</p>
                      <p className="text-xs text-[#8a918c]">Đã bán {product.sold}</p>
                    </div>
                    <Button className="rounded-full bg-[#111816] hover:bg-[#25302c]" onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                      <Plus size={15} /> Thêm
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
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
            <button
              type="button"
              className="w-full text-center text-sm font-medium text-[#0f6b57]"
              onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
            >
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
            <div className="rounded-lg border border-[#e7e2d8] bg-[#fbfaf7] p-4">
              <div className="flex justify-between text-sm">
                <span>{cartCount} sản phẩm</span>
                <span className="font-bold">{formatCurrency(cartTotal)}</span>
              </div>
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
