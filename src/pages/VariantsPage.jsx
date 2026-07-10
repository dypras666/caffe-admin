import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ServerSelect } from '../components/ui/server-select';
import {
  Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, Layers, Package, Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';

function formatRp(v) {
  const n = Number(v || 0);
  return n >= 0 ? `+Rp ${n.toLocaleString('id')}` : `-Rp ${Math.abs(n).toLocaleString('id')}`;
}

export default function VariantsPage() {
  const { data: ingredientsData } = useFetch('/ingredients');
  const { data: unitsData } = useFetch('/units');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const { data, loading, refetch } = useFetch(
    selectedProduct ? `/variants/${selectedProduct}` : null,
    [selectedProduct]
  );

  const ingredients = ingredientsData?.ingredients || [];
  const units = unitsData?.units || [];
  const variantGroups = data?.variant_groups || [];
  const addonGroups = data?.addon_groups || [];
  const product = data?.product;

  return (
    <div className="space-y-5">
      {/* Product selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            <ServerSelect
              endpoint="/products"
              value={selectedProduct || ''}
              displayValue={selectedProductName || ''}
              onChange={(p) => { setSelectedProduct(String(p.id)); setSelectedProductName(p.name); }}
              onClear={() => { setSelectedProduct(null); setSelectedProductName(''); }}
              placeholder="Pilih produk untuk kelola varian & addon"
              extraParams="&status=active"
              renderOption={(p) => (
                <div className="flex justify-between gap-2">
                  <span>{p.name}</span>
                  <span className="text-xs text-muted-foreground">Rp {Number(p.price||0).toLocaleString('id')}</span>
                </div>
              )}
              className="w-80"
            />
            {product && (
              <span className="text-sm text-muted-foreground">
                Harga dasar: <strong>Rp {Number(product.price).toLocaleString('id')}</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedProduct && (
        <div className="text-center py-20 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Pilih produk untuk mengelola varian dan addon</p>
        </div>
      )}

      {selectedProduct && loading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {selectedProduct && !loading && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Variant Groups ── */}
          <VariantSection productId={selectedProduct} groups={variantGroups} ingredients={ingredients} units={units} onRefresh={refetch} />

          {/* ── Addon Groups ── */}
          <AddonSection productId={selectedProduct} groups={addonGroups} ingredients={ingredients} units={units} onRefresh={refetch} />
        </div>
      )}
    </div>
  );
}

// ─── Variant Section ──────────────────────────────────────────
function VariantSection({ productId, groups, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', is_required: true, min_select: 1, max_select: 1, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const handleAddGroup = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/variants/${productId}/groups`, groupForm);
      setAddGroupOpen(false);
      setGroupForm({ name: '', is_required: true, min_select: 1, max_select: 1, sort_order: 0 });
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4 text-violet-500" />Varian Produk
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Pilihan yang mengubah harga (ukuran, suhu, dll)</p>
        </div>
        <Button size="sm" onClick={() => setAddGroupOpen(true)} className="gap-1 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-3.5 h-3.5" />Tambah Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Belum ada varian. Tambah group untuk mulai.
          </CardContent>
        </Card>
      ) : (
        groups.map(group => (
          <VariantGroupCard key={group.id} group={group} ingredients={ingredients} units={units} onRefresh={onRefresh} />
        ))
      )}

      {/* Add Group Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Group Varian</DialogTitle></DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Group *</label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ukuran, Suhu, Level Gula, dll" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Pilihan</label>
                <Input type="number" min={0} value={groupForm.min_select} onChange={e => setGroupForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Pilihan</label>
                <Input type="number" min={1} value={groupForm.max_select} onChange={e => setGroupForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))} />
                <p className="text-[10px] text-muted-foreground mt-0.5">1 = radio, &gt;1 = bisa pilih banyak</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vg_req" checked={groupForm.is_required} onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
              <label htmlFor="vg_req" className="text-sm">Wajib dipilih pelanggan</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddGroupOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Tambah</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VariantGroupCard({ group, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(true);
  const [addOptOpen, setAddOptOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [optForm, setOptForm] = useState({ name: '', price_modifier: 0, is_default: false, sort_order: 0 });
  const [groupForm, setGroupForm] = useState({ name: group.name, is_required: !!group.is_required, min_select: group.min_select, max_select: group.max_select });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGroupForm({ name: group.name, is_required: !!group.is_required, min_select: group.min_select, max_select: group.max_select });
  }, [group.name, group.is_required, group.min_select, group.max_select]);

  const handleAddOption = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/variants/groups/${group.id}/options`, optForm);
      setAddOptOpen(false);
      setOptForm({ name: '', price_modifier: 0, is_default: false, sort_order: 0 });
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/variants/groups/${group.id}`, groupForm);
      setEditGroupOpen(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const deleteGroup = async () => {
    if (!confirm(`Hapus group "${group.name}" beserta semua opsinya?`)) return;
    await api.delete(`/variants/groups/${group.id}`);
    onRefresh();
  };

  const deleteOption = async (optId) => {
    await api.delete(`/variants/options/${optId}`);
    onRefresh();
  };

  const toggleDefault = async (optId) => {
    await api.put(`/variants/options/${optId}`, { is_default: true });
    onRefresh();
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {group.name}
            <Badge variant={group.is_required ? 'destructive' : 'secondary'} className="text-[10px]">
              {group.is_required ? 'Wajib' : 'Opsional'}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-normal">
              {group.min_select === group.max_select && group.max_select === 1 ? 'pilih 1' : `pilih ${group.min_select}–${group.max_select}`}
            </span>
          </button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddOptOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditGroupOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={deleteGroup}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="space-y-1.5">
            {(group.options || []).length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Belum ada opsi. Tambah opsi dulu.</p>
            )}
            {(group.options || []).map(opt => (
              <div key={opt.id} className={cn('flex items-center justify-between p-2 rounded-lg border text-sm', !opt.is_active ? 'opacity-50' : '')}>
                <div className="flex items-center gap-2">
                  {opt.is_default && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Default</span>}
                  <div>
                    <span className="font-medium">{opt.name}</span>
                    {opt.ingredient_id && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        🧪 {opt.ingredient_qty}{opt.ingredient_unit || ''} {ingredients.find(ig => ig.id === opt.ingredient_id)?.name || `#${opt.ingredient_id}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-semibold', opt.price_modifier > 0 ? 'text-green-600' : opt.price_modifier < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                    {opt.price_modifier === 0 ? '±0' : formatRp(opt.price_modifier)}
                  </span>
                  {!opt.is_default && (
                    <button onClick={() => toggleDefault(opt.id)} className="text-[10px] text-muted-foreground hover:text-amber-600 px-1.5 py-0.5 rounded hover:bg-amber-50">
                      Set Default
                    </button>
                  )}
                  <EditOptionButton opt={opt} ingredients={ingredients} units={units} onRefresh={onRefresh} />
                  <button onClick={() => deleteOption(opt.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {/* Add Option */}
      <Dialog open={addOptOpen} onOpenChange={setAddOptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Opsi — {group.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddOption} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Opsi *</label>
              <Input value={optForm.name} onChange={e => setOptForm(f => ({ ...f, name: e.target.value }))} required placeholder="Small, Iced, Less Sugar, dll" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Modifier Harga (Rp)</label>
              <Input type="number" value={optForm.price_modifier} onChange={e => setOptForm(f => ({ ...f, price_modifier: parseFloat(e.target.value) || 0 }))} placeholder="0 = sama, -2000 = lebih murah, +5000 = lebih mahal" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Contoh: Size Small = -2000, Large = +5000</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="opt_def" checked={optForm.is_default} onChange={e => setOptForm(f => ({ ...f, is_default: e.target.checked }))} />
              <label htmlFor="opt_def" className="text-sm">Set sebagai default</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddOptOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Tambah</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Group — {group.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditGroup} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Group</label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Pilih</label>
                <Input type="number" min={0} value={groupForm.min_select} onChange={e => setGroupForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Pilih</label>
                <Input type="number" min={1} value={groupForm.max_select} onChange={e => setGroupForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="vg_req_e" checked={groupForm.is_required} onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
              <label htmlFor="vg_req_e" className="text-sm">Wajib dipilih</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditGroupOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditOptionButton({ opt, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: opt.name,
    price_modifier: opt.price_modifier,
    is_active: !!opt.is_active,
    ingredient_id: opt.ingredient_id ? String(opt.ingredient_id) : '',
    ingredient_qty: opt.ingredient_qty || '',
    ingredient_unit: opt.ingredient_unit || '',
  });
  const [ingExpanded, setIngExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/variants/options/${opt.id}`, {
        ...form,
        ingredient_id: form.ingredient_id ? parseInt(form.ingredient_id) : null,
        ingredient_qty: form.ingredient_qty !== '' ? parseFloat(form.ingredient_qty) : null,
        ingredient_unit: form.ingredient_unit || null,
      });
      setOpen(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary">
        <Pencil className="w-3 h-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Opsi: {opt.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nama</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Modifier Harga (Rp)</label>
              <Input type="number" value={form.price_modifier} onChange={e => setForm(f => ({ ...f, price_modifier: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label className="text-sm">Aktif</label>
            </div>
            {/* Collapsible ingredient link */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setIngExpanded(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>Hubungkan ke Bahan (untuk HPP)</span>
                {ingExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {ingExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t pt-3">
                  <p className="text-[10px] text-muted-foreground">Bahan Terkait (untuk HPP)</p>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bahan</label>
                    <select
                      value={form.ingredient_id}
                      onChange={e => setForm(f => ({ ...f, ingredient_id: e.target.value }))}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">— Tidak terhubung —</option>
                      {(ingredients || []).filter(ig => ig.is_active).map(ig => (
                        <option key={ig.id} value={ig.id}>{ig.name} ({ig.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty Bahan</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.ingredient_qty}
                        onChange={e => setForm(f => ({ ...f, ingredient_qty: e.target.value }))}
                        className="h-8 text-xs"
                        placeholder="mis. 50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan</label>
                      <select
                        value={form.ingredient_unit}
                        onChange={e => setForm(f => ({ ...f, ingredient_unit: e.target.value }))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— pilih satuan —</option>
                        {(units || []).map(u => (
                          <option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Addon Section ────────────────────────────────────────────
function AddonSection({ productId, groups, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', is_required: false, min_qty: 0, max_qty: 5, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const handleAddGroup = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/variants/${productId}/addon-groups`, groupForm);
      setAddGroupOpen(false);
      setGroupForm({ name: '', is_required: false, min_qty: 0, max_qty: 5, sort_order: 0 });
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Tag className="w-4 h-4 text-orange-500" />Addon / Topping
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tambahan opsional dengan harga sendiri (topping, ekstra, sirup)</p>
        </div>
        <Button size="sm" onClick={() => setAddGroupOpen(true)} className="gap-1 bg-orange-500 hover:bg-orange-600">
          <Plus className="w-3.5 h-3.5" />Tambah Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Belum ada addon. Tambah group addon untuk mulai.
          </CardContent>
        </Card>
      ) : (
        groups.map(group => <AddonGroupCard key={group.id} group={group} ingredients={ingredients} units={units} onRefresh={onRefresh} />)
      )}

      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Group Addon</DialogTitle></DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Group *</label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} required placeholder="Topping, Ekstra, Sirup, dll" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Total Addon</label>
                <Input type="number" min={0} value={groupForm.min_qty} onChange={e => setGroupForm(f => ({ ...f, min_qty: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Total Addon</label>
                <Input type="number" min={1} value={groupForm.max_qty} onChange={e => setGroupForm(f => ({ ...f, max_qty: parseInt(e.target.value) || 5 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ag_req" checked={groupForm.is_required} onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
              <label htmlFor="ag_req" className="text-sm">Wajib (min 1 addon)</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddGroupOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Tambah</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddonGroupCard({ group, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [addonForm, setAddonForm] = useState({ name: '', price: 0, max_qty: 3, sort_order: 0 });
  const [groupForm, setGroupForm] = useState({ name: group.name, is_required: !!group.is_required, min_qty: group.min_qty, max_qty: group.max_qty });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGroupForm({ name: group.name, is_required: !!group.is_required, min_qty: group.min_qty, max_qty: group.max_qty });
  }, [group.name, group.is_required, group.min_qty, group.max_qty]);

  const handleEditGroup = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/variants/addon-groups/${group.id}`, groupForm);
      setEditGroupOpen(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleAddAddon = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/variants/addon-groups/${group.id}/addons`, addonForm);
      setAddOpen(false);
      setAddonForm({ name: '', price: 0, max_qty: 3, sort_order: 0 });
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {group.name}
            <Badge variant={group.is_required ? 'destructive' : 'secondary'} className="text-[10px]">
              {group.is_required ? 'Wajib' : 'Opsional'}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-normal">max {group.max_qty} item</span>
          </button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditGroupOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={async () => { if (confirm(`Hapus group "${group.name}"?`)) { await api.delete(`/variants/addon-groups/${group.id}`); onRefresh(); } }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-3">
          <div className="space-y-1.5">
            {(group.addons || []).length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Belum ada addon di group ini.</p>
            )}
            {(group.addons || []).map(addon => (
              <div key={addon.id} className={cn('flex items-center justify-between p-2 rounded-lg border text-sm', !addon.is_active ? 'opacity-50' : '')}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{addon.name}</span>
                    <span className="text-[10px] text-muted-foreground">max {addon.max_qty}x per item</span>
                  </div>
                  {addon.ingredient_id && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      🧪 {addon.ingredient_qty}{addon.ingredient_unit || ''} {ingredients.find(ig => ig.id === addon.ingredient_id)?.name || `#${addon.ingredient_id}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-green-600">+Rp {Number(addon.price).toLocaleString('id')}</span>
                  <EditAddonButton addon={addon} ingredients={ingredients} units={units} onRefresh={onRefresh} />
                  <button onClick={async () => { await api.delete(`/variants/addons/${addon.id}`); onRefresh(); }}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Addon — {group.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddAddon} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Addon *</label>
              <Input value={addonForm.name} onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))} required placeholder="Whipped Cream, Extra Shot, dll" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga (Rp)</label>
                <Input type="number" min={0} value={addonForm.price} onChange={e => setAddonForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Qty per Item</label>
                <Input type="number" min={1} value={addonForm.max_qty} onChange={e => setAddonForm(f => ({ ...f, max_qty: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Tambah Addon</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Group — {group.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleEditGroup} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Group</label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Total Addon</label>
                <Input type="number" min={0} value={groupForm.min_qty} onChange={e => setGroupForm(f => ({ ...f, min_qty: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Total Addon</label>
                <Input type="number" min={1} value={groupForm.max_qty} onChange={e => setGroupForm(f => ({ ...f, max_qty: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ag_req_e" checked={groupForm.is_required} onChange={e => setGroupForm(f => ({ ...f, is_required: e.target.checked }))} />
              <label htmlFor="ag_req_e" className="text-sm">Wajib (min 1 addon)</label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditGroupOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditAddonButton({ addon, ingredients, units, onRefresh }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: addon.name,
    price: addon.price,
    max_qty: addon.max_qty,
    is_active: !!addon.is_active,
    ingredient_id: addon.ingredient_id ? String(addon.ingredient_id) : '',
    ingredient_qty: addon.ingredient_qty || '',
    ingredient_unit: addon.ingredient_unit || '',
  });
  const [ingExpanded, setIngExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/variants/addons/${addon.id}`, {
        ...form,
        ingredient_id: form.ingredient_id ? parseInt(form.ingredient_id) : null,
        ingredient_qty: form.ingredient_qty !== '' ? parseFloat(form.ingredient_qty) : null,
        ingredient_unit: form.ingredient_unit || null,
      });
      setOpen(false); onRefresh();
    }
    catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary">
        <Pencil className="w-3 h-3" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Addon: {addon.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Nama</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Harga (Rp)</label>
                <Input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Max Qty</label>
                <Input type="number" min={1} value={form.max_qty} onChange={e => setForm(f => ({ ...f, max_qty: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label className="text-sm">Aktif</label>
            </div>
            {/* Collapsible ingredient link */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setIngExpanded(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span>Hubungkan ke Bahan (untuk HPP)</span>
                {ingExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {ingExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t pt-3">
                  <p className="text-[10px] text-muted-foreground">Bahan Terkait (untuk HPP)</p>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Bahan</label>
                    <select
                      value={form.ingredient_id}
                      onChange={e => setForm(f => ({ ...f, ingredient_id: e.target.value }))}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">— Tidak terhubung —</option>
                      {(ingredients || []).filter(ig => ig.is_active).map(ig => (
                        <option key={ig.id} value={ig.id}>{ig.name} ({ig.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty Bahan</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={form.ingredient_qty}
                        onChange={e => setForm(f => ({ ...f, ingredient_qty: e.target.value }))}
                        className="h-8 text-xs"
                        placeholder="mis. 50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan</label>
                      <select
                        value={form.ingredient_unit}
                        onChange={e => setForm(f => ({ ...f, ingredient_unit: e.target.value }))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— pilih satuan —</option>
                        {(units || []).map(u => (
                          <option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
