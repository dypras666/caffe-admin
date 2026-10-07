/**
 * WhatsApp Receipt & Share Helper
 * Pure business text format without emojis, emoticons, or AI filler.
 * All cafe data is dynamic per tenant.
 */

/**
 * Format phone number for WhatsApp wa.me API
 * Converts 08123... or 8123... to 628123...
 */
export function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Build clean WhatsApp receipt message
 * Dynamic shop details, strictly no emojis or emoticons, professional format.
 */
export function buildWhatsAppReceiptText({
  shop_name = '',
  address = '',
  phone = '',
  currency = 'Rp',
  order = {},
  items = [],
  publicUrl = null,
}) {
  const formatMoney = (v) => `${currency} ${Number(v || 0).toLocaleString('id-ID')}`;
  const dt = order.created_at
    ? new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

  const cafeTitle = (shop_name || order.shop_name || order.branch_name || '').trim();
  const orderNum = order.order_number || '-';
  const orderType = (order.order_type || 'dine_in').toUpperCase();
  const table = order.table_name || order.table_number ? ` (Meja ${order.table_name || order.table_number})` : '';
  const customer = order.customer_name ? `\nPelanggan: ${order.customer_name}` : '';
  const cashier = order.served_by_name ? `\nKasir: ${order.served_by_name}` : '';
  const isPaid = order.payment_status === 'paid';
  const payMethod = (order.payment_method || 'Tunai').toUpperCase();
  const statusStr = isPaid ? 'LUNAS' : 'BELUM LUNAS';

  const divider = '--------------------------------';

  let lines = [];
  if (cafeTitle) lines.push(`*${cafeTitle.toUpperCase()}*`);
  if (address) lines.push(address);
  if (phone) lines.push(`Telp: ${phone}`);

  lines.push(divider);
  lines.push('*BUKTI PEMBAYARAN*');
  lines.push(divider);
  lines.push(`No. Order: #${orderNum}`);
  lines.push(`Waktu: ${dt}`);
  lines.push(`Tipe: ${orderType}${table}${customer}${cashier}`);
  lines.push(divider);
  lines.push('*RINCIAN PESANAN:*');

  let num = 1;
  for (const it of items) {
    const qty = parseInt(it.quantity) || 1;
    const unitPrice = it.unit_price || it.product_price || 0;
    const subtotal = it.subtotal != null ? it.subtotal : (unitPrice * qty);

    const variants = it.variants_selected
      ? (typeof it.variants_selected === 'string' ? JSON.parse(it.variants_selected) : it.variants_selected)
      : (it.variants || []);
    const variantStr = Array.isArray(variants) && variants.length > 0
      ? variants.map(v => typeof v === 'object' ? (v.option_name || v.name || '') : v).filter(Boolean).join(', ')
      : '';

    const addons = it.addons_selected
      ? (typeof it.addons_selected === 'string' ? JSON.parse(it.addons_selected) : it.addons_selected)
      : (it.addons || []);
    const addonStr = Array.isArray(addons) && addons.length > 0
      ? addons.map(a => typeof a === 'object' ? `${a.addon_name || a.name || ''}${a.qty > 1 ? ` x${a.qty}` : ''}` : a).filter(Boolean).join(', ')
      : '';

    const cleanName = (variantStr || addonStr)
      ? it.product_name.replace(/\s*\([^)]*\)$/, '').trim() || it.product_name
      : it.product_name;

    let itemLines = [`${num++}. *${qty}x ${cleanName}*`];
    if (variantStr) itemLines.push(`   Varian: ${variantStr}`);
    if (addonStr) itemLines.push(`   Addon: ${addonStr}`);
    if (it.notes) itemLines.push(`   Catatan: ${it.notes}`);
    itemLines.push(`   ${formatMoney(subtotal)}`);

    lines.push(itemLines.join('\n'));
  }

  lines.push(divider);
  lines.push(`Subtotal: ${formatMoney(order.subtotal != null ? order.subtotal : order.total)}`);

  if (Number(order.discount) > 0) {
    lines.push(`Diskon: - ${formatMoney(order.discount)}`);
  }
  if (Number(order.tax) > 0) {
    lines.push(`Pajak: + ${formatMoney(order.tax)}`);
  }

  lines.push(divider);
  lines.push(`*TOTAL: ${formatMoney(order.total)}*`);
  lines.push(`Pembayaran: ${payMethod} (${statusStr})`);

  if (Number(order.paid_amount) > 0 && order.payment_method === 'cash') {
    lines.push(`Tunai: ${formatMoney(order.paid_amount)}`);
    if (Number(order.change_amount) >= 0) {
      lines.push(`Kembalian: ${formatMoney(order.change_amount)}`);
    }
  }

  if (publicUrl) {
    lines.push(divider);
    lines.push(`Lihat Nota Digital:`);
    lines.push(publicUrl);
  }

  lines.push(divider);
  lines.push('Terima kasih atas kunjungan Anda.');
  lines.push('Simpan pesan ini sebagai bukti pembayaran.');

  return lines.join('\n');
}

/**
 * Open WhatsApp Share URL
 */
export function openWhatsAppShare({ phone = '', text = '' }) {
  const formattedPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(text);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank');
}
