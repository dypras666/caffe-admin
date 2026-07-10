import React, { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Plus, Loader2, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useToast } from '../components/ui/toast';

const TYPE_LABELS = { weight: 'Berat', volume: 'Volume', count: 'Jumlah', other: 'Lainnya' };
const TYPE_BADGE = {
  weight: 'bg-blue-100 text-blue-700 border-blue-200',
  volume: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  count: 'bg-green-100 text-green-700 border-green-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};
const TYPE_ORDER = ['weight', 'volume', 'count', 'other'];

const EMPTY_FORM = { name: '', symbol: '', type: 'weight', base_unit_id: '', conversion_factor: '1', sort_order: '0' };

export default function UnitsPage() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/units');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const units = data?.units || [];

  // Sort units by type order, then sort_order
  const sortedUnits = [...units].sort((a, b) => {
    const ta = TYPE_ORDER.indexOf(a.type);
    const tb = TYPE_ORDER.indexOf(b.type);
    if (ta !== tb) return ta - tb;
    return Number(a.sort_order) - Number(b.sort_order);
  });

  // Group by type
  const groups = TYPE_ORDER.map(type => ({
    type,
    items: sortedUnits.filter(u => u.type === type),
  })).filter(g => g.items.length > 0);

  const openCreate = () => { setEditItem(null); setFormOpen(true); };
  const openEdit = (item) => { setEditItem(item); setFormOpen(true); };

  const handleDelete = async (unit) => {
    if (!confirm(`Nonaktifkan unit "${unit.name}"?`)) return;
    try {
      await api.delete(`/units/${unit.id}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Satuan & Konversi</h1>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />Tambah Satuan
        </Button>
      </div>

      {/* Units table grouped by type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daftar Satuan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : units.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Belum ada satuan</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Simbol</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Satuan Dasar</TableHead>
                  <TableHead>Faktor Konversi</TableHead>
                  <TableHead className="text-center">Urutan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(group => (
                  <React.Fragment key={`group-${group.type}`}>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={8} className="py-1.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded border ${TYPE_BADGE[group.type]}`}>
                          {TYPE_LABELS[group.type] || group.type}
                        </span>
                      </TableCell>
                    </TableRow>
                    {group.items.map(unit => {
                      const baseUnit = unit.base_unit_id ? units.find(u => u.id === unit.base_unit_id) : null;
                      return (
                        <TableRow key={unit.id} className={!unit.is_active ? 'opacity-50' : ''}>
                          <TableCell className="font-medium pl-6">{unit.name}</TableCell>
                          <TableCell className="font-mono text-sm">{unit.symbol}</TableCell>
                          <TableCell>
                            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded border ${TYPE_BADGE[unit.type] || TYPE_BADGE.other}`}>
                              {TYPE_LABELS[unit.type] || unit.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {baseUnit ? `${baseUnit.name} (${baseUnit.symbol})` : '—'}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {unit.base_unit_id ? Number(unit.conversion_factor).toLocaleString('id') : '—'}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{unit.sort_order}</TableCell>
                          <TableCell>
                            <Badge variant={unit.is_active ? 'success' : 'outline'}>
                              {unit.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(unit)}>
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(unit)}
                              >
                                Hapus
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Convert section */}
      <KonversiCepat units={units} />

      <UnitFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={() => { setFormOpen(false); refetch(); }}
        editItem={editItem}
        units={units}
      />
    </div>
  );
}

function KonversiCepat({ units }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [qty, setQty] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeUnits = units.filter(u => u.is_active);

  const handleConvert = async () => {
    if (!fromId || !toId || !qty) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/units/${fromId}/convert`, { params: { qty, to_unit_id: toId } });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal mengkonversi');
    } finally {
      setLoading(false);
    }
  };

  // Auto-convert when all fields are filled
  useEffect(() => {
    if (fromId && toId && qty && Number(qty) > 0) {
      handleConvert();
    } else {
      setResult(null);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId, qty]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          Konversi Cepat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah</label>
            <Input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dari Satuan</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Pilih satuan</option>
              {activeUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ke Satuan</label>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Pilih satuan</option>
              {activeUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleConvert} disabled={!fromId || !toId || !qty || loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Hitung
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        {result && (
          <div className="mt-3 bg-secondary/50 rounded-lg p-3 text-sm flex items-center gap-2">
            <span className="font-semibold text-base">{Number(result.from_qty).toLocaleString('id')}</span>
            <span className="text-muted-foreground">{result.from_unit}</span>
            <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-bold text-base text-primary">{Number(result.to_qty).toLocaleString('id', { maximumFractionDigits: 6 })}</span>
            <span className="text-muted-foreground">{result.to_unit}</span>
            <span className="ml-auto text-xs text-muted-foreground">faktor: {result.factor}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UnitFormDialog({ open, onClose, onDone, editItem, units }) {
  const toast = useToast();
  const isEdit = !!editItem;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const syncedKey = editItem?.id ?? 'new';
  useState(() => {
    if (editItem) {
      setForm({
        name: editItem.name || '',
        symbol: editItem.symbol || '',
        type: editItem.type || 'weight',
        base_unit_id: editItem.base_unit_id ? String(editItem.base_unit_id) : '',
        conversion_factor: editItem.conversion_factor != null ? String(editItem.conversion_factor) : '1',
        sort_order: editItem.sort_order != null ? String(editItem.sort_order) : '0',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [syncedKey]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Exclude self from base unit options
  const baseUnitOptions = units.filter(u => u.is_active && u.id !== editItem?.id);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        symbol: form.symbol,
        type: form.type,
        base_unit_id: form.base_unit_id ? parseInt(form.base_unit_id) : null,
        conversion_factor: parseFloat(form.conversion_factor || 1),
        sort_order: parseInt(form.sort_order || 0),
      };
      if (isEdit) await api.put(`/units/${editItem.id}`, payload);
      else await api.post('/units', payload);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Satuan' : 'Tambah Satuan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Kilogram" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Simbol *</label>
              <Input value={form.symbol} onChange={e => set('symbol', e.target.value)} placeholder="kg" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe *</label>
              <Select value={form.type} onValueChange={v => set('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Berat</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="count">Jumlah</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan</label>
              <Input type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan Dasar (opsional)</label>
              <select
                value={form.base_unit_id}
                onChange={e => set('base_unit_id', e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Tidak ada (ini adalah satuan dasar)</option>
                {baseUnitOptions.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                ))}
              </select>
            </div>
            {form.base_unit_id && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Faktor Konversi{' '}
                  <span className="font-normal text-muted-foreground/70">
                    (1 {form.symbol || 'satuan ini'} = X {baseUnitOptions.find(u => String(u.id) === form.base_unit_id)?.symbol || 'satuan dasar'})
                  </span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.conversion_factor}
                  onChange={e => set('conversion_factor', e.target.value)}
                  placeholder="1"
                  required={!!form.base_unit_id}
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
