import { supabase } from '@/integrations/supabase/client';

export interface PrintData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  staffName: string;
  saleType: 'retail' | 'wholesale';
  paymentMethod: 'cash' | 'transfer';
  items: { product_name: string; quantity: number; unit: string; unit_price: number; subtotal: number; note?: string }[];
  subtotal: number;
  discountAmount: number;
  total: number;
  cashReceived?: number;
  change?: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceFooter?: string;
  logoUrl?: string;
}

const fmt = (n: number) => Number(n).toLocaleString('vi-VN');

function buildItemsHtml(items: PrintData['items']) {
  return items.map(it => `
    <tr><td style="padding:4px;border-bottom:1px solid #eee">${it.product_name}${it.note ? `<br><span style="font-size:11px;color:#666;font-style:italic">${it.note}</span>` : ''}</td>
    <td style="padding:4px;text-align:center;border-bottom:1px solid #eee">${it.quantity}${it.unit}</td>
    <td style="padding:4px;text-align:right;border-bottom:1px solid #eee">${fmt(it.unit_price)}đ</td>
    <td style="padding:4px;text-align:right;border-bottom:1px solid #eee">${fmt(it.subtotal)}đ</td></tr>
  `).join('');
}

function buildSummaryHtml(data: PrintData) {
  let html = `<div style="display:flex;justify-content:space-between"><span>Tổng tiền hàng</span><span>${fmt(data.subtotal)}đ</span></div>`;
  if (data.discountAmount > 0) {
    html += `<div style="display:flex;justify-content:space-between;color:red"><span>Giảm giá</span><span>-${fmt(data.discountAmount)}đ</span></div>`;
  }
  html += `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #333;padding-top:4px;margin-top:4px"><span>Thanh toán</span><span>${fmt(data.total)}đ</span></div>`;
  return html;
}

function template80mm(data: PrintData): string {
  const storeName = data.storeName || 'CUNG CẤP THỰC PHẨM SỈ VÀ LẺ';
  const footer = data.invoiceFooter || 'Cảm ơn quý khách! Hẹn gặp lại!';

  // Format date like: 15:04, Ngày 05 tháng 04 năm 2026
  const now = new Date();
  const dateStr = data.date;

  const totalQty = data.items.reduce((s, it) => s + it.quantity, 0);

  const itemsHtml = data.items.map(it => `
    <tr><td colspan="4" style="padding:2px 0 0 0;font-weight:bold">${it.product_name}</td></tr>
    ${it.note ? `<tr><td colspan="4" style="padding:0;font-size:11px;color:#666;font-style:italic">${it.note}</td></tr>` : ''}
    <tr>
      <td style="padding:0 0 2px 0">${fmt(it.unit_price)}</td>
      <td style="padding:0 0 2px 0;text-align:center">${it.quantity}</td>
      <td style="padding:0 0 2px 0;text-align:center">${it.unit}</td>
      <td style="padding:0 0 2px 0;text-align:right">${fmt(it.subtotal)}</td>
    </tr>
    <tr><td colspan="4" style="border-bottom:1px dashed #999"></td></tr>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hoá đơn ${data.invoiceNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Be Vietnam Pro',Arial,sans-serif;font-size:13px;padding:8mm;max-width:80mm;margin:auto}
.center{text-align:center}.bold{font-weight:bold}
table{width:100%;border-collapse:collapse}
@media print{body{padding:0}@page{margin:3mm;size:80mm auto}}</style></head><body>
<div class="center" style="margin-bottom:8px">
<p style="font-size:15px" class="bold">${storeName}</p>
${data.storeAddress ? `<p style="font-size:11px">Địa chỉ: ${data.storeAddress}</p>` : ''}
${data.storePhone ? `<p style="font-size:11px">Điện thoại: ${data.storePhone}</p>` : ''}
</div>

<div class="center" style="margin:10px 0">
<p class="bold" style="font-size:15px">HÓA ĐƠN BÁN HÀNG</p>
<p style="font-size:12px">Số HĐ: ${data.invoiceNumber}</p>
<p style="font-size:12px">${dateStr}</p>
</div>

<div style="margin:8px 0;font-size:12px">
<p>Khách hàng: ${data.customerName}</p>
${data.customerPhone ? `<p>SĐT: ${data.customerPhone}</p>` : ''}
${data.customerAddress ? `<p>Địa chỉ: ${data.customerAddress}</p>` : ''}
</div>

<table style="margin-top:6px">
<thead><tr style="border-top:1px solid #333;border-bottom:1px solid #333">
<th style="padding:4px 0;text-align:left;font-size:12px">Đơn giá</th>
<th style="padding:4px 0;text-align:center;font-size:12px">SL</th>
<th style="padding:4px 0;text-align:center;font-size:12px">ĐVT</th>
<th style="padding:4px 0;text-align:right;font-size:12px">T. Tiền</th>
</tr></thead>
<tbody>${itemsHtml}</tbody>
</table>

<div style="margin-top:10px;font-size:14px">
<div style="display:flex;justify-content:space-between" class="bold">
<span>Tổng số lượng:</span><span>${totalQty}</span>
</div>
<div style="display:flex;justify-content:space-between;margin-top:4px" class="bold">
<span>Tổng tiền hàng:</span><span>${fmt(data.subtotal)}</span>
</div>
${data.discountAmount > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:2px;color:red"><span>Giảm giá:</span><span>-${fmt(data.discountAmount)}</span></div>` : ''}
<div style="display:flex;justify-content:space-between;margin-top:4px;border-top:1px solid #333;padding-top:4px" class="bold">
<span>Thanh toán:</span><span>${fmt(data.total)}</span>
</div>
</div>

<div style="display:flex;justify-content:space-between;margin-top:20px;font-size:12px">
<div class="center" style="flex:1"><p>Người mua hàng</p></div>
<div class="center" style="flex:1"><p>Người bán hàng</p></div>
</div>

${footer ? `<div class="center" style="margin-top:20px;font-size:11px;color:#666"><p>${footer}</p></div>` : ''}
<script>window.onload=function(){window.print()}</script></body></html>`;
}

function templateA5(data: PrintData): string {
  const storeName = data.storeName || 'CUNG CẤP THỰC PHẨM SỈ VÀ LẺ';
  const footer = data.invoiceFooter || 'Cảm ơn quý khách! Hẹn gặp lại!';
  const logoHtml = data.logoUrl ? `<img src="${data.logoUrl}" style="max-height:50px;margin-bottom:6px" />` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hoá đơn ${data.invoiceNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Be Vietnam Pro',sans-serif;font-size:13px;padding:12mm;max-width:148mm;margin:auto}
.center{text-align:center}.bold{font-weight:bold}.mt{margin-top:10px}.mb{margin-bottom:10px}
table{width:100%;border-collapse:collapse}th{text-align:left;padding:6px;border-bottom:2px solid #333;font-size:12px}td{padding:5px}
.total{font-size:18px;font-weight:bold;border-top:2px solid #333;padding-top:8px;margin-top:8px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:10px}
@media print{body{padding:0}@page{margin:10mm;size:A5}}</style></head><body>
<div class="center mb">${logoHtml}<p style="font-size:20px" class="bold">${storeName}</p>
${data.storeAddress ? `<p style="font-size:11px;color:#666">${data.storeAddress}</p>` : ''}
${data.storePhone ? `<p style="font-size:11px;color:#666">ĐT: ${data.storePhone}</p>` : ''}
</div>
<div class="center mb" style="border-bottom:2px solid #333;padding-bottom:10px">
<p class="bold" style="font-size:18px">HOÁ ĐƠN BÁN HÀNG</p>
<p style="font-size:12px">Mã: ${data.invoiceNumber} · ${data.date}</p></div>
<div style="display:flex;justify-content:space-between;font-size:12px;margin:10px 0">
<div><p><b>Khách hàng:</b> ${data.customerName}</p><p><b>Loại:</b> ${data.saleType === 'wholesale' ? 'Sỉ' : 'Lẻ'}</p></div>
<div style="text-align:right"><p><b>Thu ngân:</b> ${data.staffName}</p><p><b>Thanh toán:</b> ${data.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</p></div></div>
<table><thead><tr><th>Sản phẩm</th><th style="text-align:center">SL</th><th style="text-align:right">Đơn giá</th><th style="text-align:right">Thành tiền</th></tr></thead>
<tbody>${buildItemsHtml(data.items)}</tbody></table>
<div class="mt">${buildSummaryHtml(data)}</div>
<div class="center mt" style="font-size:11px;color:#666;border-top:1px dashed #999;padding-top:10px;margin-top:16px">
<p>${footer}</p></div>
<script>window.onload=function(){window.print()}</script></body></html>`;
}

function templateA4(data: PrintData): string {
  const storeName = data.storeName || 'CUNG CẤP THỰC PHẨM SỈ VÀ LẺ';
  const footer = data.invoiceFooter || 'Cảm ơn quý khách! Hẹn gặp lại!';
  const logoHtml = data.logoUrl ? `<img src="${data.logoUrl}" style="max-height:60px;margin-bottom:8px" />` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hoá đơn ${data.invoiceNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Be Vietnam Pro',sans-serif;font-size:14px;padding:20mm;max-width:210mm;margin:auto}
.center{text-align:center}.bold{font-weight:bold}.mt{margin-top:12px}.mb{margin-bottom:12px}
table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:13px;background:#f5f5f5}td{padding:6px 8px}
tr:nth-child(even){background:#fafafa}
.total{font-size:20px;font-weight:bold;border-top:3px solid #333;padding-top:10px;margin-top:10px}
@media print{body{padding:0}@page{margin:15mm;size:A4}}</style></head><body>
<div class="center mb">${logoHtml}<p style="font-size:24px" class="bold">${storeName}</p>
${data.storeAddress ? `<p style="font-size:12px;color:#666">${data.storeAddress}</p>` : ''}
${data.storePhone ? `<p style="font-size:12px;color:#666">ĐT: ${data.storePhone}</p>` : ''}
</div>
<div class="center mb" style="border-bottom:3px solid #333;padding-bottom:12px">
<p class="bold" style="font-size:22px">HOÁ ĐƠN BÁN HÀNG</p>
<p style="font-size:13px">Mã: ${data.invoiceNumber} · ${data.date}</p></div>
<div style="display:flex;justify-content:space-between;font-size:13px;margin:14px 0;padding:10px;background:#f9f9f9;border-radius:6px">
<div><p><b>Khách hàng:</b> ${data.customerName}</p><p><b>Loại bán:</b> ${data.saleType === 'wholesale' ? 'Sỉ' : 'Lẻ'}</p></div>
<div style="text-align:right"><p><b>Thu ngân:</b> ${data.staffName}</p><p><b>Thanh toán:</b> ${data.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</p></div></div>
<table><thead><tr><th style="width:5%">#</th><th>Sản phẩm</th><th style="text-align:center">Số lượng</th><th style="text-align:right">Đơn giá</th><th style="text-align:right">Thành tiền</th></tr></thead>
<tbody>${data.items.map((it, i) => `
<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${i + 1}</td>
<td style="padding:6px 8px;border-bottom:1px solid #eee">${it.product_name}${it.note ? `<br><span style="font-size:12px;color:#666;font-style:italic">${it.note}</span>` : ''}</td>
<td style="padding:6px 8px;text-align:center;border-bottom:1px solid #eee">${it.quantity} ${it.unit}</td>
<td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${fmt(it.unit_price)}đ</td>
<td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee">${fmt(it.subtotal)}đ</td></tr>`).join('')}
</tbody></table>
<div class="mt" style="max-width:300px;margin-left:auto">${buildSummaryHtml(data)}</div>
<div style="display:flex;justify-content:space-between;margin-top:40px;font-size:13px">
<div class="center" style="flex:1"><p class="bold">Khách hàng</p><p style="font-size:11px;color:#999">(Ký, ghi rõ họ tên)</p></div>
<div class="center" style="flex:1"><p class="bold">Người bán</p><p style="font-size:11px;color:#999">(Ký, ghi rõ họ tên)</p></div></div>
<div class="center mt" style="font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:12px;margin-top:30px">
<p>${footer}</p></div>
<script>window.onload=function(){window.print()}</script></body></html>`;
}

const builtInTemplates: Record<string, (data: PrintData) => string> = {
  default_80mm: template80mm,
  default_a5: templateA5,
  default_a4: templateA4,
};

export async function getTemplates() {
  const { data } = await supabase.from('print_templates').select('*').order('created_at');
  return (data || []) as unknown as { id: string; name: string; type: string; paper_size: string; content: string; is_default: boolean }[];
}

export function renderTemplate(templateContent: string, data: PrintData): string {
  if (builtInTemplates[templateContent]) {
    return builtInTemplates[templateContent](data);
  }
  return templateContent
    .replace(/\{\{store_name\}\}/g, data.storeName || '')
    .replace(/\{\{store_address\}\}/g, data.storeAddress || '')
    .replace(/\{\{store_phone\}\}/g, data.storePhone || '')
    .replace(/\{\{logo_url\}\}/g, data.logoUrl || '')
    .replace(/\{\{invoice_number\}\}/g, data.invoiceNumber)
    .replace(/\{\{date\}\}/g, data.date)
    .replace(/\{\{customer_name\}\}/g, data.customerName)
    .replace(/\{\{staff_name\}\}/g, data.staffName)
    .replace(/\{\{sale_type\}\}/g, data.saleType === 'wholesale' ? 'Sỉ' : 'Lẻ')
    .replace(/\{\{payment_method\}\}/g, data.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản')
    .replace(/\{\{items_html\}\}/g, buildItemsHtml(data.items))
    .replace(/\{\{summary_html\}\}/g, buildSummaryHtml(data))
    .replace(/\{\{subtotal\}\}/g, fmt(data.subtotal))
    .replace(/\{\{discount\}\}/g, fmt(data.discountAmount))
    .replace(/\{\{total\}\}/g, fmt(data.total))
    .replace(/\{\{footer\}\}/g, data.invoiceFooter || '');
}

export function openPrintWindow(html: string) {
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function getDefaultTemplateContent(paperSize: string): string {
  switch (paperSize) {
    case '80mm': return 'default_80mm';
    case 'A4': return 'default_a4';
    case 'A5': return 'default_a5';
    default: return 'default_80mm';
  }
}
