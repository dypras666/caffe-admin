import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { ServerSelect } from '../components/ui/server-select';
import { Plus, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, Ticket, Search, RefreshCw } from 'lucide-react';

const TYPE_LABEL = {
  total_discount: 'Diskon Total',
  item_discount:  'Diskon Item',
  free_item:      'Gratis Produk',
  bonus_points:   'Bonus Poin',
};
const TYPE_VARIANT = {
  total_discount: 'default',
  item_discount:  'secondary',
  free_item:      'warning',
  bonus_points:   'outline',
};

const EMPTY = {
  code: '', name: '', description: '', type: 'total_discount',
  discount_type: 'fixed', discount_value: '', max_discount: '',
  free_product_id: '', free_product_qty: '1',
  bonus_points_multiplier: '2',
  min_transaction: '', branch_id: '', member_only: false,
  usage_limit: '', usage_per_member: '1',
  valid_from: '', valid_until: '',
};

function formatValue(v) {
  if (v.type === 'total_discount' || v.type === 'item_discount') {
    if (v.discount_type === 'percent') return `${v.discount_value}%${v.max_discount ? ` (maks Rp${Number(v.max_discount).toLocaleString('id')})` : ''}`;
    return `Rp ${Number(v.discount_value || 0).toLocaleString('id')}`;
  }
  if (v.type === 'free_item') return `${v.free_product_name || `Produk #${v.free_product_id}`} ×${v.free_product_qty}`;
  if (v.type === 'bonus_points') return `×${v.bonus_points_multiplier} poin`;
  return '—';
}

export default function VouchersPage() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editVoucher, setEditVoucher] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [freeProduct, setFreeProduct] = useState(null);

  const { data, loading, refetch } = useFetch(`/vouchers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
  const { data: branchData } = useFetch('/branches');
  const vouchers = data?.vouchers || [];
  const branches = branchData?.branches || [];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditVoucher(null);
    setForm(EMPTY);
    setFreeProduct(null);
    setOpen(true);
  };

  const openEdit = (v) => {
    setEditVoucher(v);
    setForm({
      code: v.code, name: v.name, description: v.description || '',
      type: v.type,
      discount_type: v.discount_type || 'fixed',
      discount_value: String(v.discount_value || ''),
      max_discount: v.max_discount ? String(v.max_discount) : '',
      free_product_id: v.free_product_id ? String(v.free_product_id) : '',
      free_product_qty: String(v.free_product_qty || 1),
      bonus_points_multiplier: String(v.bonus_points_multiplier || 2),
      min_transaction: v.min_transaction ? String(v.min_transaction) : '',
      branch_id: v.branch_id ? String(v.branch_id) : '',
      member_only: !!v.member_only,
      usage_limit: v.usage_limit ? String(v.usage_limit) : '',
      usage_per_member: String(v.usage_per_member || 1),
      valid_from: v.valid_from ? v.valid_from.slice(0, 10) : '',
      valid_until: v.valid_until ? v.valid_until.slice(0, 10) : '',
    });
    setFreeProduct(v.free_product_id ? { id: v.free_product_id, name: v.free_product_name || '' } : null);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        discount_value: parseFloat(form.discount_value) || 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        free_product_id: form.free_product_id ? parseInt(form.free_product_id) : null,
        free_product_qty: parseInt(form.free_product_qty) || 1,
        bonus_points_multiplier: parseFloat(form.bonus_points_multiplier) || 1,
        min_transaction: parseFloat(form.min_transaction) || 0,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        usage_per_member: parseInt(form.usage_per_member) || 1,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      };
      if (editVoucher) await api.put(`/vouchers/${editVoucher.id}`, payload);
      else await api.post('/vouchers', payload);
      setOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const toggleActive = async (v) => {
    try {
      await api.put(`/vouchers/${v.id}`, { is_active: v.is_active ? 0 : 1 });
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal update'); }
  };

  const handleDelete = async (v) => {
    if (!confirm(`Hapus voucher "${v.code}"?`)) return;
    setDeletingId(v.id);
    try {
      await api.delete(`/vouchers/${v.id}`);
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal hapus'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Voucher & Promo</h1>
        </div>
        <span className="text-sm text-muted-foreground">{vouchers.length} voucher</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari kode / nama..." className="pl-8 h-8 text-sm w-48" />
          </div>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-3.5 h-3.5" /></Button>
          <Button onClick={openCreate} className="gap-1.5" size="sm">
            <Plus className="w-4 h-4" />Buat Voucher
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Nilai / Efek</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Berlaku Sampai</TableHead>
                  <TableHead>Kuota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12">Belum ada voucher</TableCell></TableRow>
                ) : vouchers.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-bold text-primary">{v.code}</TableCell>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell>
                      <Badge variant={TYPE_VARIANT[v.type] || 'secondary'} className="text-xs">
                        {TYPE_LABEL[v.type] || v.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatValue(v)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.branch_name || 'Semua'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.valid_until ? new Date(v.valid_until).toLocaleDateString('id-ID') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {v.used_count}/{v.usage_limit ?? '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.is_active ? 'success' : 'outline'}>
                        {v.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(v)}
                          title={v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          className={v.is_active ? 'text-amber-500' : 'text-green-600'}>
                          {v.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" disabled={deletingId === v.id}
                          onClick={() => handleDelete(v)} className="text-destructive hover:bg-destructive/10">
                          {deletingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) { setOpen(false); setEditVoucher(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editVoucher ? `Edit Voucher — ${editVoucher.code}` : 'Buat Voucher Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            {/* Kode + Nama */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kode *</label>
                <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())}
                  placeholder="HEMAT20" required disabled={!!editVoucher}
                  className={editVoucher ? 'bg-muted font-mono font-bold' : 'font-mono font-bold'} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Diskon 20%" required />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Opsional" />
            </div>

            {/* Tipe */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe *</label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_discount">Diskon Total Order</SelectItem>
                  <SelectItem value="item_discount">Diskon Item</SelectItem>
                  <SelectItem value="free_item">Gratis Produk</SelectItem>
                  <SelectItem value="bonus_points">Bonus Poin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional: discount */}
            {(form.type === 'total_discount' || form.type === 'item_discount') && (
              <div className="space-y-2 p-3 bg-muted/40 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe Diskon</label>
                    <Select value={form.discount_type} onValueChange={v => set('discount_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                        <SelectItem value="percent">Persentase (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      {form.discount_type === 'percent' ? 'Persen (%)' : 'Nominal (Rp)'} *
                    </label>
                    <Input type="number" min="0" step={form.discount_type === 'percent' ? '1' : '1000'}
                      value={form.discount_value} onChange={e => set('discount_value', e.target.value)} required />
                  </div>
                </div>
                {form.discount_type === 'percent' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Maks. Diskon (Rp, opsional)</label>
                    <Input type="number" min="0" value={form.max_discount}
                      onChange={e => set('max_discount', e.target.value)} placeholder="Kosong = tidak ada batas" />
                  </div>
                )}
              </div>
            )}

            {/* Conditional: free item */}
            {form.type === 'free_item' && (
              <div className="space-y-2 p-3 bg-muted/40 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Produk Gratis *</label>
                  <ServerSelect
                    endpoint="/products"
                    value={form.free_product_id}
                    displayValue={freeProduct?.name || ''}
                    onChange={p => { setFreeProduct(p); set('free_product_id', p ? String(p.id) : ''); }}
                    onClear={() => { setFreeProduct(null); set('free_product_id', ''); }}
                    placeholder="Cari produk..."
                    extraParams="&status=active"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty Gratis</label>
                  <Input type="number" min="1" value={form.free_product_qty}
                    onChange={e => set('free_product_qty', e.target.value)} />
                </div>
              </div>
            )}

            {/* Conditional: bonus points */}
            {form.type === 'bonus_points' && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Multiplier Poin</label>
                <Input type="number" min="1" step="0.5" value={form.bonus_points_multiplier}
                  onChange={e => set('bonus_points_multiplier', e.target.value)} />
                <p className="text-[10px] text-muted-foreground mt-1">Contoh: 2 = double poin, 1.5 = 1.5× poin</p>
              </div>
            )}

            {/* Constraints */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min. Transaksi (Rp)</label>
                <Input type="number" min="0" value={form.min_transaction}
                  onChange={e => set('min_transaction', e.target.value)} placeholder="0 = tanpa min." />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cabang</label>
                <Select value={form.branch_id || '_all'} onValueChange={v => set('branch_id', v === '_all' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Semua cabang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Semua Cabang</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kuota Total</label>
                <Input type="number" min="1" value={form.usage_limit}
                  onChange={e => set('usage_limit', e.target.value)} placeholder="Kosong = unlimited" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Maks. per Member</label>
                <Input type="number" min="1" value={form.usage_per_member}
                  onChange={e => set('usage_per_member', e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Berlaku Dari</label>
                <Input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Berlaku Sampai</label>
                <Input type="date" value={form.valid_until} onChange={e => set('valid_until', e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.member_only} onChange={e => set('member_only', e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm">Hanya untuk member terdaftar</span>
            </label>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditVoucher(null); }}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editVoucher ? 'Simpan' : 'Buat Voucher'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
