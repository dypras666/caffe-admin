import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { ServerSelect } from '../components/ui/server-select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Plus, Loader2, Package, AlertTriangle, DollarSign, Scale, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatUnitCost(cost, unit) { return `Rp ${Number(cost || 0).toFixed(2)} / ${unit || 'unit'}`; }

/**
 * Convert a base-unit value to human-readable multi-unit string.
 *
 * Rules:
 * 1. Find the largest unit where value >= 1 full unit
 * 2. Take as many full units as possible
 * 3. Remainder shown in next smaller unit (only if remainder > 0)
 * 4. Max 2 levels (e.g. "1 kg 200 g", not "1 kg 1 ons 50 g")
 *
 * @param {number} value - quantity in base unit
 * @param {object} baseUnitObj - the base unit { symbol, conversion_factor: 1 }
 * @param {Array} allUnits - all units from /units endpoint
 * @returns {string} e.g. "1 kg 200 g" or "500 g" or "2 L 400 ml"
 */
/** Trim trailing zeros: 500.000 → "500", 1.500 → "1.5", 1.050 → "1.05" */
function trimNum(n) {
  const f = parseFloat(n);
  if (!isFinite(f)) return '0';
  // Use toPrecision-like approach: remove trailing zeros after decimal
  const s = f.toFixed(3); // max 3 decimal places
  return s.replace(/\.?0+$/, '');
}

function formatMultiUnit(value, baseUnitObj, allUnits) {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return `0${baseUnitObj ? ' ' + baseUnitObj.symbol : ''}`;
  if (num === 0) return `0 ${baseUnitObj?.symbol || ''}`;

  // No unit info — just clean number
  if (!baseUnitObj || !allUnits?.length) return `${trimNum(num)}`;

  // Build family of compatible units, largest factor first
  const family = allUnits
    .filter(u => {
      if (u.id === baseUnitObj.id) return true;
      if (baseUnitObj.base_unit_id === null) return u.base_unit_id === baseUnitObj.id;
      return u.base_unit_id === baseUnitObj.base_unit_id || u.id === baseUnitObj.base_unit_id;
    })
    .map(u => ({ ...u, factor: parseFloat(u.conversion_factor) }))
    .sort((a, b) => b.factor - a.factor);

  // Only base unit — show clean number without trailing zeros
  if (family.length <= 1) {
    return `${trimNum(num)} ${baseUnitObj.symbol}`;
  }

  let remainder = num;
  const parts = [];

  for (let i = 0; i < family.length && parts.length < 2; i++) {
    const unit = family[i];
    if (remainder <= 1e-9) break; // floating point zero

    const wholeUnits = Math.floor(remainder / unit.factor);
    if (wholeUnits >= 1) {
      parts.push(`${wholeUnits} ${unit.symbol}`);
      remainder = parseFloat((remainder - wholeUnits * unit.factor).toFixed(6));
    } else if (parts.length === 0 && i === family.length - 1) {
      // Smallest unit — show with trimmed decimal
      const clean = trimNum(remainder);
      if (parseFloat(clean) > 0) parts.push(`${clean} ${unit.symbol}`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : `${trimNum(num)} ${baseUnitObj.symbol}`;
}

const EMPTY_FORM = { name: '', code: '', unit: '', unit_cost: '', stock_qty: '', min_stock: '', supplier_id: '', supplier_name: '', notes: '' };

export default function IngredientsPage() {
  const navigate = useNavigate();
  const { data, loading, refetch } = useFetch('/ingredients');
  const { data: unitsData } = useFetch('/units');

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const ingredients = data?.ingredients || [];
  const units = unitsData?.units || [];

  const filtered = ingredients.filter(i => {
    if (!showInactive && !i.is_active) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalBahan = ingredients.filter(i => i.is_active).length;
  const stokMenipis = ingredients.filter(i => i.is_active && Number(i.stock_qty) <= Number(i.min_stock)).length;
  const totalNilai = ingredients.reduce((s, i) => s + Number(i.stock_qty || 0) * Number(i.unit_cost || 0), 0);

  const openCreate = () => { setEditItem(null); setFormOpen(true); };
  const openEdit = (item) => { setEditItem(item); setFormOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Bahan Baku</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Satuan per bahan diatur di{' '}
            <button onClick={() => navigate('/units')}
              className="text-primary hover:underline inline-flex items-center gap-0.5 font-medium">
              Master Satuan <ExternalLink className="w-3 h-3" />
            </button>
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Tambah Bahan
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="bg-primary w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Bahan</p>
              <p className="text-2xl font-bold">{totalBahan}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={stokMenipis > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="bg-amber-500 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stok Menipis</p>
              <p className="text-2xl font-bold">{stokMenipis}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="bg-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Nilai Stok</p>
              <p className="text-lg font-bold">{formatRp(totalNilai)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Cari nama bahan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Tampilkan nonaktif
        </label>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Harga Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      {search ? 'Tidak ada bahan yang cocok' : 'Belum ada bahan baku'}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(item => {
                  const isLow = Number(item.stock_qty) <= Number(item.min_stock) && Number(item.min_stock) > 0;
                  // Find base unit object for this ingredient
                  const baseUnitObj = units.find(u => u.id === item.unit_id)
                    || units.find(u => u.symbol === item.unit)
                    || { symbol: item.unit, conversion_factor: 1 };
                  const stockDisplay = formatMultiUnit(item.stock_qty, baseUnitObj, units);
                  const minDisplay  = formatMultiUnit(item.min_stock, baseUnitObj, units);
                  return (
                    <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.code || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-sm">{formatUnitCost(item.unit_cost, item.unit)}</TableCell>
                      <TableCell className="text-right">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{stockDisplay}</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-sm text-foreground">{stockDisplay}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{minDisplay}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.supplier_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'success' : 'outline'}>
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(item)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <IngredientFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={() => { setFormOpen(false); refetch(); }}
        editItem={editItem}
        units={units}
      />

    </div>
  );
}

function IngredientFormDialog({ open, onClose, onDone, editItem, units }) {
  const isEdit = !!editItem;
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'units'
  const [form, setForm] = useState({
    name: '', code: '', unit: '', unit_id: '', unit_cost: '',
    stock_qty: '', min_stock: '', supplier_id: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      // Resolve unit_id: use explicit unit_id first, fallback to match by symbol from units list
      let resolvedUnitId = editItem.unit_id ? String(editItem.unit_id) : '';
      if (!resolvedUnitId && editItem.unit && units.length > 0) {
        const matched = units.find(u => u.symbol === editItem.unit || u.name === editItem.unit);
        if (matched) resolvedUnitId = String(matched.id);
      }
      setForm({
        name: editItem.name || '',
        code: editItem.code || '',
        unit: editItem.unit || '',
        unit_id: resolvedUnitId,
        unit_cost: editItem.unit_cost || '',
        stock_qty: editItem.stock_qty || '',
        min_stock: editItem.min_stock || '',
        supplier_id: editItem.supplier_id ? String(editItem.supplier_id) : '',
        supplier_name: editItem.supplier_name || '',
        notes: editItem.notes || '',
      });
    } else {
      setForm({ name: '', code: '', unit: '', unit_id: '', unit_cost: '', stock_qty: '', min_stock: '', supplier_id: '', supplier_name: '', notes: '' });
    }
  }, [open, editItem?.id, units.length]); // re-run if units load after dialog opens

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Selected unit object for showing compatible units info
  const selectedUnit = units.find(u => String(u.id) === form.unit_id);
  const compatibleUnits = units.filter(u =>
    u.is_active && (
      u.id === selectedUnit?.id ||
      (selectedUnit?.base_unit_id && (u.base_unit_id === selectedUnit.base_unit_id || u.id === selectedUnit.base_unit_id)) ||
      (!selectedUnit?.base_unit_id && selectedUnit?.id && u.base_unit_id === selectedUnit.id)
    )
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // auto-set unit symbol from unit_id
      const unitObj = units.find(u => String(u.id) === form.unit_id);
      const payload = {
        ...form,
        unit: unitObj?.symbol || form.unit,
        unit_id: form.unit_id ? parseInt(form.unit_id) : null,
        unit_cost: parseFloat(form.unit_cost || 0),
        stock_qty: parseFloat(form.stock_qty || 0),
        min_stock: parseFloat(form.min_stock || 0),
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
      };
      if (isEdit) await api.put(`/ingredients/${editItem.id}`, payload);
      else await api.post('/ingredients', payload);
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle>{isEdit ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle>
        </DialogHeader>

        {/* Tabs — hanya tampil saat edit */}
        {isEdit && (
          <div className="flex border-b mx-6 mt-3 shrink-0">
            {[['info','Info & Stok'],['units','Satuan Kustom']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {label}
                {key === 'units' && editItem?.id && <CustomUnitBadge ingId={editItem.id} />}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {(!isEdit || activeTab === 'info') && (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Susu Segar, Gula, dll" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kode</label>
              <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="BHN-001" />
            </div>

            {/* Satuan — pilih dari master, tampilkan konversi */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Satuan Dasar *
                <span className="text-[10px] font-normal ml-1">(stok disimpan dalam satuan ini)</span>
              </label>
              <select
                value={form.unit_id}
                onChange={e => {
                  const u = units.find(u => String(u.id) === e.target.value);
                  set('unit_id', e.target.value);
                  if (u) set('unit', u.symbol);
                }}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Pilih satuan...</option>
                {['weight','volume','count','other'].map(type => {
                  const group = units.filter(u => u.is_active && u.type === type);
                  if (!group.length) return null;
                  return (
                    <optgroup key={type} label={type === 'weight' ? 'Berat' : type === 'volume' ? 'Volume' : type === 'count' ? 'Jumlah' : 'Lainnya'}>
                      {group.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            {/* Multi-unit info box */}
            {selectedUnit && compatibleUnits.length > 1 && (
              <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Satuan Multi — bisa input stok dalam satuan mana saja:
                </p>
                <p className="text-[10px] text-blue-600 mb-2">
                  Stok disimpan dalam <strong>{selectedUnit.symbol}</strong>. Saat penyesuaian stok, pilih satuan lain dan konversi otomatis.
                  Untuk tambah satuan baru ke grup ini, buka{' '}
                  <button type="button" onClick={() => navigate('/units')}
                    className="underline font-semibold">Master Satuan</button>.
                </p>
                <div className="flex flex-wrap gap-2">
                  {compatibleUnits.map(u => (
                    <span key={u.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.id === parseInt(form.unit_id) ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {u.name} ({u.symbol})
                      {u.conversion_factor !== '1.000000' && u.conversion_factor !== 1 && (
                        <span className="opacity-70 ml-1">= {parseFloat(u.conversion_factor)} {selectedUnit?.symbol}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Harga / {selectedUnit?.symbol || 'unit'} (Rp) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <Input type="number" min="0" step="0.01"
                  value={form.unit_cost === '' ? '' : Number(form.unit_cost)}
                  onChange={e => set('unit_cost', e.target.value)}
                  placeholder="0" required className="pl-8" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Stok Awal ({selectedUnit?.symbol || 'unit'})
              </label>
              <Input type="number" min="0" step="0.001" value={form.stock_qty} onChange={e => set('stock_qty', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Stok Minimum ({selectedUnit?.symbol || 'unit'})
              </label>
              <Input type="number" min="0" step="0.001" value={form.min_stock} onChange={e => set('min_stock', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Supplier</label>
              <ServerSelect
                endpoint="/stock/suppliers"
                value={form.supplier_id || ''}
                displayValue={form.supplier_name || ''}
                onChange={(s) => { set('supplier_id', String(s.id)); set('supplier_name', s.name); }}
                onClear={() => { set('supplier_id', ''); set('supplier_name', ''); }}
                placeholder="Cari supplier..."
                renderOption={(s) => (
                  <div className="flex justify-between gap-2">
                    <span>{s.name}</span>
                    {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
                  </div>
                )}
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
        )}

        {/* Tab: Satuan Kustom (hanya saat edit) */}
        {isEdit && activeTab === 'units' && editItem?.id && (
          <CustomUnitsPanel ingId={editItem.id} baseUnit={editItem.unit} />
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Badge kecil di tab satuan
function CustomUnitBadge({ ingId }) {
  const { data } = useFetch(`/ingredients/${ingId}/units`);
  const count = data?.conversions?.filter(c => c.is_active)?.length || 0;
  if (!count) return null;
  return <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{count}</span>;
}

// Panel kelola satuan kustom per bahan
function CustomUnitsPanel({ ingId, baseUnit }) {
  const { data, loading, refetch } = useFetch(`/ingredients/${ingId}/units`);
  const [addOpen, setAddOpen] = useState(false);
  const [editConv, setEditConv] = useState(null);
  const [form, setForm] = useState({ unit_name: '', unit_symbol: '', conversion_qty: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const conversions = data?.conversions || [];

  const openAdd = () => { setForm({ unit_name: '', unit_symbol: '', conversion_qty: '', notes: '' }); setEditConv(null); setAddOpen(true); };
  const openEdit = (c) => { setForm({ unit_name: c.unit_name, unit_symbol: c.unit_symbol, conversion_qty: String(parseFloat(c.conversion_qty)), notes: c.notes || '' }); setEditConv(c); setAddOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editConv) await api.put(`/ingredients/units/${editConv.id}`, form);
      else await api.post(`/ingredients/${ingId}/units`, form);
      setAddOpen(false); refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">Satuan Kustom untuk bahan ini</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Satuan dasar: <strong>{baseUnit}</strong>. Tambah satuan kemasan/ukuran lain dengan faktor konversinya.
          </p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1 shrink-0">
          <Plus className="w-3.5 h-3.5" />Tambah
        </Button>
      </div>

      {loading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : (
        <>
          {conversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada satuan kustom</p>
              <p className="text-xs mt-1">Contoh: Kaleng = 400 {baseUnit}, Karton = 4800 {baseUnit}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {conversions.map(c => (
                <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${!c.is_active ? 'opacity-50' : ''}`}>
                  <div>
                    <span className="font-semibold">{c.unit_name}</span>
                    <span className="text-muted-foreground text-xs ml-1.5">({c.unit_symbol})</span>
                    {c.notes && <span className="text-xs text-muted-foreground ml-2">— {c.notes}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-primary font-medium bg-primary/8 px-2 py-0.5 rounded-full">
                      1 {c.unit_symbol} = {parseFloat(c.conversion_qty).toLocaleString('id')} {baseUnit}
                    </span>
                    <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={async () => { if(confirm(`Hapus satuan "${c.unit_name}"?`)) { await api.delete(`/ingredients/units/${c.id}`); refetch(); } }}
                      className="text-destructive hover:bg-destructive/10 p-1 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit dialog */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setAddOpen(false)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-semibold mb-4">{editConv ? 'Edit Satuan' : 'Tambah Satuan Kustom'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Satuan *</label>
                  <Input value={form.unit_name} onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))} required placeholder="Kaleng, Karton, Pak" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Simbol *</label>
                  <Input value={form.unit_symbol} onChange={e => setForm(f => ({ ...f, unit_symbol: e.target.value.toLowerCase() }))} required placeholder="kln, ktn, pak" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    1 {form.unit_symbol || 'satuan'} = ? {baseUnit} *
                  </label>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0.0001" step="any" value={form.conversion_qty}
                      onChange={e => setForm(f => ({ ...f, conversion_qty: e.target.value }))} required placeholder="400" className="flex-1" />
                    <span className="text-sm text-muted-foreground shrink-0">{baseUnit}</span>
                  </div>
                  {form.conversion_qty && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Contoh: 3 {form.unit_symbol || 'satuan'} = {(3 * parseFloat(form.conversion_qty || 0)).toLocaleString('id')} {baseUnit}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)}>Batal</Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  {editConv ? 'Simpan' : 'Tambah Satuan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustStockDialog({ item, onClose, onDone }) {
  const [inputMode, setInputMode] = useState('base'); // 'base' | 'convert' | 'custom'
  const [inputUnitId, setInputUnitId] = useState('');
  const [customUnitSymbol, setCustomUnitSymbol] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [qtyChange, setQtyChange] = useState('');
  const [movementType, setMovementType] = useState('adjustment');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Load compatible master units + custom units for this ingredient
  const { data: compatData } = useFetch(`/ingredients/compatible-units/${item.id}`);
  const { data: customData } = useFetch(`/ingredients/${item.id}/units`);
  const compatibleUnits = compatData?.units || [];
  const customUnits = (customData?.conversions || []).filter(c => c.is_active);
  const hasMultiUnit = compatibleUnits.length > 1;
  const hasCustomUnits = customUnits.length > 0;

  // Conversion preview
  const selectedInputUnit = compatibleUnits.find(u => String(u.id) === inputUnitId);
  const baseUnit = compatibleUnits.find(u => u.id === compatData?.base_unit_id) || compatibleUnits[0];
  const itemUnit = item.unit;

  // Selected custom unit
  const selectedCustomUnit = customUnits.find(c => c.unit_symbol === customUnitSymbol);

  // Calculate preview in base unit
  let previewChange = null;
  if (inputMode === 'convert' && inputQty && selectedInputUnit && baseUnit) {
    const fromFactor = parseFloat(selectedInputUnit.conversion_factor || 1);
    const toFactor = parseFloat(baseUnit.conversion_factor || 1);
    previewChange = (parseFloat(inputQty) * fromFactor / toFactor).toFixed(6);
  } else if (inputMode === 'custom' && inputQty && selectedCustomUnit) {
    previewChange = (parseFloat(inputQty) * parseFloat(selectedCustomUnit.conversion_qty)).toFixed(6);
  } else if (inputMode === 'base' && qtyChange) {
    previewChange = parseFloat(qtyChange).toFixed(6);
  }
  const newQty = previewChange !== null
    ? parseFloat(item.stock_qty) + parseFloat(previewChange)
    : null;

  // Format helpers using multi-unit
  const baseUnitObj = baseUnit || { symbol: itemUnit, conversion_factor: 1 };
  const stockNow  = formatMultiUnit(item.stock_qty, baseUnitObj, compatibleUnits);
  const stockNext = newQty !== null ? formatMultiUnit(newQty, baseUnitObj, compatibleUnits) : null;

  const handleSave = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (inputMode === 'base' && !qtyChange) return alert('Masukkan jumlah');
    if (inputMode === 'convert' && (!inputQty || !inputUnitId)) return alert('Masukkan jumlah dan pilih satuan');
    if (inputMode === 'custom' && (!inputQty || !customUnitSymbol)) return alert('Pilih satuan dan masukkan jumlah');
    setSaving(true);
    try {
      const payload = { movement_type: movementType, note };
      if (inputMode === 'convert') {
        payload.input_qty = parseFloat(inputQty);
        payload.input_unit_id = parseInt(inputUnitId);
        payload.qty_change = 0;
      } else if (inputMode === 'custom') {
        payload.input_qty = parseFloat(inputQty);
        payload.custom_unit_symbol = customUnitSymbol;
        payload.qty_change = 0;
      } else {
        payload.qty_change = parseFloat(qtyChange);
      }
      await api.post(`/ingredients/${item.id}/adjust`, payload);
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok — {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current stock info — multi-unit display */}
          <div className="bg-secondary/40 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Stok saat ini</p>
                <p className="text-xl font-bold text-primary">{stockNow}</p>
                {/* Raw base value */}
                <p className="text-[10px] text-muted-foreground mt-0.5">{trimNum(item.stock_qty)} {itemUnit}</p>
              </div>
              {stockNext !== null && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Setelah penyesuaian →</p>
                  <p className={`text-xl font-bold ${newQty < 0 ? 'text-red-600' : newQty < parseFloat(item.stock_qty) ? 'text-amber-600' : 'text-green-600'}`}>
                    {stockNext}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{trimNum(newQty)} {itemUnit}</p>
                </div>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          {(hasCustomUnits || hasMultiUnit) && (
            <div className="flex bg-muted rounded-lg p-1 gap-0.5 flex-wrap">
              <button type="button" onClick={() => setInputMode('base')}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[80px] ${inputMode === 'base' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                {itemUnit}
              </button>
              {hasCustomUnits && (
                <button type="button" onClick={() => { setInputMode('custom'); setMovementType('in'); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[80px] ${inputMode === 'custom' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                  Satuan Kemasan
                </button>
              )}
              {hasMultiUnit && (
                <button type="button" onClick={() => { setInputMode('convert'); setMovementType('in'); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[80px] ${inputMode === 'convert' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                  Konversi Satuan
                </button>
              )}
            </div>
          )}

          {/* Input fields */}
          <div className="space-y-3">
            {inputMode === 'base' ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Jumlah (+/-) dalam <strong>{itemUnit}</strong> *
                </label>
                <Input type="number" step="0.001" value={qtyChange}
                  onChange={e => setQtyChange(e.target.value)}
                  placeholder={`mis. 500 atau -100 (dalam ${itemUnit})`}
                  autoFocus />
              </div>
            ) : inputMode === 'custom' ? (
              // Mode: Satuan Kemasan (custom per bahan)
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan Kemasan *</label>
                    <select value={customUnitSymbol} onChange={e => setCustomUnitSymbol(e.target.value)} required
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Pilih satuan...</option>
                      {customUnits.map(c => (
                        <option key={c.id} value={c.unit_symbol}>
                          {c.unit_name} ({c.unit_symbol}) = {parseFloat(c.conversion_qty).toLocaleString('id')} {itemUnit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Jumlah {selectedCustomUnit ? `(${selectedCustomUnit.unit_symbol})` : ''} *
                    </label>
                    <Input type="number" step="0.001" min="0.001" value={inputQty}
                      onChange={e => setInputQty(e.target.value)}
                      placeholder="1" autoFocus />
                  </div>
                </div>
                {previewChange && selectedCustomUnit && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-sm flex flex-wrap items-center gap-2">
                    <span className="font-bold text-emerald-800">{inputQty} {selectedCustomUnit.unit_name}</span>
                    <span className="text-emerald-400">→</span>
                    <span className="font-bold text-emerald-900 text-base">{trimNum(parseFloat(previewChange))} {itemUnit}</span>
                    <span className="text-[10px] text-emerald-600">
                      (1 {selectedCustomUnit.unit_symbol} = {parseFloat(selectedCustomUnit.conversion_qty).toLocaleString('id')} {itemUnit})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              // Mode: Konversi Satuan Master
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan *</label>
                    <select value={inputUnitId} onChange={e => setInputUnitId(e.target.value)} required
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Pilih satuan...</option>
                      {compatibleUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Jumlah {selectedInputUnit ? `(${selectedInputUnit.symbol})` : ''} *
                    </label>
                    <Input type="number" step="0.001" min="0" value={inputQty}
                      onChange={e => setInputQty(e.target.value)} placeholder="0" autoFocus />
                  </div>
                </div>
                {previewChange && selectedInputUnit && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-sm flex flex-wrap items-center gap-2">
                    <span className="font-bold text-blue-800">{inputQty} {selectedInputUnit.symbol}</span>
                    <span className="text-blue-400">→</span>
                    <span className="font-bold text-blue-900 text-base">
                      {formatMultiUnit(parseFloat(previewChange), baseUnitObj, compatibleUnits)}
                    </span>
                    <span className="text-[10px] text-blue-500">
                      (1 {selectedInputUnit.symbol} = {parseFloat(selectedInputUnit.conversion_factor)} {baseUnit?.symbol})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tipe — hanya tampil di mode base, mode konversi otomatis "in" */}
            {inputMode === 'base' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe Pergerakan</label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Masuk / Pembelian</SelectItem>
                    <SelectItem value="adjustment">Penyesuaian</SelectItem>
                    <SelectItem value="waste">Waste / Rusak</SelectItem>
                    <SelectItem value="return">Retur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keterangan</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan penyesuaian..." />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
