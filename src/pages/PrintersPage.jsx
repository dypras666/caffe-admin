import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { smartPrint } from '../lib/printer';
import {
  Printer, Plus, Pencil, Trash2, Loader2, CheckCircle2,
  Settings, Wifi, Usb, Monitor, Star
} from 'lucide-react';
import { useToast } from '../components/ui/toast';

const TYPE_CONFIG = {
  receipt: { label: 'Struk Kasir', color: 'bg-blue-100 text-blue-700', icon: '🧾' },
  kitchen: { label: 'Dapur', color: 'bg-orange-100 text-orange-700', icon: '🍳' },
  bar: { label: 'Bar', color: 'bg-purple-100 text-purple-700', icon: '🍹' },
  label: { label: 'Label', color: 'bg-green-100 text-green-700', icon: '🏷️' },
};
const CONN_CONFIG = {
  browser: { label: 'Browser (window.print)', icon: Monitor },
  network: { label: 'Jaringan (IP:Port)', icon: Wifi },
  usb: { label: 'USB', icon: Usb },
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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);

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
      await smartPrint(html, printer);
      toast.success('Print test dikirim ke ' + printer.name);
    } catch (err) { toast.error('Test print gagal: ' + (err.response?.data?.error || err.message)); }
    finally { setTesting(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{printers.length} printer terdaftar</p>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Tambah Printer
        </Button>
      </div>

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
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl">
                      {tc.icon}
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
          <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2"><Monitor className="w-4 h-4" />Tentang Printer Browser</p>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Mode <strong>Browser</strong> menggunakan window.print() — tidak perlu driver khusus</li>
            <li>Sambungkan printer thermal ke komputer kasir, set sebagai printer default</li>
            <li>Saat print, pilih printer thermal di dialog print browser</li>
            <li>Atur ukuran kertas di printer ke 80mm atau 58mm sesuai konfigurasi</li>
            <li>Mode <strong>Jaringan</strong> memerlukan print bridge (server lokal) di port yang ditentukan</li>
          </ul>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Printer' : 'Tambah Printer Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}
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

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan' : 'Tambah Printer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
