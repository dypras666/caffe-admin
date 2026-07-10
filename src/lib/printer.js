/**
 * Browser-based thermal printer helper.
 * Uses window.print() with thermal-optimized CSS for receipt/kitchen printing.
 * For network printers, sends ESC/POS raw data via fetch to a local print bridge.
 */

// Generate receipt HTML for window.print()
export function buildReceiptHTML(receipt, printer) {
  const { shop_name, address, phone, currency = 'Rp', order, items } = receipt;
  const charW = printer?.char_per_line || 42;
  const divider = '─'.repeat(charW);

  const formatMoney = (v) => `${currency} ${Number(v || 0).toLocaleString('id')}`;
  const formatDateTime = (d) => new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  const padLine = (left, right, width = charW) => {
    const space = width - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };

  const headerLines = (printer?.header_text || shop_name || 'Café Azzura').split('\n');
  const footerLines = (printer?.footer_text || 'Terima kasih!').split('\n');

  let body = `
    <div class="receipt">
      <div class="center bold">${headerLines.map(l => `<div>${l}</div>`).join('')}</div>
      ${address ? `<div class="center small">${address}</div>` : ''}
      ${phone ? `<div class="center small">Tel: ${phone}</div>` : ''}
      <div class="divider">${divider}</div>
      <div class="row"><span>No:</span><span class="bold">${order.order_number}</span></div>
      <div class="row"><span>Tgl:</span><span>${formatDateTime(order.created_at)}</span></div>
      <div class="row"><span>Tipe:</span><span class="capitalize">${order.order_type}</span></div>
      ${order.table_name || order.table_number ? `<div class="row"><span>Meja:</span><span>${order.table_name || order.table_number}</span></div>` : ''}
      ${order.customer_name ? `<div class="row"><span>Pelanggan:</span><span>${order.customer_name}</span></div>` : ''}
      ${order.served_by_name ? `<div class="row"><span>Kasir:</span><span>${order.served_by_name}</span></div>` : ''}
      <div class="divider">${divider}</div>
      <div class="items-header row"><span class="bold">Item</span><span class="bold">Harga</span></div>
      <div class="divider">${'─'.repeat(charW)}</div>
  `;

  for (const item of items) {
    const unitPrice = item.unit_price || item.product_price;
    const addonsTotal = item.addons_total || 0;
    const total = Number(item.subtotal || unitPrice * item.quantity);
    const variants = item.variants_selected ? (typeof item.variants_selected === 'string' ? JSON.parse(item.variants_selected) : item.variants_selected) : [];
    const addons = item.addons_selected ? (typeof item.addons_selected === 'string' ? JSON.parse(item.addons_selected) : item.addons_selected) : [];

    const variantLine = variants.length > 0
      ? variants.map(v => v.option_name || '').filter(Boolean).join(', ')
      : '';
    body += `
      <div class="item-name">${item.product_name}</div>
      ${variantLine ? `<div class="small indent">${variantLine}</div>` : ''}
      <div class="row indent">
        <span>${item.quantity} x ${formatMoney(unitPrice)}</span>
        <span>${formatMoney(total)}</span>
      </div>
      ${addons.length > 0 ? `<div class="small indent">+ ${addons.map(a => `${a.addon_name}${a.qty > 1 ? ` x${a.qty}` : ''} (${formatMoney(a.unit_price * a.qty)})`).join(', ')}</div>` : ''}
      ${item.notes ? `<div class="small indent">* ${item.notes}</div>` : ''}
    `;
  }

  body += `
      <div class="divider">${divider}</div>
      <div class="row"><span>Subtotal</span><span>${formatMoney(order.subtotal)}</span></div>
      ${Number(order.discount) > 0 ? `<div class="row"><span>Diskon</span><span>- ${formatMoney(order.discount)}</span></div>` : ''}
      ${Number(order.tax) > 0 ? `<div class="row"><span>Pajak</span><span>${formatMoney(order.tax)}</span></div>` : ''}
      <div class="divider">${'─'.repeat(charW)}</div>
      <div class="row bold large"><span>TOTAL</span><span>${formatMoney(order.total)}</span></div>
      <div class="row"><span>Pembayaran</span><span class="capitalize">${order.payment_method}</span></div>
      <div class="divider">${divider}</div>
      <div class="center small">${footerLines.map(l => `<div>${l}</div>`).join('')}</div>
      <div class="cut"></div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${buildReceiptCSS(printer?.paper_width || '80mm')}</style>
</head>
<body>${body}</body>
</html>`;
}

// Generate kitchen ticket HTML
export function buildKitchenHTML(ticket, printer) {
  const { order, items } = ticket;
  const charW = printer?.char_per_line || 42;
  const divider = '═'.repeat(charW);
  const formatDateTime = (d) => new Date(d).toLocaleString('id-ID', { timeStyle: 'short' });

  let body = `
    <div class="ticket">
      <div class="center big bold">** ${(printer?.header_text || 'KITCHEN TICKET').toUpperCase()} **</div>
      <div class="divider">${divider}</div>
      <div class="row"><span class="bold">Order:</span><span class="big bold">${order.order_number}</span></div>
      <div class="row"><span>Waktu:</span><span>${formatDateTime(order.created_at)}</span></div>
      <div class="row"><span>Tipe:</span><span class="big capitalize">${order.order_type}</span></div>
      ${order.table_name || order.table_number ? `<div class="row meja"><span>MEJA:</span><span class="big bold">${order.table_name || order.table_number}</span></div>` : ''}
      <div class="divider">${divider}</div>
  `;

  for (const item of items) {
    const addons = item.addons_selected ? (typeof item.addons_selected === 'string' ? JSON.parse(item.addons_selected) : item.addons_selected) : [];
    body += `
      <div class="item">
        <span class="qty">${item.quantity}x</span>
        <span class="name">${item.product_name}</span>
      </div>
      ${addons.length > 0 ? `<div class="note">  + ${addons.map(a => `${a.addon_name}${a.qty > 1 ? ` x${a.qty}` : ''}`).join(', ')}</div>` : ''}
      ${item.notes ? `<div class="note">  !! ${item.notes}</div>` : ''}
    `;
  }

  if (order.notes) {
    body += `<div class="divider">${'─'.repeat(charW)}</div><div class="center bold">CATATAN: ${order.notes}</div>`;
  }

  body += `<div class="divider">${divider}</div><div class="cut"></div></div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${buildKitchenCSS(printer?.paper_width || '80mm')}</style>
</head>
<body>${body}</body>
</html>`;
}

// Open print window
export function printHTML(html) {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk fitur print.');
    return;
  }

  // Write HTML and wait for load
  win.document.open();
  win.document.write(html);
  win.document.close();

  // Wait for window to fully load before printing
  win.onload = () => {
    win.focus();
    // Give extra time for rendering
    setTimeout(() => {
      win.print();
      // Close after print dialog is handled
      setTimeout(() => {
        win.close();
      }, 100);
    }, 500);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    if (win && !win.closed) {
      win.focus();
      win.print();
    }
  }, 1000);
}

// Send to network printer (requires local print bridge server)
export async function printToNetwork(html, printer) {
  if (!printer.ip) throw new Error('IP printer tidak tersedia');

  const url = `http://${printer.ip}:${printer.port}/print`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, printer_id: printer.id }),
    });

    if (!response.ok) {
      throw new Error(`Network printer error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Print to network failed:', error);
    throw new Error(`Gagal print ke ${printer.ip}:${printer.port} - ${error.message}`);
  }
}

// ─── Device-local printer storage (per browser/device) ───────
const DEVICE_PRINTER_KEY = 'cafe_device_printer';

export function getDevicePrinters() {
  try {
    const raw = localStorage.getItem(DEVICE_PRINTER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setDevicePrinter(type, config) {
  // type: 'receipt' | 'kitchen'
  const current = getDevicePrinters();
  current[type] = config;
  localStorage.setItem(DEVICE_PRINTER_KEY, JSON.stringify(current));
}

export function removeDevicePrinter(type) {
  const current = getDevicePrinters();
  delete current[type];
  localStorage.setItem(DEVICE_PRINTER_KEY, JSON.stringify(current));
}

export function getDevicePrinter(type) {
  return getDevicePrinters()[type] || null;
}

// ─── Bluetooth (Web Bluetooth API) ───────────────────────────
export async function scanBluetoothPrinters() {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth tidak didukung browser ini');
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // common BT printer service
    ],
    optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'],
  });
  return {
    id: device.id,
    name: device.name || 'Bluetooth Printer',
    connection: 'bluetooth',
    bluetooth_device_id: device.id,
    paper_width: '80mm',
    char_per_line: 42,
  };
}

export async function printViaBluetooth(html, device_id) {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth tidak didukung');
  // Web Bluetooth for thermal printers — send ESC/POS via GATT characteristic
  // This is a best-effort implementation; actual ESC/POS encoding is browser-limited
  // Fallback: open print window (most reliable cross-browser)
  printHTML(html);
}

// ─── USB (Web USB API) ───────────────────────────────────────
export async function scanUSBPrinters() {
  if (!navigator.usb) throw new Error('Web USB tidak didukung browser ini');
  const device = await navigator.usb.requestDevice({
    filters: [{ classCode: 7 }], // USB printer class
  });
  return {
    id: `usb-${device.vendorId}-${device.productId}`,
    name: device.productName || `USB Printer (${device.vendorId}:${device.productId})`,
    connection: 'usb',
    usb_vendor_id: device.vendorId,
    usb_product_id: device.productId,
    paper_width: '80mm',
    char_per_line: 42,
  };
}

// ─── Smart print — device-local first, site default fallback ─
export async function smartPrint(html, sitePrinter, type = 'receipt') {
  // 1. Check device-local printer override
  const devicePrinter = getDevicePrinter(type);
  const printer = devicePrinter || sitePrinter;

  if (!printer) {
    printHTML(html);
    return;
  }

  const conn = printer.connection || 'browser';

  if (conn === 'network' && printer.ip) {
    try {
      await printToNetwork(html, printer);
      return;
    } catch (error) {
      if (confirm(`Network print gagal: ${error.message}\n\nPrint via browser?`)) {
        printHTML(html);
      }
    }
  } else if (conn === 'bluetooth') {
    await printViaBluetooth(html, printer.bluetooth_device_id);
  } else {
    // browser / USB — use window.print()
    printHTML(html);
  }
}

// ─── Paper width helpers ──────────────────────────────────────

/**
 * Get CSS page size based on printer paper_width
 * '58mm' → 58mm, '80mm' → 80mm, 'dotmatrix' → 210mm (A4), 'A4' → A4
 */
export function getPaperSize(paperWidth) {
  switch (paperWidth) {
    case '58mm': return { width: '58mm', fontSize: '11px', charPerLine: 32 };
    case '80mm': return { width: '80mm', fontSize: '12px', charPerLine: 42 };
    case 'dotmatrix': return { width: '210mm', fontSize: '12px', charPerLine: 80, font: 'monospace' };
    case 'A4': return { width: '210mm', fontSize: '11px', charPerLine: 80 };
    default: return { width: '80mm', fontSize: '12px', charPerLine: 42 };
  }
}

/**
 * Build receipt CSS for given paper size
 */
export function buildReceiptCSS(paperWidth) {
  const { width, fontSize, font } = getPaperSize(paperWidth);
  const isDotMatrix = paperWidth === 'dotmatrix';
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${font || (isDotMatrix ? '"Courier New", monospace' : '"Courier New", monospace')};
      font-size: ${fontSize};
      width: ${width};
      ${isDotMatrix ? 'line-height: 1.4;' : ''}
    }
    .receipt { padding: 2mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: ${isDotMatrix ? '14px' : '14px'}; }
    .small { font-size: ${isDotMatrix ? '11px' : '10px'}; }
    .capitalize { text-transform: capitalize; }
    .divider { letter-spacing: -1px; margin: 2px 0; overflow: hidden; white-space: nowrap; }
    .row { display: flex; justify-content: space-between; gap: 4px; }
    .indent { padding-left: 8px; }
    .item-name { font-weight: bold; margin-top: 3px; }
    .cut { margin-top: 8mm; border-top: 1px dashed #000; }
    @media print {
      @page { margin: 0; size: ${width} auto; }
      body { width: 100%; }
      .cut { display: none; }
    }
  `;
}

/**
 * Build kitchen ticket CSS for given paper size
 */
export function buildKitchenCSS(paperWidth) {
  const { width, fontSize } = getPaperSize(paperWidth);
  const isDotMatrix = paperWidth === 'dotmatrix';
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: ${isDotMatrix ? '13px' : '14px'}; width: ${width}; }
    .ticket { padding: 2mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: ${isDotMatrix ? '16px' : '18px'}; }
    .capitalize { text-transform: capitalize; }
    .divider { letter-spacing: -1px; margin: 4px 0; overflow: hidden; }
    .row { display: flex; justify-content: space-between; gap: 4px; margin: 2px 0; }
    .meja { margin: 4px 0; }
    .item { display: flex; align-items: baseline; gap: 6px; margin: 6px 0; font-size: ${isDotMatrix ? '14px' : '16px'}; font-weight: bold; }
    .qty { font-size: ${isDotMatrix ? '16px' : '20px'}; font-weight: 900; min-width: 30px; }
    .name { flex: 1; }
    .note { font-size: ${isDotMatrix ? '11px' : '12px'}; padding-left: 8px; font-style: italic; }
    .cut { margin-top: 8mm; border-top: 1px dashed #000; }
    @media print {
      @page { margin: 0; size: ${width} auto; }
      body { width: 100%; }
      .cut { display: none; }
    }
  `;
}
