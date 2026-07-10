import { useState, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { CreditCard, Wallet, Plus, Loader2, Star, StarOff, Pencil, Trash2, Upload, Image } from 'lucide-react';
import { useToast } from '../components/ui/toast';

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatDate(d) { return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }); }

const TYPE_LABEL = { cash: 'Tunai', digital: 'Digital', transfer: 'Transfer', wallet: 'Dompet' };
const EMPTY_METHOD = { name: '', code: '', type: 'digital', description: '', icon: '', sort_order: 99 };

export default function PaymentsPage() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="methods">
        <TabsList>
          <TabsTrigger value="methods">Metode Pembayaran</TabsTrigger>
          <TabsTrigger value="balance">Saldo Member</TabsTrigger>
          <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
        </TabsList>
        <TabsContent value="methods" className="mt-4"><PaymentMethodsTab /></TabsContent>
        <TabsContent value="balance" className="mt-4"><BalanceTab /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><TransactionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function PaymentMethodsTab() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/payments/methods');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_METHOD);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [iconPreview, setIconPreview] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const fileRef = useRef();

  const methods = data?.methods || [];

  const openCreate = () => { setForm(EMPTY_METHOD); setEditId(null); setIconPreview(null); setIconFile(null); setOpen(true); };
  const openEdit = (m) => {
    setForm({ name: m.name, code: m.code, type: m.type, description: m.description || '', icon: m.icon || '', sort_order: m.sort_order });
    setEditId(m.id);
    setIconPreview(m.icon && m.icon.startsWith('http') ? m.icon : null);
    setOpen(true);
  };

  const handleIconFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.icon && !iconFile) {
      toast.error('Icon wajib diupload');
      return;
    }
    setSaving(true);
    try {
      if (iconFile) {
        const fd = new FormData();
        fd.append('file', iconFile);
        const res = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        form.icon = res.data.media?.url || res.data.url;
      }
      if (editId) await api.put(`/payments/methods/${editId}`, form);
      else await api.post('/payments/methods', form);
      setOpen(false);
      setIconFile(null);
      setIconPreview(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus metode pembayaran ini?')) return;
    try {
      await api.delete(`/payments/methods/${id}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  const toggle = async (id, current) => {
    try {
      await api.put(`/payments/methods/${id}`, { is_active: !current });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal');
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Tambah Metode
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map(m => (
          <Card key={m.id} className={`transition-all hover:shadow-md ${!m.is_active ? 'opacity-60 grayscale' : ''}`}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Icon: image URL or emoji */}
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border">
                    {m.icon ? (
                      <img src={m.icon} alt={m.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-2xl">💳</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.code}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{TYPE_LABEL[m.type]}</Badge>
                  </div>
                </div>
                <Badge variant={m.is_active ? 'success' : 'outline'}>{m.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
              {m.description && <p className="text-xs text-muted-foreground mb-3">{m.description}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toggle(m.id, m.is_active)}>
                  {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(m.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Icon upload area */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Icon / Logo *</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                  onClick={() => fileRef.current?.click()}
                >
                  {iconPreview ? (
                    <img src={iconPreview} alt="icon" className="w-full h-full object-contain p-1" />
                  ) : form.icon ? (
                    <span className="text-3xl">{form.icon}</span>
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleIconFile} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
                    <Upload className="w-3 h-3" />Upload Gambar
                  </Button>
                  {!form.icon && !iconFile && (
                    <p className="text-xs text-red-500 mt-1">Wajib upload gambar</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Metode *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="misal: GoPay, OVO" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kode Unik *</label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g,'_') }))}
                  required
                  disabled={!!editId}
                  placeholder="gopay"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe *</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))} disabled={!!editId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Keterangan singkat..." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan Tampil</label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan Perubahan' : 'Tambah Metode'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BalanceTab() {
  const toast = useToast();
  const { data: usersData, loading } = useFetch('/users');
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupForm, setTopupForm] = useState({ user_id: '', amount: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(null);
  const { refetch } = useFetch('/users');

  const users = (usersData?.users || []).filter(u => u.role === 'member' || u.role === 'kasir' || u.role === 'admin');

  const handleTopup = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/payments/topup', {
        user_id: parseInt(topupForm.user_id),
        amount: parseFloat(topupForm.amount),
        note: topupForm.note,
      });
      setTopupOpen(false);
      setTopupForm({ user_id: '', amount: '', note: '' });
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal top-up');
    } finally {
      setSaving(false);
    }
  };

  const togglePriority = async (userId, current) => {
    setUpdatingPriority(userId);
    try {
      await api.post('/payments/priority', { user_id: userId, is_priority: !current });
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal update');
    } finally {
      setUpdatingPriority(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setTopupOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Top-up Saldo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                  <TableCell className="font-semibold text-primary">{formatRp(u.balance || 0)}</TableCell>
                  <TableCell>
                    {u.is_priority ? (
                      <Badge variant="warning" className="gap-1"><Star className="w-3 h-3" />Priority</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => { setTopupForm(f => ({ ...f, user_id: String(u.id) })); setTopupOpen(true); }}
                      >
                        Top-up
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={updatingPriority === u.id}
                        onClick={() => togglePriority(u.id, u.is_priority)}
                        title={u.is_priority ? 'Hapus priority' : 'Jadikan priority'}
                        className={u.is_priority ? 'text-amber-500' : 'text-muted-foreground'}
                      >
                        {updatingPriority === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                          u.is_priority ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top-up Saldo Member</DialogTitle></DialogHeader>
          <form onSubmit={handleTopup} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pilih User *</label>
              <select
                value={topupForm.user_id}
                onChange={e => setTopupForm(f => ({ ...f, user_id: e.target.value }))}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih user --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email}) — {formatRp(u.balance || 0)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah Top-up *</label>
              <Input type="number" min={1000} step={1000} placeholder="50000" value={topupForm.amount} onChange={e => setTopupForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input placeholder="Transfer BCA, dll" value={topupForm.note} onChange={e => setTopupForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setTopupOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Top-up Saldo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionsTab() {
  const { data, loading } = useFetch('/payments/balance');
  const txs = data?.transactions || [];

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Sebelum</TableHead>
              <TableHead>Sesudah</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Belum ada transaksi</TableCell></TableRow>
            ) : txs.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                <TableCell>
                  <Badge variant={t.type === 'topup' ? 'success' : t.type === 'refund' ? 'warning' : 'outline'}>
                    {t.type}
                  </Badge>
                </TableCell>
                <TableCell className={`font-semibold ${t.type === 'topup' || t.type === 'refund' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'topup' || t.type === 'refund' ? '+' : '-'}{formatRp(t.amount)}
                </TableCell>
                <TableCell className="text-sm">{formatRp(t.balance_before)}</TableCell>
                <TableCell className="text-sm font-medium">{formatRp(t.balance_after)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.note || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
