import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env");
const env = fs
  .readFileSync(envPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) return acc;
    acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
    return acc;
  }, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const notZeroUuid = "00000000-0000-0000-0000-000000000000";

const categories = [
  { name: "Thời trang" },
  { name: "Phụ kiện" },
  { name: "Dụng cụ học tập" },
  { name: "Góc làm việc" },
  { name: "Đồ công nghệ" },
  { name: "Quà tặng" },
];

const products = [
  ["Áo thun cotton premium", "TEE-PREMIUM-01", "Thời trang", "cái", 119000, 249000, 219000, 42, 8, "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85", "Form regular dễ mặc, vải cotton mềm, phù hợp đi học, đi làm và dạo phố."],
  ["Sơ mi linen ngắn tay", "SHIRT-LINEN-02", "Thời trang", "cái", 165000, 329000, 289000, 24, 6, "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85", "Chất linen pha thoáng, màu trung tính, dễ phối quần jeans hoặc kaki."],
  ["Áo khoác denim basic", "JACKET-DENIM-03", "Thời trang", "cái", 245000, 529000, 479000, 18, 4, "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=85", "Áo khoác denim dày vừa, form unisex, hợp phối nhiều lớp."],
  ["Quần kaki ống suông", "PANTS-KHAKI-04", "Thời trang", "cái", 185000, 399000, 359000, 28, 5, "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85", "Quần kaki đứng form, màu trung tính, dùng tốt cho đi học và đi làm."],
  ["Túi tote canvas khóa kéo", "BAG-TOTE-05", "Phụ kiện", "cái", 82000, 179000, 155000, 58, 10, "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85", "Túi canvas dày, có khóa kéo và ngăn nhỏ, đựng laptop 13 inch, sách vở hoặc đồ cá nhân."],
  ["Kính mát gọng vuông", "SUN-SQUARE-06", "Phụ kiện", "cái", 92000, 219000, 189000, 31, 6, "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85", "Gọng vuông hiện đại, tròng chống UV400, hợp đi chơi và du lịch."],
  ["Ví mini da mềm", "WALLET-MINI-07", "Phụ kiện", "cái", 76000, 169000, 145000, 46, 8, "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85", "Ví nhỏ gọn, nhiều ngăn, bề mặt da mềm dễ dùng hằng ngày."],
  ["Mũ lưỡi trai washed", "CAP-WASHED-08", "Phụ kiện", "cái", 58000, 139000, 119000, 64, 10, "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85", "Mũ cotton washed, khóa chỉnh sau, phối với outfit casual."],
  ["Bộ bút gel pastel 6 màu", "PEN-PASTEL-09", "Dụng cụ học tập", "bộ", 36000, 79000, 69000, 120, 20, "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=900&q=85", "Mực gel ra đều, màu pastel nhẹ, hợp ghi chú, bullet journal và trang trí vở."],
  ["Sổ planner bìa cứng A5", "NOTE-A5-10", "Dụng cụ học tập", "quyển", 54000, 129000, 109000, 76, 12, "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=85", "Layout tuần/tháng rõ ràng, giấy dày hạn chế lem mực, bìa cứng bảo vệ tốt."],
  ["Balo laptop chống nước", "BACKPACK-11", "Dụng cụ học tập", "cái", 225000, 459000, 419000, 22, 5, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85", "Balo có ngăn laptop 15 inch, vải chống nước nhẹ, dây đeo êm."],
  ["Hộp bút trong suốt", "PENCIL-CASE-12", "Dụng cụ học tập", "cái", 22000, 59000, 49000, 96, 15, "https://images.unsplash.com/photo-1517971129774-8a2b38fa128e?auto=format&fit=crop&w=900&q=85", "Hộp bút nhựa trong, gọn nhẹ, dễ nhìn đồ bên trong."],
  ["Đèn bàn LED gập gọn", "LAMP-LED-13", "Góc làm việc", "cái", 148000, 299000, 269000, 18, 5, "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85", "Ba nhiệt màu, cảm ứng chạm, gập gọn cho bàn học nhỏ."],
  ["Kệ bàn học module", "DESK-SHELF-14", "Góc làm việc", "bộ", 175000, 359000, 329000, 14, 4, "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=85", "Kệ lắp ghép để sách, tai nghe, phụ kiện nhỏ, giúp góc làm việc gọn hơn."],
  ["Tai nghe bluetooth compact", "EARBUD-15", "Đồ công nghệ", "cái", 235000, 499000, 459000, 26, 5, "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=85", "Tai nghe nhỏ gọn, hộp sạc tiện mang theo, phù hợp học online và di chuyển."],
  ["Chuột không dây silent", "MOUSE-SILENT-16", "Đồ công nghệ", "cái", 98000, 219000, 195000, 40, 8, "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=85", "Chuột không dây click êm, dùng tốt cho thư viện, lớp học và văn phòng."],
  ["Set quà sinh nhật mini", "GIFT-MINI-17", "Quà tặng", "set", 118000, 259000, 229000, 35, 6, "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=85", "Set quà gồm sổ, bút, thiệp và túi giấy, phù hợp tặng bạn bè."],
  ["Ly giữ nhiệt pastel 500ml", "TUMBLER-18", "Quà tặng", "cái", 105000, 239000, 209000, 52, 10, "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85", "Ly giữ nhiệt màu pastel, nắp kín, phù hợp đi học, đi làm."],
];

const variants = {
  "TEE-PREMIUM-01": [
    ["Trắng - S", "TEE-PREMIUM-01-WH-S", { Màu: "Trắng", Size: "S" }, 8],
    ["Trắng - M", "TEE-PREMIUM-01-WH-M", { Màu: "Trắng", Size: "M" }, 10],
    ["Đen - M", "TEE-PREMIUM-01-BK-M", { Màu: "Đen", Size: "M" }, 12],
    ["Đen - L", "TEE-PREMIUM-01-BK-L", { Màu: "Đen", Size: "L" }, 12],
  ],
  "SHIRT-LINEN-02": [
    ["Be - M", "SHIRT-LINEN-02-BE-M", { Màu: "Be", Size: "M" }, 8],
    ["Be - L", "SHIRT-LINEN-02-BE-L", { Màu: "Be", Size: "L" }, 7],
    ["Xanh nhạt - M", "SHIRT-LINEN-02-BL-M", { Màu: "Xanh nhạt", Size: "M" }, 9],
  ],
  "BAG-TOTE-05": [
    ["Kem", "BAG-TOTE-05-CREAM", { Màu: "Kem" }, 22],
    ["Đen", "BAG-TOTE-05-BLACK", { Màu: "Đen" }, 18],
    ["Nâu", "BAG-TOTE-05-BROWN", { Màu: "Nâu" }, 18],
  ],
  "TUMBLER-18": [
    ["Hồng", "TUMBLER-18-PINK", { Màu: "Hồng" }, 20],
    ["Xanh", "TUMBLER-18-BLUE", { Màu: "Xanh" }, 16],
    ["Kem", "TUMBLER-18-CREAM", { Màu: "Kem" }, 16],
  ],
};

const customers = [
  ["Nguyễn Minh Anh", "0901000001", "retail", "12 Nguyễn Trãi, Quận 1, TP.HCM", "Thích nhận hàng buổi tối", 1286000, 4, 129],
  ["Trần Gia Hân", "0901000002", "retail", "44 Lê Văn Sỹ, Quận 3, TP.HCM", "", 729000, 2, 73],
  ["Lê Hoàng Nam", "0901000003", "retail", "22 Phan Xích Long, Phú Nhuận, TP.HCM", "Gọi trước khi giao", 2190000, 5, 219],
  ["Shop Đồng Phục Lớp 12A", "0901000004", "wholesale", "88 Cách Mạng Tháng 8, Quận 10, TP.HCM", "Mua sỉ áo và phụ kiện", 9350000, 8, 935],
  ["Văn phòng Nova Edu", "0901000005", "wholesale", "Khu đô thị Sala, TP.Thủ Đức", "Mua dụng cụ học tập định kỳ", 6820000, 6, 682],
  ["Phạm Thuỳ Linh", "0901000006", "retail", "9 Mai Chí Thọ, TP.Thủ Đức", "", 498000, 1, 50],
];

async function must(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function wipeTable(table) {
  await must(`wipe ${table}`, supabase.from(table).delete().neq("id", notZeroUuid));
}

async function main() {
  console.log("Resetting business data...");
  for (const table of ["invoice_items", "invoices", "product_variants", "product_attributes", "products", "customers", "categories"]) {
    await wipeTable(table);
  }

  console.log("Creating categories...");
  const insertedCategories = await must("insert categories", supabase.from("categories").insert(categories).select("id,name"));
  const categoryByName = Object.fromEntries(insertedCategories.map((category) => [category.name, category.id]));

  console.log("Creating products...");
  const productPayload = products.map(([name, code, categoryName, unit, cost, retail, wholesale, stock, minStock, image, description]) => ({
    name,
    code,
    category_id: categoryByName[categoryName],
    unit,
    cost_price: cost,
    retail_price: retail,
    wholesale_price: wholesale,
    stock,
    min_stock: minStock,
    image_url: image,
    status: "active",
    description,
  }));
  const insertedProducts = await must("insert products", supabase.from("products").insert(productPayload).select("*"));
  const productByCode = Object.fromEntries(insertedProducts.map((product) => [product.code, product]));

  console.log("Creating attributes and variants...");
  for (const [code, rows] of Object.entries(variants)) {
    const product = productByCode[code];
    const attributes = [...new Set(rows.flatMap((row) => Object.keys(row[2])))].map((attributeName) => ({
      product_id: product.id,
      attribute_name: attributeName,
      attribute_values: [...new Set(rows.map((row) => row[2][attributeName]).filter(Boolean))],
    }));
    await must(`insert attrs ${code}`, supabase.from("product_attributes").insert(attributes));
    await must(
      `insert variants ${code}`,
      supabase.from("product_variants").insert(
        rows.map(([variantName, sku, attrs, stock]) => ({
          product_id: product.id,
          variant_name: variantName,
          sku,
          attributes: attrs,
          stock,
          min_stock: 3,
          cost_price: product.cost_price,
          retail_price: product.retail_price,
          wholesale_price: product.wholesale_price,
          status: "active",
        })),
      ),
    );
  }

  console.log("Creating customers...");
  const insertedCustomers = await must(
    "insert customers",
    supabase
      .from("customers")
      .insert(
        customers.map(([name, phone, type, address, note, totalSpent, totalOrders, points]) => ({
          name,
          phone,
          type,
          address,
          note,
          total_spent: totalSpent,
          total_orders: totalOrders,
          points,
          status: "active",
        })),
      )
      .select("*"),
  );

  console.log("Creating sample invoices...");
  const invoicePlans = [
    { customer: "Nguyễn Minh Anh", number: "WEB00001", payment: "transfer", codes: [["TEE-PREMIUM-01", 1], ["BAG-TOTE-05", 1], ["PEN-PASTEL-09", 2]] },
    { customer: "Trần Gia Hân", number: "WEB00002", payment: "cash", codes: [["NOTE-A5-10", 2], ["TUMBLER-18", 1]] },
    { customer: "Lê Hoàng Nam", number: "WEB00003", payment: "transfer", codes: [["EARBUD-15", 1], ["MOUSE-SILENT-16", 1], ["LAMP-LED-13", 1]] },
    { customer: "Shop Đồng Phục Lớp 12A", number: "HD00004", payment: "transfer", saleType: "wholesale", codes: [["TEE-PREMIUM-01", 12], ["CAP-WASHED-08", 12]] },
    { customer: "Văn phòng Nova Edu", number: "HD00005", payment: "cash", saleType: "wholesale", codes: [["PEN-PASTEL-09", 20], ["NOTE-A5-10", 15], ["PENCIL-CASE-12", 20]] },
  ];
  const customerByName = Object.fromEntries(insertedCustomers.map((customer) => [customer.name, customer]));

  for (const [index, plan] of invoicePlans.entries()) {
    const customer = customerByName[plan.customer];
    const items = plan.codes.map(([code, quantity]) => {
      const product = productByCode[code];
      const unitPrice = plan.saleType === "wholesale" ? Number(product.wholesale_price) : Number(product.retail_price);
      return {
        product,
        quantity,
        unitPrice,
        subtotal: unitPrice * quantity,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = plan.saleType === "wholesale" ? Math.round(subtotal * 0.04 / 1000) * 1000 : 0;
    const total = subtotal - discount;
    const createdAt = new Date(Date.now() - (invoicePlans.length - index) * 86400000).toISOString();

    const [invoice] = await must(
      `insert invoice ${plan.number}`,
      supabase
        .from("invoices")
        .insert({
          invoice_number: plan.number,
          customer_id: customer.id,
          customer_name: customer.name,
          staff_name: plan.number.startsWith("WEB") ? "Website" : "Admin Demo",
          sale_type: plan.saleType || "retail",
          payment_method: plan.payment,
          subtotal,
          discount_amount: discount,
          tax_amount: 0,
          total,
          status: "completed",
          note: plan.number.startsWith("WEB") ? "Đơn mẫu từ website" : "Đơn mẫu tại quầy",
          created_at: createdAt,
        })
        .select("*"),
    );

    await must(
      `insert invoice items ${plan.number}`,
      supabase.from("invoice_items").insert(
        items.map((item) => ({
          invoice_id: invoice.id,
          product_id: item.product.id,
          product_code: item.product.code,
          product_name: item.product.name,
          unit: item.product.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.product.cost_price,
          subtotal: item.subtotal,
        })),
      ),
    );
  }

  console.log("Updating store settings...");
  const { data: existingSettings } = await supabase.from("store_settings").select("id").limit(1);
  const settingsPayload = {
    store_name: "Lumi Market",
    site_title: "Lumi Market - Thời trang, phụ kiện và dụng cụ học tập",
    address: "24 Nguyễn Huệ, Quận 1, TP.HCM",
    phone: "0909 888 777",
    email: "hello@lumimarket.vn",
    invoice_footer: "Cảm ơn quý khách. Hẹn gặp lại tại Lumi Market!",
    primary_color: "#0f6b57",
    accent_color: "#f3c557",
  };
  if (existingSettings?.[0]?.id) {
    await must("update settings", supabase.from("store_settings").update(settingsPayload).eq("id", existingSettings[0].id));
  } else {
    await must("insert settings", supabase.from("store_settings").insert(settingsPayload));
  }

  console.log("Done.");
  console.log(`Categories: ${categories.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Customers: ${customers.length}`);
  console.log(`Invoices: ${invoicePlans.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
