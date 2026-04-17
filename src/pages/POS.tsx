import { useState, useMemo, useEffect, useDeferredValue, useRef, useCallback } from 'react';
import { Minus, Plus, X, Trash2, CheckCircle, Loader2, UserPlus, Search, ChevronLeft, ChevronRight, Edit3, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getTemplates, renderTemplate, openPrintWindow, type PrintData } from '@/lib/printTemplates';
import { useStoreSettings } from '@/hooks/useStoreSettings';

interface Product {
  id: string; name: string; code: string; category_id: string; unit: string;
  retail_price: number; wholesale_price: number; stock: number; status: string; cost_price: number;
  image_url: string | null;
}
interface ProductVariant {
  id: string; product_id: string; variant_name: string; sku: string;
  attributes: Record<string, string>;
  stock: number; cost_price: number; retail_price: number; wholesale_price: number;
}
interface Category { id: string; name: string; }
interface Customer { id: string; name: string; phone: string; type: string; points: number; address: string; }
interface CartItem { product: Product; variant?: ProductVariant; quantity: number; unitPrice: number; note: string; }

const parseCurrencyInput = (value: string) => Number(value.replace(/\D/g, '') || '0');
const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

const PRODUCTS_PER_PAGE = 18;

export default function POS() {
  const { user, profile } = useAuth();
  const { settings: storeSettings } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'retail' | 'wholesale'>('retail');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');
  const [expandedCartItem, setExpandedCartItem] = useState<string | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const customerSearchInputRef = useRef<HTMLInputElement>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', type: 'retail', address: '', note: '' });
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePrintData, setTemplatePrintData] = useState<PrintData | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<{ id: string; name: string; paper_size: string; content: string; is_default: boolean }[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariant[]>>({});
  const [showVariantPicker, setShowVariantPicker] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);


  const deferredSearch = useDeferredValue(search);
  const deferredCustomerSearch = useDeferredValue(customerSearch);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        productSearchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: c }, { data: cu }, { data: v }] = await Promise.all([
        supabase.from('products').select('*').eq('status', 'active').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('product_variants').select('*'),
      ]);
      if (p) setProducts(p as unknown as Product[]);
      if (c) setCategories(c as unknown as Category[]);
      if (cu) setCustomers(cu as unknown as Customer[]);
      if (v) {
        const variantsByProduct: Record<string, ProductVariant[]> = {};
        (v as unknown as ProductVariant[]).forEach(variant => {
          if (!variantsByProduct[variant.product_id]) {
            variantsByProduct[variant.product_id] = [];
          }
          variantsByProduct[variant.product_id].push(variant);
        });
        setProductVariants(variantsByProduct);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDropdown(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) {
      return products.filter((p) => activeCategory === 'all' || p.category_id === activeCategory);
    }

    return products.filter((p) => {
      const matchCategory = activeCategory === 'all' || p.category_id === activeCategory;
      if (!matchCategory) return false;

      // Search in product name, code
      const matchProduct = p.name.toLowerCase().includes(keyword) || p.code?.toLowerCase().includes(keyword);
      if (matchProduct) return true;

      // Search in variant names
      const variants = productVariants[p.id] || [];
      const matchVariant = variants.some((v) => v.variant_name.toLowerCase().includes(keyword) || v.sku?.toLowerCase().includes(keyword));
      return matchVariant;
    });
  }, [deferredSearch, activeCategory, products, productVariants]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [deferredSearch, activeCategory]);

  const filteredCustomers = useMemo(() => {
    const keyword = deferredCustomerSearch.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(keyword) || c.phone?.toLowerCase().includes(keyword));
  }, [deferredCustomerSearch, customers]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    const stock = variant ? variant.stock : product.stock;
    if (stock <= 0) return;
    const price = variant ? variant.retail_price : (saleType === 'wholesale' ? product.wholesale_price : product.retail_price);

    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id && (!variant || c.variant?.id === variant.id));
      if (existing) return prev.map((c) => c.product.id === product.id && (!variant || c.variant?.id === variant.id) ? { ...c, quantity: c.quantity + 1, unitPrice: price } : c);
      return [...prev, { product, variant, quantity: 1, unitPrice: price, note: '' }];
    });
  };

  const handleAddProductClick = (product: Product) => {
    const variants = productVariants[product.id];
    if (variants && variants.length > 0) {
      setSelectedProductForVariant(product);
      setShowVariantPicker(true);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (productId: string, variantId: string | undefined, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product.id === productId && (!variantId || c.variant?.id === variantId)) {
        const newQty = Math.round((c.quantity + delta) * 1000) / 1000;
        return newQty <= 0 ? null! : { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const setQuantity = (productId: string, variantId: string | undefined, qty: number) => {
    if (qty <= 0) { removeFromCart(productId, variantId); return; }
    setCart((prev) => prev.map((c) => c.product.id === productId && (!variantId || c.variant?.id === variantId) ? { ...c, quantity: qty } : c));
  };

  const setUnitPrice = (productId: string, variantId: string | undefined, price: number) => {
    if (price < 0) return;
    setCart((prev) => prev.map((c) => c.product.id === productId && (!variantId || c.variant?.id === variantId) ? { ...c, unitPrice: price } : c));
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((prev) => prev.filter((c) => !(c.product.id === productId && (!variantId || c.variant?.id === variantId))));
  };

  const discountAmount = parseCurrencyInput(discountInput);
  const cashReceived = parseCurrencyInput(cashReceivedInput);
  const subtotal = cart.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0);
  const total = Math.max(0, subtotal - discountAmount);
  const change = paymentMethod === 'cash' ? cashReceived - total : 0;
  const customer = customers.find((c) => c.id === selectedCustomer);
  const cartCount = (productId: string) => cart.find((c) => c.product.id === productId)?.quantity || 0;

  const resetCheckoutState = () => {
    setCart([]);
    setDiscountInput('');
    setCashReceivedInput('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setOrderNote('');
    
  };

  const refreshProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('status', 'active').order('name');
    if (data) setProducts(data as unknown as Product[]);
  };

  const printInvoice = async (invNum: string, items: any[], summary: { subtotal: number; discountAmount: number; total: number; cashReceived: number; change: number }) => {
    const data: PrintData = {
      invoiceNumber: invNum,
      date: new Date().toLocaleString('vi-VN'),
      customerName: customer?.name || 'Khách sỉ',
      customerPhone: customer?.phone || '',
      customerAddress: customer?.address || '',
      staffName: profile?.name || '',
      saleType,
      paymentMethod,
      items: items.map(it => ({ product_name: it.product_name, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, subtotal: it.subtotal, note: (it as any).note || '' })),
      subtotal: summary.subtotal,
      discountAmount: summary.discountAmount,
      total: summary.total,
      cashReceived: summary.cashReceived,
      change: summary.change,
      storeName: storeSettings?.store_name,
      storeAddress: storeSettings?.address,
      storePhone: storeSettings?.phone,
      invoiceFooter: storeSettings?.invoice_footer,
      logoUrl: storeSettings?.logo_url,
    };

    const templates = await getTemplates();
    const defaultTpl = templates.find(t => t.is_default) || templates[0];

    if (templates.length > 1) {
      setTemplatePrintData(data);
      setAvailableTemplates(templates);
      setTemplatePickerOpen(true);
    } else if (defaultTpl) {
      const html = renderTemplate(defaultTpl.content, data);
      openPrintWindow(html);
    }
  };

  const handleCheckout = async (shouldPrint = false) => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);

    try {
      const checkoutSubtotal = subtotal;
      const checkoutDiscount = discountAmount;
      const checkoutTotal = total;
      const checkoutCash = cashReceived;
      const checkoutChange = change;

      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const invNum = `HD${String((count || 0) + 1).padStart(5, '0')}`;

      const { data: inv, error } = await supabase.from('invoices').insert({
        invoice_number: invNum,
        customer_id: selectedCustomer || null,
        staff_id: user?.id || null,
        customer_name: customer?.name || 'Khách sỉ',
        staff_name: profile?.name || '',
        sale_type: saleType,
        payment_method: paymentMethod,
        subtotal: checkoutSubtotal,
        discount_amount: checkoutDiscount,
        tax_amount: 0,
        total: checkoutTotal,
        cash_received: paymentMethod === 'cash' ? checkoutCash : null,
        change_amount: paymentMethod === 'cash' ? Math.max(0, checkoutChange) : null,
        status: 'completed',
        note: orderNote || null,
      }).select().single();

      if (error || !inv) {
        toast.error(error?.message || 'Lỗi tạo hoá đơn');
        return;
      }

      const items = cart.map((c) => ({
        invoice_id: (inv as any).id,
        product_id: c.product.id,
        product_name: c.variant ? `${c.product.name} - ${c.variant.variant_name}` : c.product.name,
        product_code: c.product.code,
        unit: c.product.unit,
        quantity: c.quantity,
        cost_price: c.variant ? c.variant.cost_price : c.product.cost_price,
        unit_price: c.unitPrice,
        subtotal: c.quantity * c.unitPrice,
      }));
      const printItems = cart.map((c) => ({
        product_name: c.variant ? `${c.product.name} - ${c.variant.variant_name}` : c.product.name,
        quantity: c.quantity,
        unit: c.product.unit,
        unit_price: c.unitPrice,
        subtotal: c.quantity * c.unitPrice,
        note: c.note,
      }));

      await supabase.from('invoice_items').insert(items);

      // Update product stock
      await Promise.all(cart.map((c) => {
        if (c.variant) {
          // Update variant stock
          return supabase.from('product_variants').update({ stock: c.variant.stock - c.quantity }).eq('id', c.variant.id);
        } else {
          // Update product stock
          return supabase.from('products').update({ stock: c.product.stock - c.quantity }).eq('id', c.product.id);
        }
      }));

      if (shouldPrint) {
        printInvoice(invNum, printItems, {
          subtotal: checkoutSubtotal,
          discountAmount: checkoutDiscount,
          total: checkoutTotal,
          cashReceived: checkoutCash,
          change: checkoutChange,
        });
      }

      setShowSuccess(true);
      toast.success(`Thanh toán thành công! Mã HĐ: #${invNum}`);

      setTimeout(() => {
        setShowSuccess(false);
        resetCheckoutState();
        refreshProducts();
      }, 2000);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const toggleSaleType = (type: 'retail' | 'wholesale') => {
    setSaleType(type);
    setCart((prev) => prev.map((c) => {
      const price = c.variant ? (type === 'wholesale' ? c.variant.wholesale_price : c.variant.retail_price) : (type === 'wholesale' ? c.product.wholesale_price : c.product.retail_price);
      return { ...c, unitPrice: price };
    }));
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c.id);
    setCustomerSearch(c.name + (c.phone ? ` (${c.phone})` : ''));
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  const handleAddCustomer = async () => {
    if (!newCustomerForm.name || !newCustomerForm.phone) {
      toast.error('Vui lòng nhập tên và SĐT');
      return;
    }
    const { data, error } = await supabase.from('customers').insert({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      type: newCustomerForm.type,
      address: newCustomerForm.address || null,
      note: newCustomerForm.note || null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      const newCust = data as unknown as Customer;
      setCustomers(prev => [newCust, ...prev]);
      selectCustomer(newCust);
    }
    setAddCustomerOpen(false);
    setNewCustomerForm({ name: '', phone: '', type: 'retail', address: '', note: '' });
    toast.success('Đã thêm khách hàng!');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] lg:h-[calc(100vh-60px)] overflow-hidden w-full max-w-full">

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden w-full max-w-full">
        {/* LEFT - Cart/Order panel */}
        <div className="flex flex-col border-r border-border bg-card lg:w-[45%] xl:w-[40%] w-full min-w-0">
          {/* Customer search - both mobile and desktop */}
          <div className="border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="relative flex-1" ref={customerRef}>
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={customerSearchInputRef}
                  placeholder="Tìm khách hàng (F4)"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="pl-8 h-9 text-sm pr-8"
                />
                {selectedCustomer && (
                  <button onClick={clearCustomer} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                )}
                {showCustomerDropdown && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                    <button onClick={() => { clearCustomer(); setShowCustomerDropdown(false); }} className="w-full border-b border-border px-3 py-2 text-left text-sm hover:bg-accent">
                      👤 Khách lẻ
                    </button>
                    {filteredCustomers.map((c) => (
                      <button key={c.id} onClick={() => selectCustomer(c)} className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${selectedCustomer === c.id ? 'bg-gold-bg' : ''}`}>
                        <span className="font-medium">{c.name}</span>
                        {c.phone && <span className="ml-2 text-muted-foreground">📞 {c.phone}</span>}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Không tìm thấy</p>}
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 border-gold/30 text-gold hover:bg-gold-bg" onClick={() => setAddCustomerOpen(true)} title="Thêm khách hàng">
                <UserPlus size={16} />
              </Button>
            </div>
          </div>

          {/* Cart header with product search */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <div className="relative flex-1" ref={searchRef}>
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                ref={productSearchInputRef}
                placeholder="Tìm hàng hóa (F3)"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSearchDropdown(true); }}
                onFocus={() => { if (search.trim()) setShowSearchDropdown(true); }}
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowSearchDropdown(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"><X size={14} /></button>
              )}
              {showSearchDropdown && search.trim() && (
                <div className="absolute z-50 mt-1 max-h-72 w-full lg:w-[400px] overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredProducts.slice(0, 20).map((p) => {
                    const outOfStock = p.stock <= 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { handleAddProductClick(p); setSearch(''); setShowSearchDropdown(false); }}
                        disabled={outOfStock}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent border-b border-border/30 last:border-0 ${outOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Image size={16} className="text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.code || ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gold">{formatCurrency(p.retail_price)}</p>
                          <p className="text-xs text-muted-foreground">Tồn: {p.stock}</p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground text-center">Không tìm thấy sản phẩm</p>}
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="text-4xl mb-2 opacity-30">🛒</div>
                <p className="text-sm">Chưa có sản phẩm nào</p>
              </div>
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="lg:hidden divide-y divide-border">
                  {cart.map((item) => (
                    <div key={item.product.id} className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        {/* Product image */}
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden cursor-pointer"
                          onClick={() => setExpandedCartItem(expandedCartItem === item.product.id ? null : item.product.id)}
                        >
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <Image size={20} className="text-muted-foreground/50" />
                          )}
                        </div>
                        {/* Product info */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedCartItem(expandedCartItem === item.product.id ? null : item.product.id)}
                        >
                          <p className="font-medium text-sm leading-tight">
                            {item.product.name}
                            <span className="text-muted-foreground ml-1">({item.product.unit})</span>
                          </p>
                          <p className="text-sm font-semibold text-gold mt-0.5">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        {/* Quantity controls */}
                        <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden shrink-0">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="flex h-8 w-8 items-center justify-center hover:bg-accent"><Minus size={14} /></button>
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={String(item.quantity).replace('.', ',')}
                            key={`qty-${item.product.id}-${item.quantity}`}
                            onFocus={(e) => e.target.select()}
                            onBlur={(e) => {
                              const val = e.target.value.replace(',', '.');
                              const num = parseFloat(val);
                              if (isNaN(num) || num <= 0) setQuantity(item.product.id, 1);
                              else setQuantity(item.product.id, Math.round(num * 1000) / 1000);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="w-10 text-center text-sm font-medium bg-transparent border-x border-border outline-none py-1"
                          />
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="flex h-8 w-8 items-center justify-center hover:bg-accent"><Plus size={14} /></button>
                        </div>
                        {/* Delete */}
                        <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0 mt-1"><X size={16} /></button>
                      </div>
                      {/* Expandable note */}
                      {expandedCartItem === item.product.id && (
                        <div className="mt-2 ml-[60px]">
                          <input
                            type="text"
                            placeholder="Ghi chú sản phẩm..."
                            value={item.note}
                            onChange={(e) => setCart(prev => prev.map(c => c.product.id === item.product.id ? { ...c, note: e.target.value } : c))}
                            className="w-full text-sm bg-muted/50 rounded-lg px-3 py-2 outline-none border border-border focus:border-gold placeholder:text-muted-foreground/50"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table layout */}
                <table className="w-full text-sm hidden lg:table">
                  <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Sản phẩm</th>
                      <th className="text-center px-2 py-2 font-medium w-[120px]">Số lượng</th>
                      <th className="text-right px-2 py-2 font-medium w-[100px]">Đơn giá</th>
                      <th className="text-right px-3 py-2 font-medium w-[100px]">Thành tiền</th>
                      <th className="w-7"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={`${item.product.id}-${item.variant?.id || 'base'}`} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm truncate max-w-[160px]">{item.variant ? `${item.product.name} - ${item.variant.variant_name}` : item.product.name}</p>
                          <input
                            type="text"
                            placeholder="Ghi chú..."
                            value={item.note}
                            onChange={(e) => setCart(prev => prev.map(c => c.product.id === item.product.id && (!item.variant || c.variant?.id === item.variant.id) ? { ...c, note: e.target.value } : c))}
                            className="w-full text-xs text-muted-foreground bg-transparent border-b border-dashed border-border/50 outline-none focus:border-gold py-0.5 mt-0.5 placeholder:text-muted-foreground/50"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => updateQuantity(item.product.id, item.variant?.id, -1)} className="flex h-6 w-6 items-center justify-center rounded bg-muted hover:bg-accent shrink-0"><Minus size={12} /></button>
                            <input
                              type="text"
                              inputMode="decimal"
                              defaultValue={String(item.quantity).replace('.', ',')}
                              key={`qty-${item.product.id}-${item.variant?.id}-${item.quantity}`}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => {
                                const val = e.target.value.replace(',', '.');
                                const num = parseFloat(val);
                                if (isNaN(num) || num <= 0) setQuantity(item.product.id, item.variant?.id, 1);
                                else setQuantity(item.product.id, item.variant?.id, Math.round(num * 1000) / 1000);
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              className="w-12 text-center text-sm font-medium bg-transparent border-b border-dashed border-border outline-none focus:border-gold py-0.5"
                            />
                            <button onClick={() => updateQuantity(item.product.id, item.variant?.id, 1)} className="flex h-6 w-6 items-center justify-center rounded bg-gold text-primary-foreground shrink-0"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyInput(String(item.unitPrice))}
                            onChange={(e) => setUnitPrice(item.product.id, item.variant?.id, parseCurrencyInput(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="w-full text-right text-sm text-gold bg-transparent border-b border-dashed border-gold/30 outline-none focus:border-gold py-0.5"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-sm">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        <td className="pr-2">
                          <button onClick={() => removeFromCart(item.product.id, item.variant?.id)} className="text-muted-foreground hover:text-danger p-1"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Desktop: Discount + Summary */}
          {cart.length > 0 && (
            <div className="hidden lg:block border-t border-border px-3 py-2 space-y-2 bg-card">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tổng tiền hàng</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">Giảm giá</span>
                <Input
                  type="text" inputMode="numeric"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(formatCurrencyInput(e.target.value))}
                  className="h-8 w-28 text-right text-sm text-destructive" placeholder="0"
                />
              </div>
              <div className="flex justify-between font-bold text-base text-gold border-t border-border pt-2">
                <span>Thanh toán</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Desktop: Checkout button */}
          {cart.length > 0 && (
            <div className="hidden lg:block border-t border-border px-3 py-3 bg-card">
              <Button onClick={() => handleCheckout(true)} disabled={cart.length === 0 || showSuccess || isCheckingOut} className="w-full h-11 bg-gold hover:bg-gold-dark text-primary-foreground text-sm font-bold">
                {showSuccess ? <><CheckCircle className="mr-1" size={16} />OK</> : isCheckingOut ? <><Loader2 className="mr-1 animate-spin" size={16} />...</> : 'THANH TOÁN'}
              </Button>
            </div>
          )}

          {/* Desktop: Bottom bar */}
          <div className="hidden lg:flex border-t border-border items-center">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 border-r border-border">
              <Edit3 size={14} className="text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Ghi chú đơn hàng"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-2">
              <span className="text-sm text-muted-foreground">Tổng tiền hàng</span>
              <span className="text-sm font-medium">{cart.length}</span>
              <span className="text-base font-bold text-gold">{formatCurrency(subtotal)}</span>
            </div>
          </div>

          {/* Mobile: Bottom total + checkout */}
          <div className="lg:hidden border-t border-border bg-card px-4 py-2 space-y-2">
            {cart.length > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">Giảm giá</span>
                <Input
                  type="text" inputMode="numeric"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(formatCurrencyInput(e.target.value))}
                  className="h-8 w-28 text-right text-sm text-destructive" placeholder="0"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tổng tiền hàng</span>
                {cart.length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full border border-gold text-[10px] font-semibold text-gold px-1">{cart.length}</span>
                )}
              </div>
              <span className="text-base font-bold">{formatCurrency(total)}</span>
            </div>
            {cart.length > 0 && (
              <div className="px-4 pb-3">
                <Button onClick={() => handleCheckout(true)} disabled={showSuccess || isCheckingOut} className="w-full h-11 bg-gold hover:bg-gold-dark text-primary-foreground text-sm font-bold rounded-lg">
                  {showSuccess ? <><CheckCircle className="mr-1" size={16} />OK</> : isCheckingOut ? <><Loader2 className="mr-1 animate-spin" size={16} />...</> : 'Thanh toán'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Products panel */}
        <div className="hidden lg:flex flex-col lg:w-[55%] xl:w-[60%] min-w-0">

          {/* Category filter bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border overflow-x-auto">
            <button onClick={() => setActiveCategory('all')} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-gold text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>Tất cả</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === c.id ? 'bg-gold text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>{c.name}</button>
            ))}
          </div>

          {/* Products grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {paginatedProducts.map((p) => {
                const count = cartCount(p.id);
                const outOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddProductClick(p)}
                    disabled={outOfStock}
                    className={`relative flex items-start gap-2 rounded-lg p-2 text-left transition-all hover:bg-accent/50 active:scale-[0.98] ${outOfStock ? 'opacity-40 cursor-not-allowed' : ''} ${count > 0 ? 'bg-gold-bg/50 ring-1 ring-gold/30' : ''}`}
                  >
                    {/* Product image */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Image size={20} className="text-muted-foreground/50" />
                      )}
                    </div>
                    {/* Product info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-sm font-bold text-gold mt-0.5">{formatCurrency(p.retail_price)}</p>
                      <p className="text-xs text-muted-foreground">| {p.stock}</p>
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-primary-foreground">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Không tìm thấy sản phẩm</div>
            )}
          </div>

          {/* Bottom bar: pagination */}
          <div className="border-t border-border flex items-center justify-center py-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-accent disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-muted-foreground px-2">{currentPage}/{totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-accent disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add customer dialog */}
      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm khách hàng mới</DialogTitle>
            <DialogDescription>Nhập thông tin khách hàng</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Họ tên *</Label><Input value={newCustomerForm.name} onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} placeholder="Nguyễn Văn A" /></div>
            <div><Label>Số điện thoại *</Label><Input value={newCustomerForm.phone} onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} placeholder="0901234567" /></div>
            <div><Label>Địa chỉ</Label><Input value={newCustomerForm.address} onChange={e => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} placeholder="Tuỳ chọn" /></div>
            <div><Label>Ghi chú</Label><textarea value={newCustomerForm.note} onChange={e => setNewCustomerForm({ ...newCustomerForm, note: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card h-16 resize-none" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddCustomerOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleAddCustomer}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant picker dialog */}
      <Dialog open={showVariantPicker} onOpenChange={setShowVariantPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn biến thể - {selectedProductForVariant?.name}</DialogTitle>
            <DialogDescription>Chọn loại sản phẩm muốn mua</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedProductForVariant && productVariants[selectedProductForVariant.id]?.map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  addToCart(selectedProductForVariant, variant);
                  setShowVariantPicker(false);
                  setSelectedProductForVariant(null);
                }}
                disabled={variant.stock <= 0}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  variant.stock <= 0
                    ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed'
                    : 'border-border hover:bg-muted/30 hover:border-gold'
                }`}
              >
                <p className="font-medium text-sm">{variant.variant_name}</p>
                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                  <span>{variant.sku && `SKU: ${variant.sku}`}</span>
                  <span className={variant.stock > 0 ? 'text-success' : 'text-danger'}>
                    {variant.stock > 0 ? `Còn: ${variant.stock}` : 'Hết hàng'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gold mt-1">
                  {saleType === 'wholesale' ? formatCurrency(variant.wholesale_price) : formatCurrency(variant.retail_price)}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template picker dialog */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Chọn mẫu in</DialogTitle>
            <DialogDescription>Chọn dạng hoá đơn muốn in</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {availableTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  if (templatePrintData) {
                    const html = renderTemplate(t.content, templatePrintData);
                    openPrintWindow(html);
                  }
                  setTemplatePickerOpen(false);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${t.is_default ? 'border-gold bg-gold/5' : 'border-border'}`}
              >
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.paper_size} {t.is_default && '· Mặc định'}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
