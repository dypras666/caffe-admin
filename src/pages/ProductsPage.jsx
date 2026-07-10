import { useState } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import { usePermissions } from '../context/PermissionsContext';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Minus, Pencil, Trash2, Loader2, Search, PackagePlus, ArrowUpCircle, ArrowDownCircle, History, Upload, X, Image } from 'lucide-react';

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }

const EMPTY_FORM = {
  name: '', description: '', price: '', cost_price: '', sku: '',
  category_id: '', is_popular: false, is_available: true,
  image: '', gallery: [],
};

const EMPTY_STOCK_FORM = {
  qty_change: '',
  movement_type: 'adjustment',
  note: '',
};

export default function ProductsPage() {
  const { can } = usePermissions();
  const canCreate = can('create', 'products');
  const canUpdate = can('update', 'products');
  const canDelete = can('delete', 'products');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Stock adjustment dialog state
  const [stockOpen, setStockOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK_FORM);
  const [stockSaving, setStockSaving] = useState(false);
  // Quick +/- in-place (optimistic update)
  const [quickAdjusting, setQuickAdjusting] = useState(null); // product id being adjusted

  const debouncedSearch = useDebounce(search, 350);
  const qs = `?page=${page}&limit=12${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`;
  const { data, loading, refetch } = useFetch(`/products${qs}`);
  const { data: catData } = useFetch('/categories');

  const products = data?.products || [];
  const pagination = data?.pagination || {};
  const categories = catData?.categories || [];

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };
  const openEdit = (p) => {
    let gallery = [];
    try { gallery = typeof p.gallery === 'string' ? JSON.parse(p.gallery) : (p.gallery || []); } catch { gallery = []; }
    setForm({
      name: p.name, description: p.description || '', price: p.price,
      cost_price: p.cost_price || '', sku: p.sku || '',
      category_id: String(p.category_id), is_popular: !!p.is_popular, is_available: !!p.is_available,
      image: p.image || '', gallery,
    });
    setEditId(p.id);
    setOpen(true);
  };

  const openStockAdjust = (p) => {
    setStockProduct(p);
    setStockForm(EMPTY_STOCK_FORM);
    setStockOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
        category_id: parseInt(form.category_id),
        image: form.gallery?.[0] || form.image || '',
        gallery: JSON.stringify(form.gallery || []),
      };
      if (editId) await api.put(`/products/${editId}`, payload);
      else await api.post('/products', payload);
      setOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    if (!stockForm.qty_change) { alert('qty_change wajib diisi'); return; }
    setStockSaving(true);
    try {
      await api.patch(`/products/${stockProduct.id}/stock`, {
        qty_change: parseInt(stockForm.qty_change),
        movement_type: stockForm.movement_type,
        note: stockForm.note || undefined,
      });
      setStockOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyesuaikan stok');
    } finally {
      setStockSaving(false);
    }
  };

  const quickAdjust = async (product, delta) => {
    if (quickAdjusting === product.id) return;
    const newStock = product.stock + delta;
    if (newStock < 0) return;
    setQuickAdjusting(product.id);
    try {
      await api.patch(`/products/${product.id}/stock`, {
        qty_change: delta,
        movement_type: delta > 0 ? 'in' : 'adjustment',
        note: delta > 0 ? 'Tambah stok cepat' : 'Kurang stok cepat',
      });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal');
    } finally {
      setQuickAdjusting(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await api.delete(`/products/${id}`);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-1.5 ml-auto">
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Tidak ada produk</TableCell></TableRow>
                ) : products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image && (
                          <img src={p.image.startsWith('http') ? p.image : `http://localhost:3002${p.image}`} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                        )}
                        {!p.image && (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Image className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{p.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.sku || '—'}</TableCell>
                    <TableCell className="text-sm">{p.category_name || '—'}</TableCell>
                    <TableCell className="font-semibold">{formatRp(p.price)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => quickAdjust(p, -1)}
                          disabled={quickAdjusting === p.id || p.stock <= 0}
                          className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-red-100 hover:text-red-600 disabled:opacity-30 transition-colors"
                          title="Kurangi 1"
                        >
                          {quickAdjusting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className={`w-8 text-center text-sm font-semibold tabular-nums ${p.stock === 0 ? 'text-red-600' : p.stock <= (p.min_stock || 0) && p.min_stock > 0 ? 'text-amber-600' : ''}`}>
                          {p.stock}
                        </span>
                        <button
                          onClick={() => quickAdjust(p, 1)}
                          disabled={quickAdjusting === p.id}
                          className="w-5 h-5 rounded flex items-center justify-center bg-muted hover:bg-green-100 hover:text-green-600 disabled:opacity-30 transition-colors"
                          title="Tambah 1"
                        >
                          {quickAdjusting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={p.is_available ? 'success' : 'outline'}>
                          {p.is_available ? 'Tersedia' : 'Tidak'}
                        </Badge>
                        {p.is_popular ? <Badge variant="warning">Populer</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {canUpdate && (
                          <Button variant="ghost" size="icon" title="Sesuaikan Stok" onClick={() => openStockAdjust(p)}>
                            <PackagePlus className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canUpdate && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}
                            className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Halaman {pagination.page} dari {pagination.total_pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages}>Next</Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Produk *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Jual *</label>
                <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Modal</label>
                <Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</label>
                <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              {/* Image Gallery */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gambar Produk</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.gallery || []).map((url, i) => (
                    <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={url.startsWith('http') ? url : `http://localhost:3002${url}`} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, gallery: f.gallery.filter((_, j) => j !== i), image: f.gallery.length === 1 ? '' : f.image }))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        if (!files.length) return;
                        const fd = new FormData();
                        files.forEach(f => fd.append('files', f));
                        try {
                          const res = await api.post('/media/upload-multiple', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                          const urls = res.data.files.map(f => f.url || f.file_path);
                          setForm(prev => ({
                            ...prev,
                            gallery: [...(prev.gallery || []), ...urls],
                            image: prev.image || urls[0] || '',
                          }));
                        } catch (err) {
                          alert(err.response?.data?.error || 'Gagal upload gambar');
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">Gambar otomatis dikompresi ke WebP. Klik gambar untuk hapus.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />
                <label htmlFor="is_available" className="text-sm">Tersedia</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_popular" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} />
                <label htmlFor="is_popular" className="text-sm">Populer</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan Perubahan' : 'Tambah Produk'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      {stockProduct && (
        <StockAdjustDialog
          product={stockProduct}
          form={stockForm}
          setForm={setStockForm}
          saving={stockSaving}
          onSubmit={handleStockAdjust}
          onClose={() => { setStockOpen(false); setStockProduct(null); setStockForm(EMPTY_STOCK_FORM); }}
        />
      )}
    </div>
  );
}

// ─── Stock Adjust Dialog with Log ────────────────────────────
function StockAdjustDialog({ product, form, setForm, saving, onSubmit, onClose }) {
  const { data: logData, loading: logLoading, refetch: refetchLog } = useFetch(`/stock/card/${product.id}`);
  const logs = logData?.cards || [];

  const previewStock = form.qty_change
    ? product.stock + parseInt(form.qty_change || 0)
    : null;

  const MOVE_COLOR = {
    in: 'text-green-600', out: 'text-red-600', adjustment: 'text-blue-600',
    opname: 'text-violet-600', waste: 'text-orange-600', return: 'text-cyan-600',
  };
  const MOVE_LABEL = {
    in: 'Masuk', out: 'Keluar', adjustment: 'Penyesuaian',
    opname: 'Opname', waste: 'Waste', return: 'Retur',
  };

  const handleSubmitWithRefetch = async (e) => {
    await onSubmit(e);
    // Refresh log setelah simpan
    setTimeout(() => refetchLog(), 300);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-primary" />
            Penyesuaian Stok — {product.name}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-muted-foreground">Stok sekarang:</span>
            <span className="text-lg font-bold text-primary">{product.stock} {product.unit || 'pcs'}</span>
            {previewStock !== null && previewStock !== product.stock && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className={`text-lg font-bold ${previewStock < 0 ? 'text-red-600' : previewStock < product.stock ? 'text-amber-600' : 'text-green-600'}`}>
                  {previewStock}
                </span>
              </>
            )}
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmitWithRefetch} className="px-5 pt-4 pb-3 space-y-3 border-b shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Perubahan Qty *</label>
              <Input
                type="number"
                placeholder="+10 atau -5"
                value={form.qty_change}
                onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))}
                required
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Positif = masuk, negatif = keluar</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
              <Select value={form.movement_type} onValueChange={v => setForm(f => ({ ...f, movement_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Penyesuaian</SelectItem>
                  <SelectItem value="in">Masuk</SelectItem>
                  <SelectItem value="waste">Terbuang / Rusak</SelectItem>
                  <SelectItem value="return">Retur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input
                placeholder="Alasan penyesuaian stok..."
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} size="sm">Batal</Button>
            <Button type="submit" disabled={saving || !form.qty_change} size="sm">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Simpan Penyesuaian
            </Button>
          </div>
        </form>

        {/* Log riwayat */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5" />Riwayat Mutasi Stok
            </p>
            {logLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat stok</p>
            ) : (
              <div className="space-y-1">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center gap-2 py-1.5 border-b last:border-0 text-xs">
                    <span className={`font-semibold w-16 shrink-0 ${MOVE_COLOR[log.movement_type] || 'text-muted-foreground'}`}>
                      {log.qty_change > 0 ? `+${log.qty_change}` : log.qty_change}
                    </span>
                    <span className="text-muted-foreground shrink-0">{MOVE_LABEL[log.movement_type] || log.movement_type}</span>
                    <span className="flex-1 text-muted-foreground truncate">{log.note || '—'}</span>
                    <span className="text-muted-foreground shrink-0 font-mono">→{log.qty_after}</span>
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
