const fs = require('fs');
const file = '/Users/azzura/development/cafe-admin/src/pages/POSPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetFunction = `function CheckoutDialog({
  open, onClose, cart, subtotal, discountAmt, taxAmt, total,
  paymentMethod, setPaymentMethod, payMethods, notes, setNotes,
  orderType, selectedTable, customerName, selectedMember, qrisString, fmt, onConfirm, placing,
  appliedVoucher, onApplied, onRemove
}) {
  const [step, setStep] = useState('form');
  const [kodeUnik, setKodeUnik] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  
  const changeAmount = (parseInt(cashReceived.replace(/\\D/g, '')) || 0) - total;
  
  // Fetch unique code when dialog opens
  useEffect(() => {
    if (open) {
      setStep('form');
      import('../lib/api').then(({ default: api }) => {
        api.get('/orders/qris/unique-code')
          .then(res => setKodeUnik(res.data.kode_unik))
          .catch(() => setKodeUnik(Math.floor(Math.random() * 900) + 100)); // Fallback if error
      });
    }
  }, [open]);

  const ICONS = { cash: '💵', digital: '📱', transfer: '🏦', wallet: '👛' };
  const isPendingPay = paymentMethod === 'pending';
  const qrisTotal = total + (paymentMethod === 'qris' ? kodeUnik : 0);
  const dynamicQris = paymentMethod === 'qris' && qrisString ? generateDynamicQris(qrisString, qrisTotal) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>{step === 'qris' ? 'Pembayaran QRIS' : 'Konfirmasi Pembayaran'}</DialogTitle></DialogHeader>
        
        {step === 'qris' ? (
          <div className="space-y-4 py-4 flex flex-col items-center">
            {dynamicQris ? (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  Silakan minta pelanggan scan QR Code di bawah ini untuk membayar sejumlah 
                  <br/>
                  <strong className="text-xl text-primary">{fmt(qrisTotal)}</strong>
                </p>
                {kodeUnik > 0 && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                    Termasuk kode unik: {kodeUnik}
                  </p>
                )}
                <div className="bg-white p-4 rounded-2xl shadow-sm border mt-4">
                  <QRCodeSVG value={dynamicQris} size={200} level="M" />
                </div>
              </>
            ) : (
              <div className="text-center space-y-2 p-4">
                <p className="text-amber-600 font-semibold">String QRIS Belum Dikonfigurasi!</p>
                <p className="text-sm text-muted-foreground">Harap upload ulang gambar QRIS Anda di menu <strong>Settings &gt; Payments</strong> agar QR Code dinamis dapat muncul di sini.</p>
                <p className="text-sm text-muted-foreground mt-4">Jika Anda menggunakan EDC atau QRIS statis terpisah, silakan lanjutkan jika pelanggan sudah membayar.</p>
              </div>
            )}
            <div className="flex w-full gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')} disabled={placing}>Kembali</Button>
              {dynamicQris && (
                <Button variant="outline" className="flex-1" disabled={placing} onClick={async () => {
                  try {
                    const { smartPrint } = await import('../lib/printer');
                    const receipt = { qrisOnly: true, amount: qrisTotal, qris: dynamicQris };
                    const html = \`<div style="text-align:center"><h3>TAGIHAN</h3><p>Total: \${fmt(qrisTotal)}</p></div>\`;
                    const { default: api } = await import('../lib/api');
                    const { data } = await api.get('/printers').catch(() => ({ data: { printers: [] } }));
                    const printer = data?.printers?.find(p => p.type === 'receipt' && p.is_active === 1) || null;
                    await smartPrint(html, printer, 'receipt', receipt);
                  } catch (e) {
                    console.error('Print QRIS failed', e);
                  }
                }}>
                  <Receipt className="w-4 h-4 mr-2" /> Print QRIS
                </Button>
              )}
              <Button className="flex-1" onClick={() => onConfirm(true, true)} disabled={placing}>
                {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Utensils className="w-4 h-4 mr-2" />}
                Sudah Dibayar
              </Button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kolom Kiri: Order Summary & Voucher */}
          <div className="space-y-4">
            <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Tipe</span><span className="font-medium capitalize">{orderType}</span></div>
              {selectedTable && <div className="flex justify-between"><span className="text-muted-foreground">Meja</span><span className="font-medium">{selectedTable.name || selectedTable.table_number}</span></div>}
              {customerName && <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{customerName}</span></div>}
              <div className="flex justify-between text-muted-foreground text-xs pt-2 border-t">
                <span>{cart.reduce((s, i) => s + i.qty, 0)} item · Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discountAmt > 0 && <div className="flex justify-between text-green-600 text-xs"><span>Diskon</span><span>− {fmt(discountAmt)}</span></div>}
              {taxAmt > 0 && <div className="flex justify-between text-muted-foreground text-xs"><span>Pajak</span><span>{fmt(taxAmt)}</span></div>}
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary">{fmt(total)}</span>
              </div>
            </div>
            
            {/* Voucher Input dipindahkan ke dalam modal (kiri bawah) */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Voucher Promo</p>
              <VoucherInput 
                subtotal={subtotal} 
                appliedVoucher={appliedVoucher} 
                onApplied={onApplied} 
                onRemove={onRemove} 
              />
            </div>
          </div>

          {/* Kolom Kanan: Payment Method, Cash Input, Notes */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2">
                {payMethods.map(m => {
                  const isBalance = m.code === 'balance';
                  const noMember = isBalance && !selectedMember;
                  return (
                    <button
                      type="button"
                      key={m.code}
                      onClick={() => !noMember && setPaymentMethod(m.code)}
                      disabled={noMember}
                      title={noMember ? 'Pilih member terlebih dulu' : undefined}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                        paymentMethod === m.code
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : noMember
                            ? 'border-border/40 opacity-40 cursor-not-allowed'
                            : 'border-border hover:border-primary/40'
                      )}
                    >
                      {m.icon?.startsWith('http') || m.icon?.startsWith('/') ? (
                        <img src={m.icon.startsWith('http') ? m.icon : \`/uploads/\${m.icon.replace(/^\\/uploads\\//, '')}\`} alt={m.name} className="h-6 w-auto object-contain" />
                      ) : (
                        <span className="text-xl">{m.icon || ICONS[m.type] || '💳'}</span>
                      )}
                      <span className="text-[10px] text-center leading-tight">{m.name}</span>
                      {isBalance && selectedMember && (
                        <span className="text-[9px] text-emerald-600 font-bold">
                          {fmt(selectedMember.balance || 0)}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Bayar Nanti */}
                <button
                  onClick={() => setPaymentMethod('pending')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                    isPendingPay
                      ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                      : 'border-border hover:border-amber-300 text-muted-foreground hover:text-amber-700'
                  )}
                >
                  <Clock className="w-5 h-5" />
                  <span className="text-[10px] text-center leading-tight">Bayar Nanti</span>
                </button>
              </div>

              {isPendingPay && (
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  Order akan dibuat dengan status <strong>belum bayar</strong>.
                </div>
              )}
            </div>

            {/* Input Tunai (Hanya jika Cash) */}
            {paymentMethod === 'cash' && (
              <div className="bg-primary/5 rounded-xl p-4 space-y-3 border border-primary/20">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tunai Diterima</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rp</span>
                    <Input 
                      className="pl-9 font-bold text-lg h-11"
                      value={cashReceived}
                      onChange={e => {
                        const val = e.target.value.replace(/\\D/g, '');
                        setCashReceived(val ? Number(val).toLocaleString('id-ID') : '');
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">Kembalian:</span>
                  <span className={cn("font-bold text-lg", changeAmount >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {changeAmount < 0 ? "-" : ""}{fmt(Math.abs(changeAmount))}
                  </span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Catatan</p>
              <Input placeholder="Catatan pesanan…" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t mt-2">
              <Button variant="outline" onClick={onClose} disabled={placing} className="h-11">Batal</Button>
              <Button variant="outline" onClick={() => onConfirm(false, true, { cashReceived: parseInt(cashReceived.replace(/\\D/g, '')) || 0, changeAmount: Math.max(0, changeAmount) })} disabled={placing} className="h-11 gap-1 text-xs px-1">
                {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Utensils className="w-3.5 h-3.5" />}
                Dapur
              </Button>
              <Button
                onClick={() => {
                  if (paymentMethod === 'qris') {
                    setStep('qris');
                  } else {
                    onConfirm(!isPendingPay, true, { cashReceived: parseInt(cashReceived.replace(/\\D/g, '')) || 0, changeAmount: Math.max(0, changeAmount) });
                  }
                }}
                disabled={placing || (paymentMethod === 'cash' && changeAmount < 0)}
                className={cn('h-11 gap-1 text-xs font-semibold', isPendingPay && 'bg-amber-500 hover:bg-amber-600')}
              >
                {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPendingPay ? <Clock className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
                {paymentMethod === 'qris' ? 'Lanjut QRIS' : (isPendingPay ? 'Simpan' : 'Bayar')}
              </Button>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}`;

const startMarker = 'function CheckoutDialog({';
const endMarker = '  );\n}\n\n// ─── Voucher Input ────────────────────────────────────────────';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Markers not found");
  process.exit(1);
}

content = content.substring(0, startIndex) + targetFunction + "\n\n// ─── Voucher Input ────────────────────────────────────────────" + content.substring(endIndex + endMarker.length);
fs.writeFileSync(file, content);
console.log("CheckoutDialog replaced");
