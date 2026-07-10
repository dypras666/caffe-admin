import { useState, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import {
  Building2, Plus, Pencil, Trash2, Loader2, Star, QrCode,
  MapPin, Wifi, WifiOff, CheckCircle, Download, RefreshCw,
  Navigation, Shield, Coins,
} from 'lucide-react';
import { cn } from '../lib/utils';

function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }); }

const EMPTY_BRANCH = { name: '', code: '', address: '', phone: '', email: '', city: '', timezone: 'Asia/Jakarta' };
const EMPTY_QR = { table_id: '', qr_type: 'static', radius_enabled: false, radius_meters: 50, table_lat: '', table_lng: '', base_url: '' };

export default function BranchesPage() {
  return (
    <Tabs defaultValue="branches">
      <TabsList>
        <TabsTrigger value="branches">Cabang</TabsTrigger>
        <TabsTrigger value="qr">QR Meja</TabsTrigger>
        <TabsTrigger value="points">Rules Poin</TabsTrigger>
      </TabsList>
      <TabsContent value="branches" className="mt-4"><BranchesTab /></TabsContent>
      <TabsContent value="qr" className="mt-4"><QRTab /></TabsContent>
      <TabsContent value="points" className="mt-4"><PointRulesTab /></TabsContent>
    </Tabs>
  );
}

// ─── Branches Tab ─────────────────────────────────────────────
function BranchesTab() {
  const { data, loading, refetch } = useFetch('/branches');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BRANCH);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const branches = data?.branches || [];

  const openCreate = () => { setForm(EMPTY_BRANCH); setEditId(null); setOpen(true); };
  const openEdit = (b) => {
    setForm({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '', email: b.email || '', city: b.city || '', timezone: b.timezone || 'Asia/Jakarta' });
    setEditId(b.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/branches/${editId}`, form);
      else await api.post('/branches', form);
      setOpen(false); refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const setMain = async (id) => {
    try { await api.put(`/branches/${id}`, { is_main: true }); refetch(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{branches.length} cabang terdaftar</p>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Tambah Cabang</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(b => (
          <Card key={b.id} className={cn('transition-all hover:shadow-md', !b.is_active && 'opacity-60')}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', b.is_main ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{b.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{b.code}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-col items-end">
                  {b.is_main && <Badge variant="warning" className="text-[10px] gap-1"><Star className="w-2.5 h-2.5 fill-current" />Utama</Badge>}
                  <Badge variant={b.is_active ? 'success' : 'outline'}>{b.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                {b.city && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{b.city}</div>}
                {b.phone && <div className="flex items-center gap-1.5"><span>📞</span>{b.phone}</div>}
                {b.address && <p className="text-[10px] line-clamp-2 mt-1">{b.address}</p>}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px]">🪑 {b.total_tables || 0} meja</span>
                </div>
              </div>

              <div className="flex gap-1.5">
                {!b.is_main && (
                  <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => setMain(b.id)}>
                    <Star className="w-3 h-3 mr-1" />Set Utama
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                {!b.is_main && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"
                    onClick={async () => { if(confirm('Hapus cabang ini?')) { await api.delete(`/branches/${b.id}`); refetch(); } }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Cabang' : 'Tambah Cabang Baru'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Cabang *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Café Azzura - Jakarta" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kode Unik *</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required disabled={!!editId} placeholder="JKT" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kota</label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Jakarta" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Telepon</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Alamat</label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Timezone</label>
                <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Jakarta">WIB (Jakarta)</SelectItem>
                    <SelectItem value="Asia/Makassar">WITA (Makassar)</SelectItem>
                    <SelectItem value="Asia/Jayapura">WIT (Jayapura)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editId ? 'Simpan' : 'Tambah Cabang'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── QR Tab ───────────────────────────────────────────────────
function QRTab() {
  const { data: qrData, loading, refetch } = useFetch('/branches/qr/list');
  const { data: tablesData } = useFetch('/tables');
  const { data: branchesData } = useFetch('/branches');
  const [genOpen, setGenOpen] = useState(false);
  const [editQR, setEditQR] = useState(null); // QR object being edited
  const [form, setForm] = useState(EMPTY_QR);
  const [generating, setGenerating] = useState(false);
  const [lastQR, setLastQR] = useState(null);

  const qrCodes = qrData?.qr_codes || [];
  const tables = tablesData?.tables || [];
  const branches = branchesData?.branches || [];

  const openEdit = (qr) => {
    setEditQR(qr);
    setForm({
      table_id: String(qr.table_id),
      qr_type: qr.qr_type,
      radius_enabled: !!qr.radius_enabled,
      radius_meters: qr.radius_meters || 50,
      table_lat: qr.table_lat || '',
      table_lng: qr.table_lng || '',
      base_url: qr.base_url || '',
      branch_id: String(qr.branch_id || 1),
    });
    setGenOpen(true);
  };

  const handleGenerate = async (e) => {
    e.preventDefault(); setGenerating(true);
    try {
      let res;
      if (editQR) {
        // ── EDIT mode: PUT — update settings, token TIDAK berubah ──
        res = await api.put(`/branches/qr/${editQR.id}`, {
          qr_type: form.qr_type,
          radius_enabled: form.radius_enabled,
          radius_meters: parseInt(form.radius_meters),
          table_lat: form.table_lat ? parseFloat(form.table_lat) : null,
          table_lng: form.table_lng ? parseFloat(form.table_lng) : null,
          base_url: form.base_url || undefined,
        });
        // Show updated QR info (token tetap sama)
        const updatedQr = res.data.qr;
        const qrUrl = res.data.qr_url || `${updatedQr.base_url}?qr=${updatedQr.qr_token}&table=${editQR.table_number}`;
        setLastQR({
          qr_url: qrUrl,
          qr_token: updatedQr.qr_token,
          table: { table_number: editQR.table_number },
          updated: true,
        });
      } else {
        // ── CREATE mode: POST — buat token baru ──
        res = await api.post('/branches/qr/generate', {
          table_id: parseInt(form.table_id),
          qr_type: form.qr_type,
          radius_enabled: form.radius_enabled,
          radius_meters: parseInt(form.radius_meters),
          table_lat: form.table_lat ? parseFloat(form.table_lat) : null,
          table_lng: form.table_lng ? parseFloat(form.table_lng) : null,
          base_url: form.base_url || undefined,
          branch_id: form.branch_id ? parseInt(form.branch_id) : 1,
        });
        setLastQR(res.data);
      }
      setGenOpen(false);
      setEditQR(null);
      setForm(EMPTY_QR);
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setGenerating(false); }
  };

  const downloadQR = (qrUrl, tableName) => {
    // Generate QR using a free QR API
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;
    const a = document.createElement('a');
    a.href = qrApiUrl;
    a.download = `QR-${tableName}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{qrCodes.length} QR code</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</Button>
          <Button onClick={() => setGenOpen(true)} className="gap-1.5"><QrCode className="w-4 h-4" />Generate QR</Button>
        </div>
      </div>

      {/* Last generated QR display */}
      {lastQR && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 bg-white rounded-xl border flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lastQR.qr_url)}`}
                  alt="QR Code"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  {lastQR.updated ? 'QR berhasil diperbarui (token tetap sama)' : 'QR baru berhasil dibuat'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Meja: <strong>{lastQR.table?.table_number}</strong></p>
                <p className="text-xs font-mono text-muted-foreground break-all mt-0.5">{lastQR.qr_url}</p>
                {lastQR.updated && (
                  <p className="text-[10px] text-blue-600 mt-1">ℹ️ Token tidak berubah — QR lama masih bisa digunakan</p>
                )}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="text-xs gap-1"
                    onClick={() => { navigator.clipboard.writeText(lastQR.qr_url); }}>
                    Copy URL
                  </Button>
                  <Button size="sm" className="text-xs gap-1"
                    onClick={() => downloadQR(lastQR.qr_url, lastQR.table?.table_number)}>
                    <Download className="w-3 h-3" />Download QR
                  </Button>
                </div>
              </div>
              <button onClick={() => setLastQR(null)} className="text-muted-foreground hover:text-foreground p-1">✕</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR list */}
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meja</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Radius</TableHead>
                  <TableHead>Scan</TableHead>
                  <TableHead>Terakhir Scan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qrCodes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Belum ada QR code</TableCell></TableRow>
                ) : qrCodes.map(qr => (
                  <TableRow key={qr.id} className={!qr.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <p className="font-mono font-semibold text-sm">{qr.table_number}</p>
                      {qr.table_name && <p className="text-xs text-muted-foreground">{qr.table_name}</p>}
                    </TableCell>
                    <TableCell className="text-sm">{qr.branch_name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={qr.qr_type === 'dynamic' ? 'warning' : 'secondary'} className="text-[10px]">
                        {qr.qr_type === 'dynamic' ? '⚡ Dinamis' : '📌 Statis'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {qr.radius_enabled ? (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Navigation className="w-3 h-3" />{qr.radius_meters}m
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{qr.scan_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(qr.last_scanned_at)}</TableCell>
                    <TableCell>
                      <Badge variant={qr.is_active ? 'success' : 'outline'}>{qr.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 gap-1"
                          onClick={() => openEdit(qr)}>
                          <Pencil className="w-3 h-3" />Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 gap-1"
                          onClick={() => {
                            const url = `${qr.base_url}?qr=${qr.qr_token}&table=${qr.table_number}`;
                            downloadQR(url, qr.table_number);
                          }}>
                          <Download className="w-3 h-3" />PNG
                        </Button>
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2"
                          onClick={() => {
                            const url = `${qr.base_url}?qr=${qr.qr_token}&table=${qr.table_number}`;
                            navigator.clipboard.writeText(url);
                          }}>
                          Copy
                        </Button>
                        <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2"
                          title={qr.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={async () => {
                            await api.put(`/branches/qr/${qr.id}`, { is_active: !qr.is_active });
                            refetch();
                          }}>
                          {qr.is_active ? 'Off' : 'On'}
                        </Button>
                        <Button variant="ghost" size="sm"
                          className="text-[10px] h-7 px-2 text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (!confirm(`Hapus QR meja ${qr.table_number}? QR ini tidak bisa digunakan lagi.`)) return;
                            await api.delete(`/branches/qr/${qr.id}`);
                            refetch();
                          }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Generate / Edit QR Dialog */}
      <Dialog open={genOpen} onOpenChange={(open) => { if (!open) { setGenOpen(false); setEditQR(null); setForm(EMPTY_QR); } else setGenOpen(true); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editQR ? <Pencil className="w-4 h-4 text-primary" /> : <QrCode className="w-4 h-4" />}
              {editQR ? `Edit QR — Meja ${editQR.table_number}` : 'Generate QR Meja Baru'}
            </DialogTitle>
            {editQR && (
              <p className="text-xs text-muted-foreground">
                Menyimpan akan membuat QR baru (token baru) dan menonaktifkan QR lama.
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Meja</label>
              {editQR ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm font-medium">
                  <QrCode className="w-4 h-4 text-muted-foreground shrink-0" />
                  {editQR.table_number} {editQR.table_name ? `— ${editQR.table_name}` : ''}
                  <span className="ml-auto text-[10px] text-muted-foreground">Meja tidak bisa diubah</span>
                </div>
              ) : (
                <Select value={form.table_id} onValueChange={v => setForm(f => ({ ...f, table_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih meja..." /></SelectTrigger>
                  <SelectContent>
                    {tables.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.table_number} — {t.name || t.room_name || '—'}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe QR</label>
                <Select value={form.qr_type} onValueChange={v => setForm(f => ({ ...f, qr_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="static">📌 Statis (permanen)</SelectItem>
                    <SelectItem value="dynamic">⚡ Dinamis (8 jam)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cabang</label>
                <Select value={form.branch_id || '1'} onValueChange={v => setForm(f => ({ ...f, branch_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Base URL (opsional)</label>
              <Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="http://localhost:5174 (default dari settings)" />
            </div>

            {/* Radius settings */}
            <div className="p-3 bg-secondary/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Radius Geolokasi</span>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, radius_enabled: !f.radius_enabled }))}
                  className={cn('w-10 h-5 rounded-full transition-colors relative', form.radius_enabled ? 'bg-blue-500' : 'bg-gray-300')}
                >
                  <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', form.radius_enabled ? 'left-5.5 translate-x-0' : 'left-0.5')} />
                </button>
              </div>
              {form.radius_enabled && (
                <RadiusLocationPicker
                  radius={form.radius_meters}
                  lat={form.table_lat}
                  lng={form.table_lng}
                  onRadiusChange={v => setForm(f => ({ ...f, radius_meters: v }))}
                  onLocationChange={(lat, lng) => setForm(f => ({ ...f, table_lat: lat, table_lng: lng }))}
                />
              )}
            </div>

            {form.qr_type === 'dynamic' && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <span>⚡</span>
                <span>QR Dinamis akan kadaluarsa dalam 8 jam. Regenerate setiap hari untuk keamanan.</span>
              </div>
            )}

            {/* Validation: radius wajib punya koordinat */}
            {form.radius_enabled && (!form.table_lat || !form.table_lng) && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <Navigation className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Radius aktif — wajib pin lokasi meja di peta atau gunakan GPS perangkat.</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setGenOpen(false); setEditQR(null); setForm(EMPTY_QR); }}>Batal</Button>
              <Button type="submit"
                disabled={generating || !form.table_id || (form.radius_enabled && (!form.table_lat || !form.table_lng))}>
                {generating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <QrCode className="w-4 h-4 mr-1" />
                {editQR ? 'Regenerate QR' : 'Generate QR'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Radius Location Picker ───────────────────────────────────
function RadiusLocationPicker({ radius, lat, lng, onRadiusChange, onLocationChange }) {
  const [gettingGps, setGettingGps] = useState(false);

  const getGPS = () => {
    if (!navigator.geolocation) { alert('Browser tidak mendukung geolokasi'); return; }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationChange(pos.coords.latitude.toFixed(7), pos.coords.longitude.toFixed(7));
        setGettingGps(false);
      },
      (err) => {
        alert('Gagal mendapat GPS: ' + err.message + '\nPastikan izin lokasi diizinkan di browser.');
        setGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const mapUrl = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng)-0.002},${parseFloat(lat)-0.002},${parseFloat(lng)+0.002},${parseFloat(lat)+0.002}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const openMapFull = () => {
    const url = lat && lng
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`
      : 'https://www.openstreetmap.org/';
    window.open(url, '_blank', 'width=900,height=650');
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pelanggan harus dalam jarak <strong>{radius}m</strong> dari titik meja saat scan.
      </p>

      {/* Radius slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Radius Maksimal</label>
          <span className="text-sm font-bold text-primary">{radius}m</span>
        </div>
        <input type="range" min={10} max={500} step={5} value={radius}
          onChange={e => onRadiusChange(e.target.value)}
          className="w-full h-1.5 cursor-pointer accent-primary" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>10m (ketat)</span><span>250m</span><span>500m (longgar)</span>
        </div>
      </div>

      {/* GPS button */}
      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs h-9"
        onClick={getGPS} disabled={gettingGps}>
        {gettingGps
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Mendapatkan GPS…</>
          : <><Navigation className="w-3.5 h-3.5 text-blue-500" />Gunakan GPS Perangkat Ini (Realtime)</>}
      </Button>

      {/* Manual coordinate inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Latitude</label>
          <Input type="number" step="0.0000001" value={lat} placeholder="-6.2000000"
            onChange={e => onLocationChange(e.target.value, lng)}
            className="text-xs h-8 font-mono" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Longitude</label>
          <Input type="number" step="0.0000001" value={lng} placeholder="106.8166700"
            onChange={e => onLocationChange(lat, e.target.value)}
            className="text-xs h-8 font-mono" />
        </div>
      </div>

      {/* Confirmed coords */}
      {lat && lng ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </p>
          <Button type="button" variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-green-700" onClick={openMapFull}>
            Verifikasi di Maps
          </Button>
        </div>
      ) : (
        <div className="text-center text-xs text-muted-foreground py-2.5 bg-secondary/30 rounded-lg border border-dashed">
          Koordinat belum diset — klik GPS atau isi manual
        </div>
      )}

      {/* Embedded map preview */}
      {mapUrl && (
        <div className="rounded-xl overflow-hidden border">
          <div className="bg-secondary/50 px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />Preview Lokasi Meja
            </span>
            <Button type="button" variant="ghost" size="sm" className="text-[10px] h-5 px-2" onClick={openMapFull}>
              Buka Full Map
            </Button>
          </div>
          <iframe src={mapUrl} width="100%" height="200" frameBorder="0" loading="lazy" title="Lokasi Meja" style={{ display: 'block' }} />
          <div className="bg-amber-50 px-3 py-1.5 text-[10px] text-amber-700 border-t border-amber-100 leading-relaxed">
            💡 Lokasi tidak tepat? Klik <strong>"Buka Full Map"</strong> → klik kanan titik meja → salin koordinat ke input Latitude/Longitude di atas.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Point Rules Tab ──────────────────────────────────────────
const EMPTY_RULE = { name: 'Default', points_per_amount: '1', min_transaction: '0', multiplier: '1', notes: '' };

function PointRulesTab() {
  const { data: branchData, loading: branchLoading } = useFetch('/branches');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [open, setOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const branches = branchData?.branches || [];

  const loadRules = async (bid) => {
    if (!bid) { setRules([]); return; }
    setLoadingRules(true);
    try {
      const r = await api.get(`/branches/${bid}/point-rules`);
      setRules(r.data.rules || []);
    } catch { setRules([]); }
    finally { setLoadingRules(false); }
  };

  const handleBranchChange = (v) => { setSelectedBranchId(v); loadRules(v); };

  const openCreate = () => { setEditRule(null); setForm(EMPTY_RULE); setOpen(true); };
  const openEdit = (r) => {
    setEditRule(r);
    setForm({ name: r.name, points_per_amount: String(r.points_per_amount), min_transaction: String(r.min_transaction), multiplier: String(r.multiplier), notes: r.notes || '' });
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    setSaving(true);
    try {
      const payload = { name: form.name, points_per_amount: parseFloat(form.points_per_amount), min_transaction: parseFloat(form.min_transaction || 0), multiplier: parseFloat(form.multiplier || 1), notes: form.notes || null };
      if (editRule) await api.put(`/branches/${selectedBranchId}/point-rules/${editRule.id}`, payload);
      else await api.post(`/branches/${selectedBranchId}/point-rules`, payload);
      setOpen(false);
      loadRules(selectedBranchId);
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (rule) => {
    if (!confirm(`Hapus rule "${rule.name}"?`)) return;
    setDeletingId(rule.id);
    try {
      await api.delete(`/branches/${selectedBranchId}/point-rules/${rule.id}`);
      loadRules(selectedBranchId);
    } catch (err) { alert(err.response?.data?.error || 'Gagal hapus'); }
    finally { setDeletingId(null); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-sm">Rules Poin per Cabang</span>
        </div>
        <Select value={selectedBranchId || '_none'} onValueChange={v => handleBranchChange(v === '_none' ? '' : v)}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Pilih cabang..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Pilih cabang</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selectedBranchId && (
          <Button onClick={openCreate} className="gap-1.5 ml-auto" size="sm">
            <Plus className="w-4 h-4" />Tambah Rule
          </Button>
        )}
      </div>

      {!selectedBranchId ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Pilih cabang untuk melihat rules poin</div>
      ) : loadingRules ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {rules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Belum ada rule poin untuk cabang ini</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Rule</TableHead>
                    <TableHead>Poin / Rp</TableHead>
                    <TableHead>Min. Transaksi</TableHead>
                    <TableHead>Multiplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm">{r.points_per_amount} poin / Rp 1</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Rp {Number(r.min_transaction || 0).toLocaleString('id')}</TableCell>
                      <TableCell><span className="font-semibold text-amber-600">×{r.multiplier}</span></TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? 'success' : 'outline'}>{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" disabled={deletingId === r.id}
                            onClick={() => handleDelete(r)} className="text-destructive hover:bg-destructive/10">
                            {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={v => { if (!v) { setOpen(false); setEditRule(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRule ? 'Edit Rule Poin' : 'Tambah Rule Poin'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Rule *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Default" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Poin per Rp 1</label>
                <Input type="number" min="0" step="0.0001" value={form.points_per_amount} onChange={e => set('points_per_amount', e.target.value)} required />
                <p className="text-[10px] text-muted-foreground mt-0.5">Contoh: 0.001 = 1 poin per Rp 1.000</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Multiplier</label>
                <Input type="number" min="0" step="0.01" value={form.multiplier} onChange={e => set('multiplier', e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-0.5">1.0 = normal, 2.0 = double poin</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Min. Transaksi (Rp)</label>
              <Input type="number" min="0" value={form.min_transaction} onChange={e => set('min_transaction', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Opsional" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditRule(null); }}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editRule ? 'Simpan' : 'Tambah Rule'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
