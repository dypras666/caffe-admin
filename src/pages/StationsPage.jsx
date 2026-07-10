import { useState, useMemo } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ChefHat, GlassWater, Monitor, Plus, Pencil, Trash2,
  Loader2, Search, X, CheckCircle, AlertCircle, Printer,
} from 'lucide-react';
import { useToast } from '../components/ui/toast';

// ── constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  dapur:   { label: 'Dapur',   icon: ChefHat,   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  bar:     { label: 'Bar',     icon: GlassWater, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  kasir:   { label: 'Kasir',   icon: Monitor,    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  service: { label: 'Service', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' },
};

const EMPTY_FORM = {
  name: '', code: '', type: 'dapur', display_color: '#f97316',
  auto_print: false, printer_id: '',
};

// ── helpers ────────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.dapur;
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
      cfg.color,
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── station form dialog ────────────────────────────────────────────────────

function StationDialog({ open, onOpenChange, editStation, printers, onSaved }) {
  const toast = useToast();
  const isEdit = !!editStation;
  const [form, setForm] = useState(editStation || EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Reset form when editStation changes
  useMemo(() => {
    setForm(editStation || EMPTY_FORM);
  }, [editStation]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code.toUpperCase(),
        type: form.type,
        display_color: form.display_color,
        auto_print: form.auto_print,
        printer_id: form.printer_id || null,
      };
      if (isEdit) await api.put(`/stations/${editStation.id}`, payload);
      else await api.post('/stations', payload);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan stasiun');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Stasiun' : 'Tambah Stasiun Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Stasiun *</label>
            <Input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="misal: Dapur Utama"
            />
          </div>

          {/* Code */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Kode Unik * <span className="text-muted-foreground font-normal">(huruf kapital, tanpa spasi)</span>
            </label>
            <Input
              required
              value={form.code}
              onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="KITCHEN / BAR / CASHIER"
              className="font-mono"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe *</label>
            <Select value={form.type} onValueChange={v => set('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Warna Tampilan</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.display_color}
                onChange={e => set('display_color', e.target.value)}
                className="h-9 w-16 rounded-lg border border-input cursor-pointer bg-background"
              />
              <Input
                value={form.display_color}
                onChange={e => set('display_color', e.target.value)}
                className="font-mono w-32"
                maxLength={7}
              />
              <div
                className="w-9 h-9 rounded-lg border border-input flex-shrink-0"
                style={{ backgroundColor: form.display_color }}
              />
            </div>
          </div>

          {/* Printer */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Printer (opsional)</label>
            <Select value={form.printer_id || 'none'} onValueChange={v => set('printer_id', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih printer…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tidak ada</SelectItem>
                {(printers || []).map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto print */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_print}
              onChange={e => set('auto_print', e.target.checked)}
            />
            Auto-print tiap order masuk
          </label>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? 'Simpan' : 'Tambah Stasiun'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── tab 1: stations list ───────────────────────────────────────────────────

function StationsList({ stations, printers, onRefetch }) {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStation, setEditStation] = useState(null);

  const openCreate = () => { setEditStation(null); setDialogOpen(true); };
  const openEdit = (s) => {
    setEditStation({
      ...s,
      printer_id: s.printer_id ? String(s.printer_id) : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (station) => {
    if (!confirm(`Hapus stasiun "${station.name}"?`)) return;
    try {
      await api.delete(`/stations/${station.id}`);
      onRefetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus stasiun');
    }
  };

  const printerMap = useMemo(() => {
    const m = {};
    (printers || []).forEach(p => { m[p.id] = p.name; });
    return m;
  }, [printers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{stations.length} stasiun terdaftar</p>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> Tambah Stasiun
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map(station => (
          <Card
            key={station.id}
            className={cn(
              'overflow-hidden transition-all',
              !station.is_active && 'opacity-60',
            )}
          >
            {/* Color bar */}
            <div className="h-1.5 w-full" style={{ backgroundColor: station.display_color || '#e5e7eb' }} />

            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: station.display_color || '#9ca3af' }}
                  >
                    {(() => {
                      const Icon = TYPE_CONFIG[station.type]?.icon || ChefHat;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-semibold">{station.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{station.code}</p>
                  </div>
                </div>
                <TypeBadge type={station.type} />
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {station.printer_id && printerMap[station.printer_id]
                      ? printerMap[station.printer_id]
                      : 'Tidak ada printer'}
                  </span>
                </div>
                {station.auto_print && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Auto-print aktif</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Badge variant={station.is_active ? 'success' : 'outline'} className="mr-auto">
                  {station.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(station)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(station)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {stations.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Belum ada stasiun. Klik "Tambah Stasiun" untuk memulai.</p>
          </div>
        )}
      </div>

      <StationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editStation={editStation}
        printers={printers}
        onSaved={onRefetch}
      />
    </div>
  );
}

// ── tab 2: product routing ─────────────────────────────────────────────────

function ProductRouting({ stations }) {
  const toast = useToast();
  const [selectedStation, setSelectedStation] = useState(null);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(null);

  const { data: stationProductsData, loading: loadingSP, refetch: refetchSP } =
    useFetch(selectedStation ? `/stations/${selectedStation.id}/products` : null);

  const debouncedSearch = useDebounce(search, 300);
  const productQuery = debouncedSearch
    ? `/products?search=${encodeURIComponent(debouncedSearch)}&limit=20`
    : '/products?limit=20';
  const { data: allProductsData, loading: loadingProducts } = useFetch(productQuery);
  const { data: categoriesData } = useFetch('/categories');

  const assignedProducts = stationProductsData?.products || [];
  const allProducts = allProductsData?.products || [];
  const categories = categoriesData?.categories || [];

  const assignedIds = useMemo(() => new Set(assignedProducts.map(p => p.id)), [assignedProducts]);

  const filteredUnassigned = useMemo(() => {
    return allProducts.filter(p => !assignedIds.has(p.id));
  }, [allProducts, assignedIds]);

  const handleAdd = async (product) => {
    setAssigning(true);
    try {
      await api.post(`/stations/${selectedStation.id}/products`, { product_ids: [product.id] });
      refetchSP();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah produk');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (product) => {
    setRemoving(product.id);
    try {
      await api.delete(`/stations/${selectedStation.id}/products/${product.id}`);
      refetchSP();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus produk');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Station selector */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Pilih stasiun untuk dikonfigurasi:</p>
        <div className="flex flex-wrap gap-2">
          {stations.map(s => {
            const isSelected = selectedStation?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStation(s)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                  isSelected
                    ? 'text-white border-transparent shadow-md scale-105'
                    : 'bg-background border-input hover:bg-secondary',
                )}
                style={isSelected ? { backgroundColor: s.display_color } : {}}
              >
                {(() => {
                  const Icon = TYPE_CONFIG[s.type]?.icon || ChefHat;
                  return <Icon className="w-4 h-4" />;
                })()}
                {s.name}
                <span className="font-mono text-xs opacity-70">{s.code}</span>
              </button>
            );
          })}
          {stations.length === 0 && (
            <p className="text-sm text-muted-foreground">Belum ada stasiun.</p>
          )}
        </div>
      </div>

      {selectedStation && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Assigned products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedStation.display_color }}
                />
                Produk di {selectedStation.name}
                <Badge variant="secondary" className="ml-auto">{assignedProducts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingSP ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : assignedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada produk. Tambahkan dari daftar sebelah.
                </p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {assignedProducts.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.category_name && (
                          <p className="text-xs text-muted-foreground">{p.category_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(p)}
                        disabled={removing === p.id}
                        className="ml-2 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {removing === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unassigned products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tambah Produk</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari produk…"
                  className="pl-7 text-sm"
                />
              </div>
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {search ? 'Produk tidak ditemukan.' : 'Semua produk sudah ditambahkan.'}
                </p>
              ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {filteredUnassigned.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.category_name && (
                          <p className="text-xs text-muted-foreground">{p.category_name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAdd(p)}
                        disabled={assigning}
                        className="ml-2 p-1 rounded text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {assigning
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category-level routing info */}
      {categories.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Routing Tingkat Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-blue-700 mb-3">
              Kategori produk dapat dipetakan ke stasiun secara otomatis. Produk tanpa routing eksplisit akan diarahkan ke stasiun default kategorinya.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between px-3 py-2 bg-white/70 rounded-lg border border-blue-100 text-xs"
                >
                  <span className="font-medium text-gray-700">{cat.name}</span>
                  {cat.station_name ? (
                    <span className="text-blue-600 font-medium">{cat.station_name}</span>
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function StationsPage() {
  const { data: stationsData, loading: loadingStations, refetch: refetchStations } =
    useFetch('/stations');
  const { data: printersData } = useFetch('/printers');

  const stations = stationsData?.stations || [];
  const printers = printersData?.printers || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Stasiun Dapur &amp; Bar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kelola stasiun kerja dan routing produk ke masing-masing stasiun.
        </p>
      </div>

      {loadingStations ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="stations">
          <TabsList>
            <TabsTrigger value="stations">Stasiun</TabsTrigger>
            <TabsTrigger value="routing">Routing Produk</TabsTrigger>
          </TabsList>

          <TabsContent value="stations" className="mt-4">
            <StationsList
              stations={stations}
              printers={printers}
              onRefetch={refetchStations}
            />
          </TabsContent>

          <TabsContent value="routing" className="mt-4">
            <ProductRouting stations={stations} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
