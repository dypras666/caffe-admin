const fs = require('fs');
let code = fs.readFileSync('src/pages/POSPage.jsx', 'utf8');

// 1. Add QRCode and generateDynamicQris imports
if (!code.includes("import { QRCodeSVG }")) {
  code = code.replace(
    "import { useAuth } from '../context/AuthContext';",
    "import { useAuth } from '../context/AuthContext';\nimport { QRCodeSVG } from 'qrcode.react';\nimport { generateDynamicQris } from '../lib/qris';\nimport { buildQrisHTML } from '../lib/printer';"
  );
}

// 2. Add discount settings to CheckoutDialog signature
code = code.replace(
  /function CheckoutDialog\(\{\n\s*open, onClose, cart, subtotal, discountAmt, taxAmt, total,/,
  "function CheckoutDialog({\n  open, onClose, cart, subtotal, discountAmt, discount, setDiscount, settings, taxAmt, total,"
);

// 3. Add states for Cash Nominal
const dialogStart = code.indexOf('const ICONS = { cash:');
if (dialogStart > -1 && !code.includes('const [cashReceived, setCashReceived] = useState')) {
  const injection = `
  const [cashReceived, setCashReceived] = useState('');
  const [discountType, setDiscountType] = useState('nominal');
  const [discountInput, setDiscountInput] = useState('');

  // Sinkronisasi diskon input dengan setDiscount POSPage
  useEffect(() => {
    if (discountType === 'percent') {
      const p = parseFloat(discountInput || 0);
      setDiscount(Math.round(subtotal * (p / 100)));
    } else {
      setDiscount(parseFloat(discountInput || 0));
    }
  }, [discountInput, discountType, subtotal, setDiscount]);

  const change = Math.max(0, (parseFloat(cashReceived) || 0) - total);
  
  const qrisString = settings?.qris_string;
  const dynamicQris = paymentMethod === 'qris' && qrisString ? generateDynamicQris(qrisString, total) : null;
  const printQris = async () => {
    const svg = document.getElementById('qris-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = async () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      try {
        const p = await api.get('/printers');
        const printer = p.data.printers?.find(x => x.is_default) || p.data.printers?.[0];
        await smartPrint(buildQrisHTML(dataUrl, printer), printer, 'receipt');
      } catch (err) {
        alert('Gagal print QRIS');
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };
`;
  code = code.slice(0, dialogStart) + injection + code.slice(dialogStart);
}

// 4. Inject Discount UI above Notes, and Cash / QRIS UI below payment methods
const methodsEnd = code.indexOf('{/* Notes */}');
if (methodsEnd > -1 && !code.includes('Diskon Tambahan')) {
  const injectUI = `
          {/* Cash / QRIS UI */}
          {paymentMethod === 'cash' && (
            <div className="bg-muted/30 p-3 rounded-xl space-y-2 border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground">Nominal Diterima</span>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={cashReceived} 
                  onChange={e => setCashReceived(e.target.value)} 
                  className="w-32 h-8 text-right"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground">Kembalian</span>
                <span className="font-bold text-emerald-600">{fmt(change)}</span>
              </div>
            </div>
          )}

          {paymentMethod === 'qris' && dynamicQris && (
            <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-white space-y-3">
              <span className="text-xs font-semibold text-muted-foreground">Scan untuk Bayar {fmt(total)}</span>
              <QRCodeSVG id="qris-svg" value={dynamicQris} size={150} level="M" />
              <Button size="sm" variant="outline" onClick={printQris} className="w-full text-xs">Cetak QRIS</Button>
            </div>
          )}
          {paymentMethod === 'qris' && !qrisString && (
            <div className="text-xs text-red-500 text-center p-2 border border-red-200 rounded-xl bg-red-50">
              String QRIS belum diatur di Pengaturan.
            </div>
          )}

          {/* Discount Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-1.5">Diskon Tambahan</p>
              <div className="flex">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="w-16 h-9 rounded-r-none border-r-0 px-2 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nominal">Rp</SelectItem>
                    <SelectItem value="percent">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={discountInput} 
                  onChange={e => setDiscountInput(e.target.value)} 
                  className="h-9 rounded-l-none text-sm"
                />
              </div>
            </div>
          </div>
\n`;
  code = code.slice(0, methodsEnd) + injectUI + code.slice(methodsEnd);
}

fs.writeFileSync('src/pages/POSPage.jsx', code);
