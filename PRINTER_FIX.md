# 🖨️ Printer Fix - Window Blank Issue

## Masalah
Window print yang terbuka blank/kosong saat print via IP printer

## Solusi yang Diterapkan

### 1. **Perbaikan `printHTML()` Function** (`src/lib/printer.js:129-154`)
- **Problem**: Window loading terlalu cepat, setTimeout 300ms tidak cukup
- **Fix**:
  - Gunakan `window.document.open()` sebelum write
  - Tambahkan `win.onload` event handler untuk menunggu window fully loaded
  - Increase timeout dari 300ms → 500ms untuk rendering
  - Tambahkan fallback timeout 1000ms jika onload tidak fire
  - Close window setelah print dialog handled (100ms delay)

### 2. **Smart Print Functions** (`src/lib/printer.js:158-197`)
Menambahkan 3 fungsi baru:

#### `printToNetwork(html, printer)`
- Print ke network printer via IP:Port
- Requires local print bridge server
- POST ke `http://{printer.ip}:{printer.port}/print`
- Throw error jika gagal (bisa fallback ke browser print)

#### `smartPrint(html, printer)`
- **Auto-detect** connection type:
  - `connection === 'network'` + ada IP → pakai `printToNetwork()`
  - Gagal network → tanya user, fallback ke browser print
  - Selain itu → pakai browser print (`printHTML()`)
- **Universal** - satu fungsi untuk semua mode print

### 3. **Update All Print Calls**
Semua file diupdate untuk pakai `smartPrint()`:

- ✅ `src/pages/PrintersPage.jsx` (test print)
- ✅ `src/pages/POSPage.jsx` (auto print receipt/kitchen)
- ✅ `src/pages/OrdersPage.jsx` (print struk/dapur, split bills)
- ✅ `src/pages/TableOrderPage.jsx` (print receipt/kitchen)

**Before:**
```javascript
import { printHTML } from '../lib/printer';
printHTML(buildReceiptHTML(r.data.receipt, r.data.printer));
```

**After:**
```javascript
import { smartPrint } from '../lib/printer';
await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer);
```

## Cara Pakai

### Browser Print Mode (Default)
1. Set printer connection = `browser`
2. Hubungkan thermal printer ke komputer
3. Set sebagai default printer di OS
4. Klik print → pilih thermal printer di dialog
5. **FIXED**: Window tidak blank lagi, loading properly

### Network Print Mode (via IP)
1. Set printer connection = `network`
2. Isi IP address printer (misal: `192.168.1.100`)
3. Isi port (default: `9100` untuk ESC/POS)
4. Siapkan print bridge server di komputer lokal
5. Print akan POST ke `http://192.168.1.100:9100/print`

**Note**: Network mode requires local print bridge server yang handle HTTP → ESC/POS conversion

## Print Bridge Server (Optional - Network Mode)
Untuk network printing, butuh simple Node.js server:

```javascript
// print-bridge.js
const express = require('express');
const net = require('net');
const app = express();

app.post('/print', express.json(), (req, res) => {
  const { html, printer_id } = req.body;
  
  // Convert HTML to ESC/POS commands (simplified)
  const escpos = convertHtmlToEscPos(html);
  
  // Send to thermal printer via raw socket
  const client = net.connect(9100, 'PRINTER_IP', () => {
    client.write(escpos);
    client.end();
    res.json({ success: true });
  });
  
  client.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

app.listen(9100);
```

## Testing
1. **Test print** di Printers page → harus buka window dengan benar
2. **POS checkout** → auto print receipt/kitchen sesuai settings
3. **Orders page** → print struk/dapur dari order history
4. **Table orders** → print receipt/kitchen per order

## Technical Details

### Window Loading Fix
```javascript
// OLD (blank window)
win.document.write(html);
win.document.close();
setTimeout(() => { win.print(); }, 300);  // Too fast!

// NEW (wait for load)
win.document.open();
win.document.write(html);
win.document.close();
win.onload = () => {
  win.focus();
  setTimeout(() => {
    win.print();
    setTimeout(() => win.close(), 100);
  }, 500);  // More time for rendering
};
```

### Smart Print Logic
```javascript
if (printer.connection === 'network' && printer.ip) {
  try {
    await printToNetwork(html, printer);  // Try network first
  } catch (error) {
    if (confirm('Network gagal, print via browser?')) {
      printHTML(html);  // Fallback to browser
    }
  }
} else {
  printHTML(html);  // Default: browser print
}
```

## Files Changed
- `src/lib/printer.js` (main fixes)
- `src/pages/PrintersPage.jsx`
- `src/pages/POSPage.jsx`
- `src/pages/OrdersPage.jsx`
- `src/pages/TableOrderPage.jsx`

## Known Issues
- Network mode requires separate print bridge server
- ESC/POS conversion not included (simplified in example)
- Browser popup blocker might block print window (user must allow)

---
**Status**: ✅ Fixed
**Date**: 2026-07-09
