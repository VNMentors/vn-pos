// Mock data for the POS application

export const categories = [
  { id: '1', name: 'Thực phẩm khô' },
  { id: '2', name: 'Thực phẩm tươi' },
  { id: '3', name: 'Đồ uống' },
  { id: '4', name: 'Gia vị' },
  { id: '5', name: 'Khác' },
];

export interface Product {
  id: string;
  name: string;
  code: string;
  category_id: string;
  category_name: string;
  unit: string;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  stock: number;
  min_stock: number;
  image_url: string;
  status: 'active' | 'inactive';
  description: string;
}

export const products: Product[] = [
  { id: '1', name: 'Gạo ST25', code: 'SP001', category_id: '1', category_name: 'Thực phẩm khô', unit: 'kg', cost_price: 18000, retail_price: 25000, wholesale_price: 22000, stock: 100, min_stock: 20, image_url: '', status: 'active', description: 'Gạo ST25 thơm ngon' },
  { id: '2', name: 'Gạo Jasmine', code: 'SP002', category_id: '1', category_name: 'Thực phẩm khô', unit: 'kg', cost_price: 15000, retail_price: 20000, wholesale_price: 18000, stock: 80, min_stock: 20, image_url: '', status: 'active', description: '' },
  { id: '3', name: 'Nước mắm Phú Quốc', code: 'SP003', category_id: '4', category_name: 'Gia vị', unit: 'chai', cost_price: 30000, retail_price: 45000, wholesale_price: 40000, stock: 45, min_stock: 10, image_url: '', status: 'active', description: 'Nước mắm truyền thống' },
  { id: '4', name: 'Dầu ăn Neptune', code: 'SP004', category_id: '4', category_name: 'Gia vị', unit: 'chai', cost_price: 35000, retail_price: 52000, wholesale_price: 48000, stock: 30, min_stock: 10, image_url: '', status: 'active', description: '' },
  { id: '5', name: 'Đường cát trắng', code: 'SP005', category_id: '1', category_name: 'Thực phẩm khô', unit: 'kg', cost_price: 12000, retail_price: 18000, wholesale_price: 16000, stock: 60, min_stock: 15, image_url: '', status: 'active', description: '' },
  { id: '6', name: 'Muối iốt', code: 'SP006', category_id: '4', category_name: 'Gia vị', unit: 'gói', cost_price: 3000, retail_price: 5000, wholesale_price: 4500, stock: 200, min_stock: 30, image_url: '', status: 'active', description: '' },
  { id: '7', name: 'Nước tương Maggi', code: 'SP007', category_id: '4', category_name: 'Gia vị', unit: 'chai', cost_price: 12000, retail_price: 18000, wholesale_price: 16000, stock: 50, min_stock: 10, image_url: '', status: 'active', description: '' },
  { id: '8', name: 'Mì Hảo Hảo', code: 'SP008', category_id: '1', category_name: 'Thực phẩm khô', unit: 'gói', cost_price: 3000, retail_price: 5000, wholesale_price: 4000, stock: 500, min_stock: 50, image_url: '', status: 'active', description: '' },
  { id: '9', name: 'Bún gạo khô', code: 'SP009', category_id: '1', category_name: 'Thực phẩm khô', unit: 'gói', cost_price: 8000, retail_price: 12000, wholesale_price: 10000, stock: 8, min_stock: 10, image_url: '', status: 'active', description: '' },
  { id: '10', name: 'Miến dong', code: 'SP010', category_id: '1', category_name: 'Thực phẩm khô', unit: 'gói', cost_price: 10000, retail_price: 15000, wholesale_price: 13000, stock: 40, min_stock: 10, image_url: '', status: 'active', description: '' },
  { id: '11', name: 'Nước khoáng Lavie', code: 'SP011', category_id: '3', category_name: 'Đồ uống', unit: 'chai', cost_price: 3000, retail_price: 5000, wholesale_price: 4000, stock: 300, min_stock: 50, image_url: '', status: 'active', description: '' },
  { id: '12', name: 'Nước ngọt Pepsi 1.5L', code: 'SP012', category_id: '3', category_name: 'Đồ uống', unit: 'chai', cost_price: 10000, retail_price: 15000, wholesale_price: 13000, stock: 0, min_stock: 20, image_url: '', status: 'active', description: '' },
  { id: '13', name: 'Rau cải xanh', code: 'SP013', category_id: '2', category_name: 'Thực phẩm tươi', unit: 'kg', cost_price: 10000, retail_price: 15000, wholesale_price: 13000, stock: 25, min_stock: 5, image_url: '', status: 'active', description: '' },
  { id: '14', name: 'Trứng gà ta (vỉ 10)', code: 'SP014', category_id: '2', category_name: 'Thực phẩm tươi', unit: 'vỉ', cost_price: 25000, retail_price: 35000, wholesale_price: 32000, stock: 50, min_stock: 10, image_url: '', status: 'active', description: '' },
  { id: '15', name: 'Hành tím', code: 'SP015', category_id: '2', category_name: 'Thực phẩm tươi', unit: 'kg', cost_price: 20000, retail_price: 30000, wholesale_price: 27000, stock: 15, min_stock: 5, image_url: '', status: 'active', description: '' },
];

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'retail' | 'wholesale';
  address: string;
  note: string;
  total_spent: number;
  total_orders: number;
  points: number;
  created_at: string;
}

export const customers: Customer[] = [
  { id: '1', name: 'Nhà hàng Phố Biển', phone: '0901234567', type: 'wholesale', address: '123 Trần Hưng Đạo, Q.1', note: 'Khách quen', total_spent: 45000000, total_orders: 35, points: 450, created_at: '2024-06-15' },
  { id: '2', name: 'Quán Cơm Tấm Bà Tư', phone: '0912345678', type: 'wholesale', address: '456 Lý Thường Kiệt, Q.5', note: '', total_spent: 28000000, total_orders: 22, points: 280, created_at: '2024-07-01' },
  { id: '3', name: 'Tạp hoá Minh Thành', phone: '0923456789', type: 'wholesale', address: '789 Nguyễn Trãi, Q.5', note: 'Mua sỉ hàng tuần', total_spent: 62000000, total_orders: 48, points: 620, created_at: '2024-05-20' },
  { id: '4', name: 'Bếp Ăn Công Nghiệp ABC', phone: '0934567890', type: 'wholesale', address: 'KCN Tân Bình', note: '', total_spent: 85000000, total_orders: 60, points: 850, created_at: '2024-04-10' },
  { id: '5', name: 'Nguyễn Thị Mai', phone: '0945678901', type: 'retail', address: '', note: '', total_spent: 2500000, total_orders: 12, points: 25, created_at: '2024-08-01' },
  { id: '6', name: 'Trần Văn Hùng', phone: '0956789012', type: 'retail', address: '', note: '', total_spent: 1800000, total_orders: 8, points: 18, created_at: '2024-09-15' },
  { id: '7', name: 'Lê Thị Hoa', phone: '0967890123', type: 'retail', address: '', note: '', total_spent: 3200000, total_orders: 15, points: 32, created_at: '2024-07-20' },
  { id: '8', name: 'Phạm Minh Tuấn', phone: '0978901234', type: 'retail', address: '', note: '', total_spent: 950000, total_orders: 5, points: 10, created_at: '2024-10-01' },
  { id: '9', name: 'Võ Thị Lan', phone: '0989012345', type: 'retail', address: '', note: '', total_spent: 4100000, total_orders: 18, points: 41, created_at: '2024-06-10' },
  { id: '10', name: 'Đặng Quốc Bảo', phone: '0990123456', type: 'retail', address: '', note: '', total_spent: 1200000, total_orders: 6, points: 12, created_at: '2024-11-01' },
];

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_type: 'retail' | 'wholesale';
  staff_name: string;
  sale_type: 'retail' | 'wholesale';
  payment_method: 'cash' | 'transfer';
  subtotal: number;
  discount_amount: number;
  discount_reason: string;
  tax_amount: number;
  total: number;
  status: 'completed' | 'cancelled';
  created_at: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  product_name: string;
  product_code: string;
  unit: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

const generateInvoices = (): Invoice[] => {
  const invoices: Invoice[] = [];
  const staffNames = ['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Châu'];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(i / 3));
    date.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
    const isWholesale = Math.random() > 0.6;
    const customer = isWholesale
      ? customers[Math.floor(Math.random() * 4)]
      : (Math.random() > 0.3 ? customers[4 + Math.floor(Math.random() * 6)] : null);

    const numItems = 2 + Math.floor(Math.random() * 4);
    const items: InvoiceItem[] = [];
    const usedProducts = new Set<string>();
    for (let j = 0; j < numItems; j++) {
      let p = products[Math.floor(Math.random() * products.length)];
      while (usedProducts.has(p.id)) p = products[Math.floor(Math.random() * products.length)];
      usedProducts.add(p.id);
      const qty = isWholesale ? 5 + Math.floor(Math.random() * 20) : 1 + Math.floor(Math.random() * 5);
      const price = isWholesale ? p.wholesale_price : p.retail_price;
      items.push({ product_name: p.name, product_code: p.code, unit: p.unit, quantity: qty, unit_price: price, subtotal: qty * price });
    }

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05 / 1000) * 1000 : 0;
    const total = subtotal - discount;

    invoices.push({
      id: String(i + 1),
      invoice_number: `HD${String(i + 1).padStart(5, '0')}`,
      customer_name: customer?.name || 'Khách sỉ',
      customer_type: isWholesale ? 'wholesale' : 'retail',
      staff_name: staffNames[Math.floor(Math.random() * staffNames.length)],
      sale_type: isWholesale ? 'wholesale' : 'retail',
      payment_method: Math.random() > 0.4 ? 'cash' : 'transfer',
      subtotal, discount_amount: discount, discount_reason: discount > 0 ? 'Khách quen' : '', tax_amount: 0, total,
      status: Math.random() > 0.1 ? 'completed' : 'cancelled',
      created_at: date.toISOString(),
      items,
    });
  }
  return invoices;
};

export const invoices = generateInvoices();

export const dashboardStats = {
  revenueToday: 18500000,
  revenueYesterday: 15200000,
  ordersToday: 24,
  ordersYesterday: 19,
  profitToday: 4250000,
  profitPercent: 23.5,
  newCustomersMonth: 8,
  newCustomersLastMonth: 5,
};

export const weeklyRevenue = [
  { day: 'T2', revenue: 12500000, profit: 2800000, orders: 18 },
  { day: 'T3', revenue: 15300000, profit: 3500000, orders: 22 },
  { day: 'T4', revenue: 11800000, profit: 2600000, orders: 15 },
  { day: 'T5', revenue: 18200000, profit: 4200000, orders: 26 },
  { day: 'T6', revenue: 21500000, profit: 5100000, orders: 30 },
  { day: 'T7', revenue: 25000000, profit: 5800000, orders: 35 },
  { day: 'CN', revenue: 19800000, profit: 4500000, orders: 28 },
];

export const topProducts = [
  { name: 'Gạo ST25', quantity: 45, revenue: 1125000 },
  { name: 'Mì Hảo Hảo', quantity: 120, revenue: 600000 },
  { name: 'Nước mắm Phú Quốc', quantity: 30, revenue: 1350000 },
  { name: 'Trứng gà ta', quantity: 25, revenue: 875000 },
  { name: 'Dầu ăn Neptune', quantity: 18, revenue: 936000 },
];

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', '').trim() + ' ₫';
};

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
