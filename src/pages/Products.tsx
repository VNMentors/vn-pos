import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Upload, Pencil, Trash2, FolderOpen, ImageIcon, Download, ChevronLeft, ChevronRight, Tags, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';

interface Product {
  id: string; name: string; code: string; category_id: string; unit: string;
  cost_price: number; retail_price: number; wholesale_price: number;
  stock: number; min_stock: number; image_url: string; status: string; description: string;
}
interface Category { id: string; name: string; }
interface ProductAttribute {
  id?: string;
  product_id?: string;
  attribute_name: string;
  attribute_values: string[];
}
interface ProductVariant {
  id?: string;
  product_id?: string;
  variant_name: string;
  sku: string;
  attributes: Record<string, string>;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  stock: number;
  min_stock: number;
  status: string;
}

const ITEMS_PER_PAGE = 50;

const parseCurrencyInput = (value: string) => Number(value.replace(/\D/g, '') || '0');
const formatCurrencyInput = (value: number | string) => {
  const num = typeof value === 'string' ? Number(value.replace(/\D/g, '') || '0') : value;
  if (!num) return '';
  return num.toLocaleString('vi-VN');
};

function CurrencyField({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <Label>{label}{required && ' *'}</Label>
      <Input
        value={value}
        placeholder="0"
        onFocus={e => { if (parseCurrencyInput(e.target.value) === 0) onChange(''); }}
        onChange={e => onChange(formatCurrencyInput(e.target.value))}
        onBlur={e => { if (!e.target.value.trim()) onChange(''); }}
        inputMode="numeric"
      />
    </div>
  );
}

// Generate all variant combinations from attributes
function generateVariantCombinations(attributes: ProductAttribute[]): Record<string, string>[] {
  if (attributes.length === 0) return [];
  const filtered = attributes.filter(a => a.attribute_name && a.attribute_values.length > 0);
  if (filtered.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const attr of filtered) {
    const newCombos: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const val of attr.attribute_values) {
        newCombos.push({ ...combo, [attr.attribute_name]: val });
      }
    }
    combos = newCombos;
  }
  return combos;
}

function variantNameFromAttrs(attrs: Record<string, string>): string {
  return Object.values(attrs).join(' - ');
}

export default function Products() {
  const [search, setSearch] = useState('');
  const [quickCatName, setQuickCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [quickUnitName, setQuickUnitName] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [catName, setCatName] = useState('');
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Attributes & Variants state
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [hasVariants, setHasVariants] = useState(false);

  // Product variants map for display
  const [productVariantsMap, setProductVariantsMap] = useState<Record<string, ProductVariant[]>>({});

  const [form, setForm] = useState({
    name: '', code: '', category_id: '', unit: 'kg',
    cost_price: '', retail_price: '',
    stock: '', min_stock: '10', description: '', status: 'active'
  });

  const fetchData = async () => {
    const [{ data: p }, { data: c }, { data: v }] = await Promise.all([
      supabase.from('products').select('*').neq('status', 'hidden').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      supabase.from('product_variants').select('*').eq('status', 'active'),
    ]);
    if (p) setProducts(p as unknown as Product[]);
    if (c) setCategories(c as unknown as Category[]);
    // Build variants map
    if (v) {
      const map: Record<string, ProductVariant[]> = {};
      (v as any[]).forEach(variant => {
        if (!map[variant.product_id]) map[variant.product_id] = [];
        map[variant.product_id].push(variant as ProductVariant);
      });
      setProductVariantsMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '';

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || p.category_id === filterCategory;
    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filterCategory]);

  const resetForm = () => {
    setForm({ name: '', code: '', category_id: categories[0]?.id || '', unit: 'kg', cost_price: '', retail_price: '', stock: '', min_stock: '10', description: '', status: 'active' });
    setImageFile(null);
    setImagePreview('');
    setAttributes([]);
    setVariants([]);
    setHasVariants(false);
  };

  const openEdit = async (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, code: p.code, category_id: p.category_id, unit: p.unit,
      cost_price: p.cost_price ? formatCurrencyInput(p.cost_price) : '',
      retail_price: p.retail_price ? formatCurrencyInput(p.retail_price) : '',
      stock: String(p.stock || ''), min_stock: String(p.min_stock || '10'),
      description: p.description || '', status: p.status
    });
    setImageFile(null);
    setImagePreview(p.image_url || '');

    // Load attributes & variants
    const [{ data: attrs }, { data: vars }] = await Promise.all([
      supabase.from('product_attributes').select('*').eq('product_id', p.id),
      supabase.from('product_variants').select('*').eq('product_id', p.id),
    ]);
    const loadedAttrs = (attrs || []) as unknown as ProductAttribute[];
    const loadedVars = (vars || []) as unknown as ProductVariant[];
    setAttributes(loadedAttrs);
    setVariants(loadedVars);
    setHasVariants(loadedAttrs.length > 0);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditProduct(null);
    resetForm();
    setModalOpen(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Ảnh tối đa 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // When attributes change, regenerate variants
  const regenerateVariants = (newAttrs: ProductAttribute[]) => {
    setVariants(prev => {
      const combos = generateVariantCombinations(newAttrs);
      return combos.map(attrs => {
        const name = variantNameFromAttrs(attrs);
        // Try to preserve existing variant data
        const existing = prev.find(v => v.variant_name === name);
        return existing || {
          variant_name: name,
          sku: '',
          attributes: attrs,
          cost_price: parseCurrencyInput(form.cost_price),
          retail_price: parseCurrencyInput(form.retail_price),
          wholesale_price: parseCurrencyInput(form.retail_price),
          stock: 0,
          min_stock: 0,
          status: 'active',
        };
      });
    });
  };

  const addAttribute = () => {
    const newAttrs = [...attributes, { attribute_name: '', attribute_values: [] }];
    setAttributes(newAttrs);
  };

  const removeAttribute = (idx: number) => {
    const newAttrs = attributes.filter((_, i) => i !== idx);
    setAttributes(newAttrs);
    regenerateVariants(newAttrs);
  };

  const updateAttributeName = (idx: number, name: string) => {
    const newAttrs = [...attributes];
    newAttrs[idx] = { ...newAttrs[idx], attribute_name: name };
    setAttributes(newAttrs);
  };

  const addAttributeValue = (idx: number, value: string) => {
    if (!value.trim()) return;
    const newAttrs = [...attributes];
    if (newAttrs[idx].attribute_values.includes(value.trim())) return;
    newAttrs[idx] = { ...newAttrs[idx], attribute_values: [...newAttrs[idx].attribute_values, value.trim()] };
    setAttributes(newAttrs);
    regenerateVariants(newAttrs);
  };

  const removeAttributeValue = (attrIdx: number, valIdx: number) => {
    const newAttrs = [...attributes];
    newAttrs[attrIdx] = { ...newAttrs[attrIdx], attribute_values: newAttrs[attrIdx].attribute_values.filter((_, i) => i !== valIdx) };
    setAttributes(newAttrs);
    regenerateVariants(newAttrs);
  };

  const updateVariantField = (idx: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...variants];
    newVariants[idx] = { ...newVariants[idx], [field]: value };
    setVariants(newVariants);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Tên sản phẩm không được trống'); return; }
    setUploading(true);
    try {
      let image_url = editProduct?.image_url || '';
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      // Calculate total stock from variants if has variants
      const totalStock = hasVariants && variants.length > 0
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : Number(form.stock || 0);

      const payload = {
        name: form.name, code: form.code || null, category_id: form.category_id || null, unit: form.unit,
        cost_price: parseCurrencyInput(form.cost_price),
        retail_price: parseCurrencyInput(form.retail_price),
        wholesale_price: parseCurrencyInput(form.retail_price),
        stock: totalStock, min_stock: Number(form.min_stock || 10),
        description: form.description, status: form.status, image_url
      };

      let productId = editProduct?.id;

      if (editProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
        if (error) { toast.error(error.message); return; }
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select('id').single();
        if (error) { toast.error(error.message); return; }
        productId = data.id;
      }

      // Save attributes & variants
      if (productId) {
        // Delete old attributes & variants
        await Promise.all([
          supabase.from('product_attributes').delete().eq('product_id', productId),
          supabase.from('product_variants').delete().eq('product_id', productId),
        ]);

        if (hasVariants && attributes.length > 0) {
          // Save attributes
          const attrPayloads = attributes
            .filter(a => a.attribute_name && a.attribute_values.length > 0)
            .map(a => ({
              product_id: productId!,
              attribute_name: a.attribute_name,
              attribute_values: a.attribute_values,
            }));
          if (attrPayloads.length > 0) {
            await supabase.from('product_attributes').insert(attrPayloads);
          }

          // Save variants
          if (variants.length > 0) {
            const varPayloads = variants.map(v => ({
              product_id: productId!,
              variant_name: v.variant_name,
              sku: v.sku || '',
              attributes: v.attributes,
              cost_price: v.cost_price,
              retail_price: v.retail_price,
              wholesale_price: v.wholesale_price,
              stock: v.stock,
              min_stock: v.min_stock,
              status: v.status,
            }));
            await supabase.from('product_variants').insert(varPayloads);
          }
        }
      }

      setModalOpen(false);
      toast.success('Đã lưu sản phẩm!');
      fetchData();
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá sản phẩm này?')) return;
    const { count } = await supabase.from('invoice_items').select('id', { count: 'exact', head: true }).eq('product_id', id);
    if (count && count > 0) {
      const { error } = await supabase.from('products').update({ status: 'hidden' }).eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('Sản phẩm đã được ẩn (đã phát sinh hoá đơn)');
    } else {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('Đã xoá sản phẩm');
    }
    fetchData();
  };

  // Category CRUD
  const openAddCat = () => { setEditCat(null); setCatName(''); setCatModalOpen(true); };
  const openEditCat = (c: Category) => { setEditCat(c); setCatName(c.name); setCatModalOpen(true); };
  const handleSaveCat = async () => {
    if (!catName.trim()) { toast.error('Tên danh mục không được trống'); return; }
    if (editCat) {
      const { error } = await supabase.from('categories').update({ name: catName.trim() }).eq('id', editCat.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('categories').insert({ name: catName.trim() });
      if (error) { toast.error(error.message); return; }
    }
    setCatModalOpen(false);
    toast.success('Đã lưu danh mục!');
    fetchData();
  };
  const handleDeleteCat = async (id: string) => {
    const hasProducts = products.some(p => p.category_id === id);
    if (hasProducts) { toast.error('Danh mục này đang có sản phẩm, không thể xoá'); return; }
    if (!confirm('Bạn có chắc muốn xoá danh mục này?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã xoá danh mục');
    fetchData();
  };

  const handleQuickAddCat = async () => {
    if (!quickCatName.trim()) return;
    const { data, error } = await supabase.from('categories').insert({ name: quickCatName.trim() }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Đã thêm danh mục!');
    setQuickCatName('');
    setAddingCat(false);
    await fetchData();
    if (data) setForm(f => ({ ...f, category_id: data.id }));
  };

  const defaultUnits = ['kg', 'lít', 'hộp', 'bịch', 'gói', 'cái', 'chai', 'thùng', 'vỉ'];
  const allUnits = [...new Set([...defaultUnits, ...customUnits])];

  const handleQuickAddUnit = () => {
    const name = quickUnitName.trim();
    if (!name) return;
    if (allUnits.includes(name)) { toast.error('Đơn vị đã tồn tại'); return; }
    setCustomUnits(prev => [...prev, name]);
    setForm(f => ({ ...f, unit: name }));
    setQuickUnitName('');
    setAddingUnit(false);
    toast.success('Đã thêm đơn vị!');
  };

  // Excel Import
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Tên SP (*)', 'Mã SP', 'Danh mục', 'Đơn vị', 'Giá nhập', 'Giá bán', 'Tồn kho', 'Tồn kho tối thiểu', 'Mô tả'],
      ['Thịt bò Úc', 'SP001', 'Thịt', 'kg', 280000, 350000, 50, 10, 'Thịt bò nhập khẩu'],
      ['Rau muống', 'SP002', 'Rau củ', 'bó', 8000, 12000, 100, 20, ''],
    ]);
    ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');
    XLSX.writeFile(wb, 'Mau_Import_SanPham.xlsx');
    toast.success('Đã tải file mẫu!');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (rows.length < 2) { toast.error('File không có dữ liệu'); return; }

      const catMap: Record<string, string> = {};
      categories.forEach(c => { catMap[c.name.toLowerCase()] = c.id; });

      const items = rows.slice(1).filter((r: any[]) => r[0]).map((r: any[]) => ({
        name: String(r[0] || ''),
        code: String(r[1] || ''),
        category_id: catMap[(String(r[2] || '')).toLowerCase()] || categories[0]?.id || null,
        unit: String(r[3] || 'cái'),
        cost_price: Number(r[4] || 0),
        retail_price: Number(r[5] || 0),
        wholesale_price: Number(r[5] || 0),
        stock: Number(r[6] || 0),
        min_stock: Number(r[7] || 10),
        description: String(r[8] || ''),
      }));

      if (!items.length) { toast.error('Không tìm thấy sản phẩm hợp lệ'); return; }

      const { error } = await supabase.from('products').insert(items);
      if (error) { toast.error(error.message); return; }
      toast.success(`Đã import ${items.length} sản phẩm!`);
      setImportOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error('Lỗi đọc file: ' + (err?.message || ''));
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // Attribute value input state
  const [attrValueInputs, setAttrValueInputs] = useState<Record<number, string>>({});

  if (loading) return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Sticky toolbar */}
        <div className="flex-shrink-0 pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="products">📦 Sản phẩm ({products.length})</TabsTrigger>
              <TabsTrigger value="categories">📁 Danh mục ({categories.length})</TabsTrigger>
            </TabsList>
            {activeTab === 'products' && (
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Tìm tên, mã SP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border border-border rounded-lg text-sm bg-card">
                  <option value="all">Tất cả DM</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button onClick={() => setImportOpen(true)} variant="outline" className="border-gold text-gold hover:bg-gold-bg">
                  <Upload size={16} className="mr-1" />Import
                </Button>
                <Button onClick={openAdd} className="bg-gold hover:bg-gold-dark text-primary-foreground">
                  <Plus size={16} className="mr-1" />Thêm SP
                </Button>
              </div>
            )}
            {activeTab === 'categories' && (
              <Button onClick={openAddCat} className="bg-gold hover:bg-gold-dark text-primary-foreground">
                <Plus size={16} className="mr-1" />Thêm danh mục
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <TabsContent value="products" className="mt-0 flex-1 min-h-0 flex flex-col">
          <div className="bg-card rounded-xl card-shadow flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="table-header">
                    <th className="text-left p-3">Ảnh</th>
                    <th className="text-left p-3">Tên SP</th>
                    <th className="text-left p-3 hidden md:table-cell">Danh mục</th>
                    <th className="text-left p-3 hidden sm:table-cell">Đơn vị</th>
                    <th className="text-right p-3">Giá bán</th>
                    <th className="text-center p-3">Tồn kho</th>
                    <th className="text-center p-3 hidden md:table-cell">Biến thể</th>
                    <th className="text-center p-3 hidden md:table-cell">Trạng thái</th>
                    <th className="text-center p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => (
                    <tr key={p.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-[#FFFDF5]' : ''}`}>
                      <td className="p-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon size={16} className="text-muted-foreground" /></div>
                        )}
                      </td>
                      <td className="p-3"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.code}</p></td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{getCategoryName(p.category_id)}</td>
                      <td className="p-3 hidden sm:table-cell">{p.unit}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(p.retail_price)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.stock > 10 ? 'bg-success/10 text-success' : p.stock > 0 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                          {p.stock > 10 ? `Còn ${p.stock}` : p.stock > 0 ? `Sắp hết ${p.stock}` : 'Hết hàng'}
                        </span>
                      </td>
                      <td className="p-3 text-center hidden md:table-cell">
                        {productVariantsMap[p.id] ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gold/10 text-gold">
                            <Tags size={12} />{productVariantsMap[p.id].length}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center hidden md:table-cell">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {p.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-accent text-gold"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-accent text-danger"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination footer */}
            <div className="flex-shrink-0 p-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
              <span>Hiển thị {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} / {filtered.length} sản phẩm</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={16} />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;
                    return (
                      <Button key={pageNum} variant={page === pageNum ? 'default' : 'ghost'} size="sm"
                        className={page === pageNum ? 'bg-gold hover:bg-gold-dark text-primary-foreground' : ''}
                        onClick={() => setPage(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-0">
          <div className="bg-card rounded-xl card-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left p-3">Tên danh mục</th>
                    <th className="text-center p-3">Số sản phẩm</th>
                    <th className="text-center p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-[#FFFDF5]' : ''}`}>
                      <td className="p-3 font-medium"><div className="flex items-center gap-2"><FolderOpen size={16} className="text-gold" />{c.name}</div></td>
                      <td className="p-3 text-center">{products.filter(p => p.category_id === c.id).length}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditCat(c)} className="p-1.5 rounded hover:bg-accent text-gold"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteCat(c.id)} className="p-1.5 rounded hover:bg-accent text-danger"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border text-sm text-muted-foreground">{categories.length} danh mục</div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editCat ? 'Sửa danh mục' : 'Thêm danh mục mới'}</DialogTitle>
            <DialogDescription>Nhập tên danh mục sản phẩm</DialogDescription>
          </DialogHeader>
          <div><Label>Tên danh mục *</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="VD: Rau củ, Thịt cá..." /></div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setCatModalOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleSaveCat}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={hasVariants ? 'variants' : 'info'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted mb-4">
              <TabsTrigger value="info" className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">📝 Thông tin</TabsTrigger>
              <TabsTrigger value="variants" className="data-[state=active]:bg-gold data-[state=active]:text-primary-foreground">🎨 Biến thể</TabsTrigger>
            </TabsList>

            {/* TAB 1: THÔNG TIN */}
            <TabsContent value="info" className="space-y-4">
              {/* Image upload */}
              <div className="flex items-center gap-4 mb-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gold/40 flex items-center justify-center cursor-pointer hover:border-gold transition-colors overflow-hidden bg-muted"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <ImageIcon size={24} className="mx-auto text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-1 block">Chọn ảnh</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <div className="text-xs text-muted-foreground">
                  <p>Bấm vào ô để chọn ảnh sản phẩm</p>
                  <p>Tối đa 5MB • JPG, PNG, WebP</p>
                  {imagePreview && (
                    <button onClick={() => { setImageFile(null); setImagePreview(''); }} className="text-danger mt-1 underline">Xoá ảnh</button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label>Tên sản phẩm *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nhập tên SP" /></div>
                  <div><Label>Mã SP</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Tự sinh nếu để trống" /></div>
                  <div>
                    <Label>Danh mục *</Label>
                    <div className="flex gap-2">
                      <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="flex-1 p-2 border border-border rounded-lg text-sm bg-card">
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <Button type="button" variant="outline" size="sm" className="border-gold text-gold hover:bg-gold-bg shrink-0 h-auto" onClick={() => setAddingCat(!addingCat)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                    {addingCat && (
                      <div className="flex gap-2 mt-2">
                        <Input value={quickCatName} onChange={e => setQuickCatName(e.target.value)} placeholder="Tên danh mục mới" className="flex-1" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCat(); } }} />
                        <Button type="button" size="sm" className="bg-gold hover:bg-gold-dark text-primary-foreground h-auto" disabled={!quickCatName.trim()} onClick={handleQuickAddCat}>Thêm</Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Đơn vị *</Label>
                    <div className="flex gap-2">
                      <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="flex-1 p-2 border border-border rounded-lg text-sm bg-card">
                        {allUnits.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <Button type="button" variant="outline" size="sm" className="border-gold text-gold hover:bg-gold-bg shrink-0 h-auto" onClick={() => setAddingUnit(!addingUnit)}>
                        <Plus size={14} />
                      </Button>
                    </div>
                    {addingUnit && (
                      <div className="flex gap-2 mt-2">
                        <Input value={quickUnitName} onChange={e => setQuickUnitName(e.target.value)} placeholder="Đơn vị mới" className="flex-1" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddUnit(); } }} />
                        <Button type="button" size="sm" className="bg-gold hover:bg-gold-dark text-primary-foreground h-auto" disabled={!quickUnitName.trim()} onClick={handleQuickAddUnit}>Thêm</Button>
                      </div>
                    )}
                  </div>
                  <div><Label>Mô tả</Label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full p-2 border border-border rounded-lg text-sm bg-card h-16 resize-none" /></div>
                </div>
                {!hasVariants && (
                  <div className="space-y-3">
                    <CurrencyField label="Giá nhập" value={form.cost_price} onChange={v => setForm({ ...form, cost_price: v })} required />
                    <CurrencyField label="Giá bán" value={form.retail_price} onChange={v => setForm({ ...form, retail_price: v })} required />
                    <div><Label>Tồn kho *</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" /></div>
                    <div><Label>Tồn kho tối thiểu</Label><Input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} placeholder="10" /></div>
                  </div>
                )}
                {hasVariants && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-gold/30 text-sm text-muted-foreground">
                    ℹ️ Giá tự động từ biến thể bên dưới ↓
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: BIẾN THỂ */}
            <TabsContent value="variants" className="space-y-4">
              {!hasVariants ? (
                <div className="p-8 text-center border-2 border-dashed border-gold/30 rounded-lg bg-gold/5">
                  <Tags size={32} className="mx-auto text-gold/60 mb-3" />
                  <p className="text-lg font-semibold text-foreground mb-2">Chưa bật biến thể</p>
                  <p className="text-sm text-muted-foreground mb-4">Bấm nút dưới để thêm Size, Màu sắc hoặc các thuộc tính khác</p>
                  <Button
                    type="button"
                    className="bg-gold hover:bg-gold-dark text-primary-foreground"
                    onClick={() => {
                      setHasVariants(true);
                      if (attributes.length === 0) {
                        setAttributes([{ attribute_name: '', attribute_values: [] }]);
                      }
                    }}
                  >
                    <Plus size={16} className="mr-2" />Thêm biến thể ngay
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gold/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gold/10 rounded-lg">
                        <Tags size={20} className="text-gold" />
                      </div>
                      <div>
                        <Label className="text-lg font-bold text-foreground block">Thuộc tính sản phẩm</Label>
                        <p className="text-xs text-muted-foreground">Ví dụ: Size (S,M,L), Màu sắc (Đen, Trắng)</p>
                      </div>
                    </div>
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => setHasVariants(false)}
                    >
                      <X size={16} className="mr-1" />Tắt
                    </Button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="p-4 bg-blue/5 border-l-4 border-blue rounded-r-lg text-sm">
                      <p className="font-bold text-foreground mb-2">📌 3 bước thêm biến thể:</p>
                      <ol className="space-y-1.5 text-xs text-muted-foreground">
                        <li><span className="font-semibold text-foreground">1.</span> Nhập tên thuộc tính (Size, Màu...)</li>
                        <li><span className="font-semibold text-foreground">2.</span> Thêm giá trị (S, M, L) rồi Enter</li>
                        <li><span className="font-semibold text-foreground">3.</span> Bảng biến thể auto-generate, điền giá!</li>
                      </ol>
                    </div>

                    {attributes.map((attr, attrIdx) => (
                      <div key={attrIdx} className="p-4 border-2 border-gold/30 rounded-lg bg-gradient-to-br from-gold/5 to-transparent space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-bold text-gold uppercase">Thuộc tính</label>
                          <Input
                            value={attr.attribute_name}
                            onChange={e => updateAttributeName(attrIdx, e.target.value)}
                            placeholder="Ví dụ: Size, Màu, Mùi..."
                            className="flex-1 font-semibold text-base"
                          />
                          <button onClick={() => removeAttribute(attrIdx)} className="p-2 rounded-lg hover:bg-danger/10 text-danger shrink-0 transition">
                            <X size={18} />
                          </button>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gold uppercase block mb-2">Giá trị</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {attr.attribute_values.map((val, valIdx) => (
                              <span key={valIdx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-gold/20 text-gold border-2 border-gold/40 hover:border-gold/70 transition">
                                {val}
                                <button onClick={() => removeAttributeValue(attrIdx, valIdx)} className="hover:text-danger transition p-0.5">
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={attrValueInputs[attrIdx] || ''}
                              onChange={e => setAttrValueInputs(prev => ({ ...prev, [attrIdx]: e.target.value }))}
                              placeholder="Ví dụ: S, M, L..."
                              className="h-9 text-sm flex-1"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addAttributeValue(attrIdx, attrValueInputs[attrIdx] || '');
                                  setAttrValueInputs(prev => ({ ...prev, [attrIdx]: '' }));
                                }
                              }}
                            />
                            <Button
                              type="button" size="sm" className="h-9 px-3 bg-gold hover:bg-gold-dark text-primary-foreground"
                              onClick={() => {
                                addAttributeValue(attrIdx, attrValueInputs[attrIdx] || '');
                                setAttrValueInputs(prev => ({ ...prev, [attrIdx]: '' }));
                              }}
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="border-gold text-gold hover:bg-gold-bg" onClick={addAttribute}>
                      <Plus size={14} className="mr-1" />Thêm thuộc tính
                    </Button>

                    {/* Variants Table */}
                    {variants.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-semibold">Danh sách biến thể ({variants.length})</Label>
                          <Button
                            type="button" variant="ghost" size="sm" className="text-xs text-gold hover:bg-gold/10"
                            onClick={() => {
                              const price = prompt('Nhập giá bán cho tất cả biến thể:', '');
                              if (price) {
                                const val = parseCurrencyInput(price);
                                const filled = variants.map(v => ({ ...v, retail_price: val, wholesale_price: val }));
                                setVariants(filled);
                              }
                            }}
                          >
                            ⭐ Điền đồng loạt giá bán
                          </Button>
                        </div>
                        <div className="overflow-x-auto border border-border rounded-lg">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="table-header bg-muted/50">
                                <th className="text-left p-3 font-medium">Biến thể</th>
                                <th className="text-left p-3 font-medium">SKU</th>
                                <th className="text-right p-3 font-medium">Giá nhập</th>
                                <th className="text-right p-3 font-medium">Giá bán ⭐</th>
                                <th className="text-center p-3 font-medium">Tồn</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map((v, idx) => (
                                <tr key={idx} className="border-b border-border hover:bg-muted/30">
                                  <td className="p-3 font-medium text-foreground">{v.variant_name}</td>
                                  <td className="p-3">
                                    <Input
                                      value={v.sku} className="h-8 text-xs px-2 w-20"
                                      placeholder="SKU"
                                      onChange={e => updateVariantField(idx, 'sku', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      value={v.cost_price ? formatCurrencyInput(v.cost_price) : ''}
                                      className="h-8 text-xs px-2 text-right"
                                      inputMode="numeric"
                                      placeholder="0"
                                      onFocus={e => { if (parseCurrencyInput(e.target.value) === 0) updateVariantField(idx, 'cost_price', 0); }}
                                      onChange={e => updateVariantField(idx, 'cost_price', parseCurrencyInput(e.target.value))}
                                      onBlur={e => { if (!e.target.value.trim()) updateVariantField(idx, 'cost_price', 0); }}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      value={v.retail_price ? formatCurrencyInput(v.retail_price) : ''}
                                      className="h-9 text-sm px-2 text-right font-bold text-gold bg-gold/10 border-2 border-gold/50"
                                      inputMode="numeric"
                                      placeholder="45000"
                                      onFocus={e => { if (parseCurrencyInput(e.target.value) === 0) updateVariantField(idx, 'retail_price', 0); }}
                                      onChange={e => {
                                        const val = parseCurrencyInput(e.target.value);
                                        const newVariants = [...variants];
                                        newVariants[idx] = { ...newVariants[idx], retail_price: val, wholesale_price: val };
                                        setVariants(newVariants);
                                      }}
                                      onBlur={e => { if (!e.target.value.trim()) updateVariantField(idx, 'retail_price', 0); }}
                                    />
                                  </td>
                                  <td className="p-3">
                                    <Input
                                      type="number" value={v.stock} className="h-8 text-xs w-12 text-center"
                                      placeholder="0"
                                      onChange={e => updateVariantField(idx, 'stock', Number(e.target.value || 0))}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tổng tồn kho: <strong>{variants.reduce((s, v) => s + v.stock, 0)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button className="bg-gold hover:bg-gold-dark text-primary-foreground" onClick={handleSave} disabled={uploading}>
              {uploading ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import sản phẩm từ Excel</DialogTitle>
            <DialogDescription>Tải lên file Excel để thêm hàng loạt sản phẩm. Cột "Danh mục" phải khớp tên danh mục đã có.</DialogDescription>
          </DialogHeader>
          <div
            className="border-2 border-dashed border-gold rounded-xl p-8 text-center cursor-pointer hover:bg-gold/5 transition-colors"
            onClick={() => importFileRef.current?.click()}
          >
            <div className="text-4xl mb-3">📥</div>
            <p className="font-medium mb-1">Kéo file Excel vào đây</p>
            <p className="text-sm text-muted-foreground mb-3">Hoặc click để chọn file (.xlsx, .xls, .csv)</p>
            <Button variant="outline" className="border-gold text-gold" type="button">
              {importing ? 'Đang import...' : 'Chọn file từ máy tính'}
            </Button>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
          </div>
          <Button variant="outline" className="w-full border-gold text-gold mt-2" onClick={handleDownloadTemplate}>
            <Download size={16} className="mr-2" />Tải file mẫu Excel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}