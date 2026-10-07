import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { smartPrint, buildLabelHTML } from '../lib/printer';
import DevicePrinterSettings from '../components/DevicePrinterSettings';
import {
  Printer, Plus, Pencil, Trash2, Loader2, CheckCircle2,
  Settings, Wifi, Usb, Monitor, Star, Receipt, Utensils, Coffee, Tag, Bluetooth, Search,
  Check
} from 'lucide-react';
import { useToast } from '../components/ui/toast';

const TYPE_CONFIG = {
  receipt: { label: 'Struk Kasir', color: 'bg-blue-100 text-blue-700', icon: Receipt },
  kitchen: { label: 'Dapur', color: 'bg-orange-100 text-orange-700', icon: Utensils },
  bar: { label: 'Bar', color: 'bg-purple-100 text-purple-700', icon: Coffee },
  label: { label: 'Label Cup/Stiker', color: 'bg-green-100 text-green-700', icon: Tag },
};
const CONN_CONFIG = {
  browser: { label: 'Browser (window.print)', icon: Monitor },
  network: { label: 'Jaringan (IP:Port)', icon: Wifi },
  usb: { label: 'USB (API Chrome)', icon: Usb },
  bluetooth: { label: 'Bluetooth (API Chrome)', icon: Bluetooth },
};

const EMPTY = {
  name: '', type: 'receipt', connection: 'browser',
  ip: '', port: 9100, paper_width: '80mm', char_per_line: 42,
  is_default: false, is_active: true, auto_cut: true,
  header_text: '', footer_text: '', sort_order: 0,
};

export default function PrintersPage() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/printers');
  const { data: settingsData, refetch: refetchSettings } = useFetch('/settings');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [updatingSetting, setUpdatingSetting] = useState(null);

  const printers = data?.printers || [];

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name, type: p.type, connection: p.connection,
      ip: p.ip || '', port: p.port || 9100, paper_width: p.paper_width || '80mm',
      char_per_line: p.char_per_line || 42, is_default: !!p.is_default,
      is_active: !!p.is_active, auto_cut: !!p.auto_cut,
      header_text: p.header_text || '', footer_text: p.footer_text || '',
      sort_order: p.sort_order || 0,
      bluetooth_device_id: p.bluetooth_device_id || null,
      usb_vendor_id: p.usb_vendor_id || null,
      usb_product_id: p.usb_product_id || null,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.put(`/printers/${editId}`, form);
      else await api.post('/printers', form);
      setOpen(false);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus printer ini?')) return;
    try { await api.delete(`/printers/${id}`); refetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleTest = async (id, name) => {
    setTesting(id);
    try {
      const res = await api.post(`/printers/${id}/test`);
      const { test_data, printer } = res.data;

      if (printer.type === 'label' || test_data.type === 'label_test') {
        const html = buildLabelHTML(test_data, printer);
        await smartPrint(html, printer, 'label', test_data);
        toast.success('Print test label dikirim ke ' + printer.name);
        return;
      }

      // Build simple test HTML
      const charW = printer.char_per_line || 42;
      const lines = test_data.lines.map(l => {
        if (l.type === 'divider') return `<div class="div">${'─'.repeat(charW)}</div>`;
        const cls = [l.type === 'center' ? 'center' : '', l.bold ? 'bold' : ''].filter(Boolean).join(' ');
        return `<div class="${cls}">${l.text}</div>`;
      }).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:'Courier New',monospace;font-size:12px;width:${printer.paper_width==='58mm'?'58mm':'80mm'};padding:4mm}
        .center{text-align:center}.bold{font-weight:bold}.div{margin:2px 0;letter-spacing:-1px}
        @media print{@page{margin:0;size:${printer.paper_width==='58mm'?'58mm':'80mm'} auto}}
      </style></head><body>${lines}</body></html>`;
      await smartPrint(html, printer, printer.type, test_data);
      toast.success('Print test dikirim ke ' + printer.name);
    } catch (err) { toast.error('Test print gagal: ' + (err.response?.data?.error || err.message)); }
    finally { setTesting(null); }
  };

  const settingsMap = (settingsData?.settings || []).reduce((acc, s) => ({ ...acc, [s.setting_key]: s.setting_value }), {});
  const autoReceipt = settingsMap.pos_auto_print_receipt !== 'false';
  const autoKitchen = settingsMap.pos_auto_print_kitchen !== 'false';
  const autoLabel = settingsMap.pos_auto_print_label === 'true';

  const handleToggleSetting = async (key, currentVal) => {
    setUpdatingSetting(key);
    try {
      const newVal = !currentVal;
      await api.put('/settings', { settings: [{ key, value: String(newVal) }] });
      toast.success('Pengaturan cetak otomatis diperbarui');
      refetchSettings();
    } catch (err) {
      toast.error('Gagal memperbarui pengaturan');
    } finally {
      setUpdatingSetting(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Manajemen Printer</h2>
          <p className="text-xs text-muted-foreground">{printers.length} printer terdaftar di sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <DevicePrinterSettings trigger={
            <Button variant="outline" className="gap-1.5 text-xs">
              <Bluetooth className="w-3.5 h-3.5 text-indigo-600" />
              Printer Perangkat Ini (Bluetooth/USB)
            </Button>
          } />
          <Button onClick={openCreate} className="gap-1.5 text-xs">
            <Plus className="w-4 h-4" />Tambah Printer
          </Button>
        </div>
      </div>

      {/* Otomatisasi Cetak POS Card */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/20 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Otomatisasi Cetak POS (Saat Bayar / Buat Pesanan)
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">Berlaku untuk semua kasir</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {/* Auto Struk */}
            <div
              onClick={() => handleToggleSetting('pos_auto_print_receipt', autoReceipt)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                autoReceipt ? 'bg-background border-primary/40 shadow-sm' : 'bg-background/40 opacity-70'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${autoReceipt ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                <Receipt className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Auto Struk Kasir</p>
                  <input
                    type="checkbox"
                    checked={autoReceipt}
                    onChange={() => {}}
                    disabled={updatingSetting === 'pos_auto_print_receipt'}
                    className="rounded text-primary pointer-events-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cetak struk pembayaran otomatis</p>
              </div>
            </div>

            {/* Auto Dapur */}
            <div
              onClick={() => handleToggleSetting('pos_auto_print_kitchen', autoKitchen)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                autoKitchen ? 'bg-background border-primary/40 shadow-sm' : 'bg-background/40 opacity-70'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${autoKitchen ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                <Utensils className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Auto Tiket Dapur</p>
                  <input
                    type="checkbox"
                    checked={autoKitchen}
                    onChange={() => {}}
                    disabled={updatingSetting === 'pos_auto_print_kitchen'}
                    className="rounded text-primary pointer-events-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cetak tiket pesanan langsung ke dapur</p>
              </div>
            </div>

            {/* Auto Label Cup */}
            <div
              onClick={() => handleToggleSetting('pos_auto_print_label', autoLabel)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                autoLabel ? 'bg-background border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20' : 'bg-background/40 opacity-70'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${autoLabel ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                <Tag className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    Auto Label Cup / Stiker
                    {autoLabel && <Badge variant="success" className="text-[9px] px-1 py-0 h-4">Aktif</Badge>}
                  </p>
                  <input
                    type="checkbox"
                    checked={autoLabel}
                    onChange={() => {}}
                    disabled={updatingSetting === 'pos_auto_print_label'}
                    className="rounded text-primary pointer-events-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cetak stiker per cup/porsi minuman &amp; makanan</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printer cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {printers.map(p => {
          const tc = TYPE_CONFIG[p.type] || TYPE_CONFIG.receipt;
          const cc = CONN_CONFIG[p.connection] || CONN_CONFIG.browser;
          const ConnIcon = cc.icon;
          return (
            <Card key={p.id} className={`transition-all ${!p.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="pt-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                      <tc.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold">{p.name}</p>
                        {p.is_default && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tc.color}`}>{tc.label}</span>
                    </div>
                  </div>
                  <Badge variant={p.is_active ? 'success' : 'outline'}>{p.is_active ? 'Aktif' : 'Off'}</Badge>
                </div>

                {/* Info */}
                <div className="space-y-1 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <ConnIcon className="w-3.5 h-3.5" />
                    <span>{cc.label}</span>
                    {p.connection === 'network' && p.ip && <span className="font-mono">{p.ip}:{p.port}</span>}
                  </div>
                  <div className="flex gap-3">
                    <span>Kertas: {p.paper_width}</span>
                    <span>{p.char_per_line} char/baris</span>
                    {p.auto_cut && <span>Auto-cut</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" disabled={testing === p.id}
                    onClick={() => handleTest(p.id, p.name)}>
                    {testing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                    Test Print
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info box */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" />Tentang Konfigurasi Printer</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Halaman ini mengatur printer <strong>Global/Server</strong> (Printer Jaringan / Default Browser).</li>
            <li>Mode <strong>Browser</strong> menggunakan window.print() — tidak perlu driver khusus.</li>
            <li>Mode <strong>Jaringan</strong> memerlukan print bridge (server lokal) di IP & port yang ditentukan.</li>
            <li className="mt-2 font-semibold">Ingin menggunakan printer Bluetooth atau USB (API Chrome)?</li>
            <li>Konfigurasi USB/Bluetooth bersifat lokal untuk perangkat Anda.</li>
            <li>Klik <strong className="inline-flex items-center gap-1 mx-1 border rounded px-1 py-0.5 bg-white"><Printer className="w-3 h-3"/> Ikon Printer</strong> di pojok kanan atas (samping tombol profil) untuk menghubungkan printer USB/Bluetooth.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 flex flex-col overflow-hidden max-h-[88dvh]">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-background shrink-0 m-0">
            <DialogTitle>{editId ? 'Edit Printer' : 'Tambah Printer Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <DialogBody className="p-4 sm:p-5 space-y-4">
              {/* Basic */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Printer *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="misal: Kasir Depan" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => {
                        const Icon = v.icon;
                        return (
                          <SelectItem key={k} value={k}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span>{v.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Koneksi</label>
                  <Select value={form.connection} onValueChange={v => setForm(f => ({ ...f, connection: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONN_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* API Chrome settings */}
              {(form.connection === 'bluetooth' || form.connection === 'usb') && (
                <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block">ID Perangkat Chrome API</label>
                      <p className="text-[10px] text-muted-foreground/70">Wajib di-scan agar bisa tersimpan.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                      try {
                        let found;
                        if (form.connection === 'bluetooth') {
                          const { scanBluetoothPrinters } = await import('../lib/printer');
                          found = await scanBluetoothPrinters();
                        } else {
                          const { scanUSBPrinters } = await import('../lib/printer');
                          found = await scanUSBPrinters();
                        }
                        if (found) {
                          setForm(f => ({
                            ...f,
                            name: f.name || found.name,
                            bluetooth_device_id: found.bluetooth_device_id || null,
                            usb_vendor_id: found.usb_vendor_id || null,
                            usb_product_id: found.usb_product_id || null,
                          }));
                          toast.success('Printer berhasil di-scan!');
                        }
                      } catch (e) {
                        toast.error(e.message);
                      }
                    }}>
                      <Search className="w-3.5 h-3.5 mr-1" /> Scan Printer
                    </Button>
                  </div>
                  {(form.bluetooth_device_id || form.usb_vendor_id) && (
                    <div className="bg-success/10 text-success text-[10px] px-2 py-1 rounded font-mono break-all">
                      ID: {form.bluetooth_device_id || `${form.usb_vendor_id}:${form.usb_product_id}`}
                    </div>
                  )}
                </div>
              )}

              {/* Network settings */}
              {form.connection === 'network' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address</label>
                    <Input value={form.ip} onChange={e => setForm(f => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.100" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Port</label>
                    <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) }))} />
                  </div>
                </div>
              )}

              {/* Paper */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Lebar Kertas</label>
                  <Select value={form.paper_width} onValueChange={v => setForm(f => ({ ...f, paper_width: v, char_per_line: v === '58mm' ? 32 : v === 'dotmatrix' ? 80 : 42 }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm Thermal (42 char)</SelectItem>
                      <SelectItem value="58mm">58mm Thermal (32 char)</SelectItem>
                      <SelectItem value="dotmatrix">Dot Matrix / A4 (80 char)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Char per Baris</label>
                  <Input type="number" value={form.char_per_line} onChange={e => setForm(f => ({ ...f, char_per_line: parseInt(e.target.value) }))} />
                </div>
              </div>

              {/* Header/Footer */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Header (tampil di atas struk)</label>
                <textarea value={form.header_text} onChange={e => setForm(f => ({ ...f, header_text: e.target.value }))} rows={2}
                  placeholder="Nama café, tagline, dll (1 baris = 1 baris struk)" className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Footer (tampil di bawah struk)</label>
                <textarea value={form.footer_text} onChange={e => setForm(f => ({ ...f, footer_text: e.target.value }))} rows={2}
                  placeholder="Terima kasih, promo, dll" className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'is_default', label: 'Default untuk tipe ini' },
                  { key: 'is_active', label: 'Aktif' },
                  { key: 'auto_cut', label: 'Auto-cut kertas' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan Tampil</label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="w-24" />
              </div>
            </DialogBody>

            <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 shrink-0 m-0 flex flex-row items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 text-xs">Batal</Button>
              <Button type="submit" disabled={saving} className="h-9 text-xs">
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan' : 'Tambah Printer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
