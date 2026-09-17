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

// ─── ESC/POS encoder ─────────────────────────────────────────
// Converts receipt HTML text content to ESC/POS byte commands
export function buildEscPos(receipt, printer) {
  const { shop_name, address, phone, order, items, currency = 'Rp', qrisOnly, qris, amount } = receipt;
  const charW = printer?.char_per_line || 42;

  const ESC = 0x1B;
  const GS  = 0x1D;
  const enc = new TextEncoder();

  const bytes = [];
  const push  = (...bs) => bytes.push(...bs);
  const text  = (s) => bytes.push(...enc.encode(s));
  const line  = (s = '') => { text(s); push(0x0A); };
  const divider = () => line('-'.repeat(charW));

  const pad = (left, right, w = charW) => {
    const gap = w - left.length - right.length;
    return left + ' '.repeat(Math.max(1, gap)) + right;
  };
  const center = (s, w = charW) => {
    const pad = Math.max(0, Math.floor((w - s.length) / 2));
    return ' '.repeat(pad) + s;
  };
  const money = (v) => `${currency} ${Number(v || 0).toLocaleString('id')}`;

  // Init + set encoding
  push(ESC, 0x40);               // ESC @ — init
  push(ESC, 0x74, 0x00);        // ESC t 0 — PC437 codepage (safe for ASCII)

  // Header — bold + center
  push(ESC, 0x61, 0x01);        // ESC a 1 — center align
  push(ESC, 0x45, 0x01);        // ESC E 1 — bold on

  if (qrisOnly) {
    line(center('TAGIHAN PEMBAYARAN'));
    push(ESC, 0x45, 0x00); // bold off
    line();
    line(center('Total Pembayaran:'));
    push(ESC, 0x45, 0x01); // bold on
    line(center(money(amount)));
    push(ESC, 0x45, 0x00); // bold off
    line();
    line(center('Silakan scan QRIS di bawah ini:'));
    line();
    
    if (qris) {
      const len = qris.length + 3;
      const pL = len & 0xFF;
      const pH = (len >> 8) & 0xFF;
      
      push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // Select model 2
      push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);       // Size (0x01 to 0x10, 8 is large)
      push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);       // Error correction L (0x31 = L)
      push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);           // Store data
      text(qris);
      push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);       // Print QR
      line();
      line();
    }
    
    push(0x0A, 0x0A, 0x0A);       // feed
    push(GS, 0x56, 0x41, 0x00);   // partial cut
    return new Uint8Array(bytes);
  }

  const headerLines = (printer?.header_text || shop_name || 'Café Azzura').split('\n');
  headerLines.forEach(l => line(l));
  push(ESC, 0x45, 0x00);        // ESC E 0 — bold off
  if (address) line(address);
  if (phone)   line(`Tel: ${phone}`);
  push(ESC, 0x61, 0x00);        // ESC a 0 — left align

  divider();
  line(pad('No:', order.order_number || '-'));
  const dt = new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  line(pad('Tgl:', dt));
  if (order.table_number || order.table_name) line(pad('Meja:', order.table_name || order.table_number));
  if (order.customer_name) line(pad('Pelanggan:', order.customer_name));
  if (order.served_by_name) line(pad('Kasir:', order.served_by_name));
  divider();

  line(pad('Item', 'Harga'));
  divider();

  for (const item of items) {
    const unitPrice = item.unit_price || item.product_price || 0;
    const total = Number(item.subtotal || unitPrice * item.quantity);
    line(item.product_name.substring(0, charW));
    line(pad(`  ${item.quantity} x ${money(unitPrice)}`, money(total)));
    if (item.notes) line(`  *${item.notes}`.substring(0, charW));
  }

  divider();
  line(pad('Subtotal', money(order.subtotal)));
  if (Number(order.discount) > 0) line(pad('Diskon', `- ${money(order.discount)}`));
  if (Number(order.tax) > 0) line(pad('Pajak', money(order.tax)));
  divider();

  push(ESC, 0x45, 0x01);
  push(GS, 0x21, 0x11);         // GS ! — double width+height
  line(pad('TOTAL', money(order.total)));
  push(GS, 0x21, 0x00);
  push(ESC, 0x45, 0x00);

  line(pad('Bayar', (order.payment_method || '-').toUpperCase()));
  divider();

  push(ESC, 0x61, 0x01);
  const footerLines = (printer?.footer_text || 'Terima kasih!').split('\n');
  footerLines.forEach(l => line(center(l, charW)));
  push(ESC, 0x61, 0x00);

  // Feed + cut
  push(0x0A, 0x0A, 0x0A, 0x0A);
  push(GS, 0x56, 0x42, 0x00);   // GS V B 0 — full cut

  return new Uint8Array(bytes);
}

// ─── Bluetooth (Web Bluetooth API) ───────────────────────────
// Known thermal printer GATT service/characteristic UUIDs
const BT_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // common generic printer
  '00001101-0000-1000-8000-00805f9b34fb', // serial port profile
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter, common clone
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Peripage / Phomemo
];
const BT_PRINTER_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '00002a00-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f', // Xprinter write char
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // Peripage write char
];

// Persistent BT device cache — survives across print calls within the session
const _btCache = new Map(); // deviceId → { device, server, characteristic }

export async function scanBluetoothPrinters() {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth tidak didukung browser ini. Gunakan Chrome/Edge di desktop.');

  const device = await navigator.bluetooth.requestDevice({
    filters: BT_PRINTER_SERVICES.map(s => ({ services: [s] })),
    optionalServices: BT_PRINTER_SERVICES,
    // acceptAllDevices as last resort if no service filter matches
  }).catch(() =>
    navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BT_PRINTER_SERVICES,
    })
  );

  return {
    id: device.id,
    name: device.name || 'Bluetooth Printer',
    connection: 'bluetooth',
    bluetooth_device_id: device.id,
    paper_width: '80mm',
    char_per_line: 42,
  };
}

async function getBtCharacteristic(device) {
  // Connect GATT server
  if (!device.gatt.connected) {
    await device.gatt.connect();
  }
  const server = device.gatt;

  // Try each known service
  for (const svcUuid of BT_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(svcUuid);
      // Try each known characteristic
      for (const charUuid of BT_PRINTER_CHARS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          if (char.properties.write || char.properties.writeWithoutResponse) {
            return { service, char };
          }
        } catch {}
      }
      // Fallback: enumerate all characteristics in this service
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          return { service, char: c };
        }
      }
    } catch {}
  }
  throw new Error('Karakteristik write tidak ditemukan. Printer mungkin tidak kompatibel dengan Web Bluetooth.');
}

// Split data into chunks (BT MTU typically 512 bytes, safe with 100-200)
async function writeInChunks(char, data, chunkSize = 100) {
  const withResponse = char.properties.write;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (withResponse) {
      await char.writeValue(chunk);
    } else {
      await char.writeValueWithoutResponse(chunk);
    }
    // Small delay between chunks to avoid buffer overflow
    await new Promise(r => setTimeout(r, 20));
  }
}

export async function printViaBluetooth(receipt, printer) {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth tidak didukung');

  let deviceId = printer?.bluetooth_device_id;
  let device;

  if (!deviceId) {
    // Pick or ask the user
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BT_PRINTER_SERVICES,
    });
    deviceId = device.id;
  } else {
    try {
      const devices = await navigator.bluetooth.getDevices?.() || [];
      device = devices.find(d => d.id === deviceId);
    } catch {}

    if (!device) {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BT_PRINTER_SERVICES,
      });
      if (device.id !== deviceId) {
        throw new Error('Pilih printer yang sama seperti saat konfigurasi.');
      }
    }
  }

  device.addEventListener('gattserverdisconnected', () => {
    _btCache.delete(deviceId);
  });

  // Get or reuse cached characteristic
  let cached = _btCache.get(deviceId);
  if (!cached || !device.gatt.connected) {
    cached = await getBtCharacteristic(device);
    _btCache.set(deviceId, { device, ...cached });
  }

  const escpos = buildEscPos(receipt, printer);
  await writeInChunks(cached.char, escpos);
}

// Disconnect all cached BT devices (call on logout/page unload)
export function disconnectAllBluetooth() {
  for (const { device } of _btCache.values()) {
    device.gatt?.disconnect?.();
  }
  _btCache.clear();
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

export async function printViaUSB(receipt, printer) {
  if (!navigator.usb) throw new Error('Web USB tidak didukung');
  
  const vendorId = printer?.usb_vendor_id;
  const productId = printer?.usb_product_id;
  
  let device;
  if (!vendorId || !productId) {
    // Pick the first authorized printer, or ask the user
    const devices = await navigator.usb.getDevices();
    const authorized = devices.filter(d => d.deviceClass === 7 || d.deviceVersionMajor !== undefined);
    if (authorized.length > 0) {
      device = authorized[0];
    } else {
      device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] });
    }
  } else {
    const devices = await navigator.usb.getDevices();
    device = devices.find(d => d.vendorId === vendorId && d.productId === productId);
    if (!device) {
      device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] });
      if (device.vendorId !== vendorId || device.productId !== productId) {
        throw new Error('Pilih printer USB yang sama dengan yang dikonfigurasi.');
      }
    }
  }

  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  
  // Claim first interface (usually the printer interface)
  const ifaceIndex = device.configuration.interfaces[0].interfaceNumber;
  await device.claimInterface(ifaceIndex);

  const iface = device.configuration.interfaces[0].alternate;
  let outEndpoint = null;
  for (const ep of iface.endpoints) {
    if (ep.direction === 'out' && ep.type === 'bulk') {
      outEndpoint = ep.endpointNumber;
      break;
    }
  }
  
  if (outEndpoint === null) throw new Error('Output endpoint USB tidak ditemukan pada printer ini.');

  const escpos = buildEscPos(receipt, printer);
  // Send data in chunks of 64 bytes (common for USB)
  const chunkSize = 64;
  for (let i = 0; i < escpos.length; i += chunkSize) {
    const chunk = escpos.slice(i, i + chunkSize);
    await device.transferOut(outEndpoint, chunk);
  }
}

// ─── Smart print — device-local first, site default fallback ─
// html: pre-built HTML string for browser/network print
// receipt: raw receipt data object for ESC/POS (Bluetooth/USB)
export async function smartPrint(html, sitePrinter, type = 'receipt', receipt = null) {
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
    if (!receipt) throw new Error('Data receipt diperlukan untuk print Bluetooth');
    await printViaBluetooth(receipt, printer);
  } else if (conn === 'usb') {
    if (!receipt) throw new Error('Data receipt diperlukan untuk print USB');
    await printViaUSB(receipt, printer);
  } else {
    // browser — use window.print()
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

/**
 * Build QRIS print HTML for given paper size
 */
export function buildQrisHTML(qrisDataUrl, printer) {
  const paperWidth = printer?.paper_width || '80mm';
  const { width } = getPaperSize(paperWidth);
  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 14px; width: ${width}; text-align: center; }
    .qris-container { padding: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    img { max-width: 100%; height: auto; }
    h3 { margin-bottom: 2mm; font-size: 16px; }
    p { font-size: 12px; margin-top: 2mm; }
    @media print {
      @page { margin: 0; size: ${width} auto; }
      body { width: 100%; }
    }
  `;
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Print QRIS</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="qris-container">
          <h3>SCAN UNTUK BAYAR</h3>
          <img src="${qrisDataUrl}" alt="QRIS" />
          <p>QRIS Didukung oleh Seluruh Pembayaran Digital</p>
        </div>
      </body>
    </html>
  `;
}
