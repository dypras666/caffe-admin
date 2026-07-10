import { useState, useCallback } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ServerSelect } from '../components/ui/server-select';
import { Plus, Loader2, RefreshCw, Trash2, X } from 'lucide-react';

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }

function MarginBadge({ pct }) {
  const p = Number(pct || 0);
  if (p >= 60) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{p.toFixed(1)}%</span>;
  if (p >= 30) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{p.toFixed(1)}%</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{p.toFixed(1)}%</span>;
}

export default function RecipesPage() {
  const { data: recipesData, loading, refetch } = useFetch('/recipes');

  const [editorProductId, setEditorProductId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [recalculating, setRecalculating] = useState(false);

  const recipes = recipesData?.recipes || [];

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/recipes/recalculate-all');
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal recalculate'); }
    finally { setRecalculating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Resep Produk & HPP</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <ServerSelect
            endpoint="/products"
            value={selectedProductId || ''}
            displayValue={selectedProductName || ''}
            onChange={(p) => { setSelectedProductId(String(p.id)); setSelectedProductName(p.name); }}
            onClear={() => { setSelectedProductId(null); setSelectedProductName(''); }}
            placeholder="Cari dan pilih produk..."
            extraParams="&status=active"
            renderOption={(p) => (
              <div className="flex justify-between gap-2">
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{p.sku || ''}</span>
              </div>
            )}
            className="w-72"
          />
          {selectedProductId && (
            <Button size="sm" className="text-xs h-9 gap-1" onClick={() => setEditorProductId(Number(selectedProductId))}>
              <Plus className="w-3 h-3" />Kelola Resep
            </Button>
          )}
          <Button variant="outline" onClick={handleRecalculate} disabled={recalculating} className="gap-1.5">
            {recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recalculate All HPP
          </Button>
        </div>
      </div>

      {/* Products with recipes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Produk dengan Resep ({recipes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Laba Kotor</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">Belum ada resep</TableCell>
                  </TableRow>
                ) : recipes.map(r => (
                  <TableRow key={r.product_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditorProductId(r.product_id)}>
                    <TableCell className="font-medium">{r.product_name}</TableCell>
                    <TableCell className="text-right text-sm">{formatRp(r.selling_price)}</TableCell>
                    <TableCell className="text-right text-sm">{formatRp(r.last_cost)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-emerald-600">{formatRp(r.gross_profit)}</TableCell>
                    <TableCell className="text-right"><MarginBadge pct={r.margin_pct} /></TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={e => { e.stopPropagation(); setEditorProductId(r.product_id); }}>
                        Edit Resep
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editorProductId && (
        <RecipeEditorDialog
          productId={editorProductId}
          onClose={() => setEditorProductId(null)}
          onDone={() => { setEditorProductId(null); refetch(); }}
        />
      )}
    </div>
  );
}

function RecipeEditorDialog({ productId, onClose, onDone }) {
  const { data: recipeData, loading } = useFetch(`/recipes/${productId}`);
  const { data: unitsData } = useFetch('/units');
  const units = unitsData?.units || [];

  const [meta, setMeta] = useState({ notes: '', yield_qty: 1, prep_time_min: '' });
  const [items, setItems] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const product = recipeData?.product;

  // Initialize form from loaded recipe
  if (!loading && recipeData && !initialized) {
    setInitialized(true);
    if (recipeData.recipe) {
      setMeta({
        notes: recipeData.recipe.notes || '',
        yield_qty: recipeData.recipe.yield_qty || 1,
        prep_time_min: recipeData.recipe.prep_time_min || '',
      });
    }
    if (recipeData.items?.length > 0) {
      setItems(recipeData.items.map(i => ({
        ingredient_id: String(i.ingredient_id || ''),
        ingredient_name: i.ingredient_name || '',
        qty: i.qty || '',
        unit: i.unit || '',
        unit_cost: parseFloat(i.unit_cost || 0),
        waste_pct: i.waste_pct || 0,
        notes: i.notes || '',
        line_cost: i.line_cost || 0,
      })));
    } else {
      setItems([{ ingredient_id: '', ingredient_name: '', qty: '', unit: '', unit_cost: 0, waste_pct: 0, notes: '', line_cost: 0 }]);
    }
  }

  const updateItem = (idx, fieldOrObj, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = typeof fieldOrObj === 'object'
        ? { ...item, ...fieldOrObj }
        : { ...item, [fieldOrObj]: val };
      // Auto-calculate line_cost
      const qty = parseFloat(updated.qty || 0);
      const waste = parseFloat(updated.waste_pct || 0) / 100;
      updated.line_cost = qty * (1 + waste) * Number(updated.unit_cost || 0);
      return updated;
    }));
  };

  const addItem = () => setItems(prev => [...prev, { ingredient_id: '', ingredient_name: '', qty: '', unit: '', unit_cost: 0, waste_pct: 0, notes: '', line_cost: 0 }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const totalHPP = items.reduce((s, i) => s + Number(i.line_cost || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    if (items.some(i => !i.ingredient_id || !i.qty)) return alert('Lengkapi semua bahan');
    setSaving(true);
    try {
      await api.post(`/recipes/${productId}`, {
        ...meta,
        yield_qty: parseFloat(meta.yield_qty || 1),
        prep_time_min: meta.prep_time_min ? parseInt(meta.prep_time_min) : null,
        items: items.map(i => ({
          ingredient_id: parseInt(i.ingredient_id),
          qty: parseFloat(i.qty),
          unit: i.unit,
          waste_pct: parseFloat(i.waste_pct || 0),
          notes: i.notes,
        })),
      });
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan resep'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Hapus resep ini?')) return;
    setDeleting(true);
    try {
      await api.delete(`/recipes/${productId}`);
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menghapus'); }
    finally { setDeleting(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resep — {product?.name || recipeData?.recipe?.product_name || `Produk #${productId}`}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Yield (porsi/pcs)</label>
                <Input type="number" min="0.01" step="0.01" value={meta.yield_qty} onChange={e => setMeta(m => ({ ...m, yield_qty: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Waktu Prep (menit)</label>
                <Input type="number" min="0" value={meta.prep_time_min} onChange={e => setMeta(m => ({ ...m, prep_time_min: e.target.value }))} placeholder="—" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <Input value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))} />
              </div>
            </div>

            {/* Items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Bahan-bahan</p>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs h-7 gap-1">
                  <Plus className="w-3 h-3" />Tambah Bahan
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Bahan</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-24">Qty</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Satuan</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Waste%</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground w-28">Biaya</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 py-1.5">
                          <ServerSelect
                            endpoint="/ingredients"
                            value={item.ingredient_id || ''}
                            displayValue={item.ingredient_name || ''}
                            onChange={(ing) => updateItem(idx, {
                              ingredient_id: String(ing.id),
                              ingredient_name: ing.name,
                              unit: ing.unit,
                              unit_cost: parseFloat(ing.unit_cost || 0),
                            })}
                            onClear={() => updateItem(idx, { ingredient_id: '', ingredient_name: '', unit: '', unit_cost: 0 })}
                            placeholder="Cari bahan..."
                            renderOption={(i) => (
                              <div className="flex justify-between gap-2">
                                <span>{i.name}</span>
                                <span className="text-xs text-muted-foreground">{i.unit} · Rp {Number(i.unit_cost||0).toLocaleString('id')}</span>
                              </div>
                            )}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.qty}
                            onChange={e => updateItem(idx, 'qty', e.target.value)}
                            className="h-8 text-xs"
                            required
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={item.unit}
                            onChange={e => updateItem(idx, 'unit', e.target.value)}
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">—</option>
                            {units.map(u => (
                              <option key={u.id} value={u.symbol}>{u.symbol}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={item.waste_pct}
                            onChange={e => updateItem(idx, 'waste_pct', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground">
                          {formatRp(item.line_cost)}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HPP Preview */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Total HPP</p>
                <p className="text-xl font-bold text-foreground">{formatRp(totalHPP)}</p>
              </div>
              {product?.price && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Laba Kotor</p>
                  <p className="text-xl font-bold text-emerald-600">{formatRp(Number(product.price) - totalHPP)}</p>
                  <p className="text-xs text-muted-foreground">
                    Margin: <MarginBadge pct={Number(product.price) > 0 ? ((Number(product.price) - totalHPP) / Number(product.price)) * 100 : 0} />
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {recipeData?.recipe && (
                <Button type="button" variant="ghost" className="text-destructive text-xs" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Hapus Resep
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan Resep
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
