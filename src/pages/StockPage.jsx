import { useState, useCallback, useRef, useEffect } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  Package, TrendingDown, AlertTriangle, Warehouse, Plus,
  Loader2, RefreshCw, ArrowUpCircle, ArrowDownCircle,
  ClipboardList, Truck, BarChart3, Eye, CheckCircle2, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ServerSelect } from '../components/ui/server-select';

// ─── Branch scope hook + selector ────────────────────────────
// Admin: shows a select to pick branch (default 'all')
// Non-admin: locked to own branch_id, no UI shown
function useBranchScope() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [branchId, setBranchId] = useState(isAdmin ? 'all' : String(user?.branch_id || ''));
  useEffect(() => {
    if (!isAdmin && user?.branch_id) setBranchId(String(user.branch_id));
  }, [isAdmin, user?.branch_id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { branchId, setBranchId, isAdmin };
}

function BranchSelect({ branchId, onChange }) {
  const { data } = useFetch('/branches');
  const branches = data?.branches || [];
  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Select value={branchId} onValueChange={onChange}>
        <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Cabang</SelectItem>
          {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' }); }
function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }); }

const MOVE_TYPE = {
  in: { label: 'Masuk', color: 'text-green-600', bg: 'bg-green-100', icon: ArrowUpCircle },
  out: { label: 'Keluar', color: 'text-red-600', bg: 'bg-red-100', icon: ArrowDownCircle },
  adjustment: { label: 'Penyesuaian', color: 'text-blue-600', bg: 'bg-blue-100', icon: BarChart3 },
  opname: { label: 'Opname', color: 'text-violet-600', bg: 'bg-violet-100', icon: ClipboardList },
  waste: { label: 'Waste', color: 'text-orange-600', bg: 'bg-orange-100', icon: TrendingDown },
  return: { label: 'Retur', color: 'text-cyan-600', bg: 'bg-cyan-100', icon: RefreshCw },
};

export default function StockPage() {
  const [activeTab, setActiveTab] = useState('summary');
  // Track which tabs have been visited — only render on first visit
  const [visited, setVisited] = useState(new Set(['summary']));

  const handleTabChange = (val) => {
    setActiveTab(val);
    setVisited(prev => new Set([...prev, val]));
  };

  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="kartu">Kartu Stok</TabsTrigger>
          <TabsTrigger value="po">Purchase Order</TabsTrigger>
          <TabsTrigger value="opname">Stock Opname</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier</TabsTrigger>
          <TabsTrigger value="adjustment">Penyesuaian</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          {visited.has('summary') && <SummaryTab active={activeTab === 'summary'} />}
        </TabsContent>
        <TabsContent value="kartu" className="mt-4">
          {visited.has('kartu') && <KartuStokTab />}
        </TabsContent>
        <TabsContent value="po" className="mt-4">
          {visited.has('po') && <POTab active={activeTab === 'po'} />}
        </TabsContent>
        <TabsContent value="opname" className="mt-4">
          {visited.has('opname') && <OpnameTab active={activeTab === 'opname'} />}
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          {visited.has('suppliers') && <SuppliersTab />}
        </TabsContent>
        <TabsContent value="adjustment" className="mt-4">
          {visited.has('adjustment') && <AdjustmentTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── SUMMARY TAB ────────────────────────────────────────────
function SummaryTab({ active }) {
  const { branchId, setBranchId, isAdmin } = useBranchScope();
  const qs = branchId && branchId !== 'all' ? `?branch_id=${branchId}` : '';
  const { data, loading } = useFetch(`/stock/summary${qs}`);
  const { summary = {}, low_stock = [], recent_movements = [] } = data || {};

  return (
    <div className="space-y-5">
      {isAdmin && (
        <div className="flex items-center gap-3">
          <BranchSelect branchId={branchId} onChange={setBranchId} />
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({length: 4}).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={Package} label="Total Produk Aktif" value={summary.total_products || 0} color="bg-primary" />
            <StatCard icon={AlertTriangle} label="Stok Menipis" value={summary.low_stock_count || 0} color="bg-amber-500"
              sub="Di bawah minimum" alert={summary.low_stock_count > 0} />
            <StatCard icon={TrendingDown} label="Stok Habis" value={summary.out_of_stock || 0} color="bg-red-500"
              alert={summary.out_of_stock > 0} />
            <StatCard icon={Warehouse} label="Nilai Stok" value={formatRp(summary.total_stock_value)} color="bg-emerald-600" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Low stock alert */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Stok Menipis / Habis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({length:4}).map((_,i) => <SkeletonRow key={i} />)}</div>
            ) : low_stock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Semua stok aman ✓</p>
            ) : (
              <div className="space-y-2">
                {low_stock.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{p.sku || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.stock} {p.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">min: {p.min_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent movements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mutasi Stok Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent_movements.slice(0, 8).map(m => {
                const mt = MOVE_TYPE[m.movement_type] || MOVE_TYPE.adjustment;
                return (
                  <div key={m.id} className="flex items-center gap-3 py-1 border-b last:border-0">
                    <div className={`w-7 h-7 rounded-lg ${mt.bg} flex items-center justify-center shrink-0`}>
                      <mt.icon className={`w-3.5 h-3.5 ${mt.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.product_name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(m.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${m.qty_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                      </p>
                      <p className="text-[10px] text-muted-foreground">sisa: {m.qty_after}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── KARTU STOK TAB ──────────────────────────────────────────
function KartuStokTab() {
  const { branchId, setBranchId, isAdmin } = useBranchScope();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');

  const branchQs = branchId && branchId !== 'all' ? `?branch_id=${branchId}` : '';
  const { data: cardData, loading } = useFetch(
    selectedProduct ? `/stock/card/${selectedProduct}${branchQs}` : null
  );

  const product = cardData?.product;
  const cards = cardData?.cards || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {isAdmin && (
          <BranchSelect branchId={branchId} onChange={(v) => { setBranchId(v); setSelectedProduct(null); setSelectedProductName(''); }} />
        )}
        <ServerSelect
          endpoint="/products"
          value={selectedProduct || ''}
          displayValue={selectedProductName}
          onChange={(item) => { setSelectedProduct(String(item.id)); setSelectedProductName(item.name); }}
          onClear={() => { setSelectedProduct(null); setSelectedProductName(''); }}
          placeholder="Cari dan pilih produk..."
          extraParams={`&status=active${branchId && branchId !== 'all' ? `&branch_id=${branchId}` : ''}`}
          renderOption={(p) => (
            <div className="flex justify-between items-center gap-2">
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{p.sku || ''} · stok: {p.stock}</span>
            </div>
          )}
          className="w-72"
        />
      </div>

      {!selectedProduct && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Pilih produk untuk melihat kartu stok</p>
        </div>
      )}

      {selectedProduct && product && (
        <>
          {/* Product info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Produk</p>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{product.sku || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stok Saat Ini</p>
                  <p className={`text-2xl font-bold ${product.stock <= (product.min_stock || 0) && product.min_stock > 0 ? 'text-amber-600' : 'text-primary'}`}>
                    {product.stock} <span className="text-sm font-normal text-muted-foreground">{product.unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stok Minimum</p>
                  <p className="text-xl font-bold">{product.min_stock || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nilai Stok</p>
                  <p className="text-sm font-semibold">{formatRp(product.stock * (product.cost_price || 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kartu stok table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Riwayat Mutasi Stok</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? <SkeletonTable cols={8} rows={6} /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Referensi</TableHead>
                      <TableHead className="text-right">Masuk</TableHead>
                      <TableHead className="text-right">Keluar</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Ket.</TableHead>
                      <TableHead>Oleh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada mutasi stok</TableCell></TableRow>
                    ) : cards.map(c => {
                      const mt = MOVE_TYPE[c.movement_type] || MOVE_TYPE.adjustment;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs">{formatDateTime(c.created_at)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${mt.bg} ${mt.color}`}>
                              {mt.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.reference_type ? `${c.reference_type} #${c.reference_id}` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {c.qty_change > 0 ? `+${c.qty_change}` : '—'}
                          </TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {c.qty_change < 0 ? Math.abs(c.qty_change) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold">{c.qty_after}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{c.note || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.created_by_name || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── PURCHASE ORDER TAB ──────────────────────────────────────
function POTab({ active }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const qs = `?page=${page}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`;
  const { data, loading, refetch } = useFetch(`/stock/po${qs}`);
  const { data: suppData } = useFetch('/stock/suppliers');
  const { data: ingredientsData } = useFetch('/ingredients');

  const pos = data?.purchase_orders || [];
  const pagination = data?.pagination || {};
  const suppliers = suppData?.suppliers || [];
  const ingredients = ingredientsData?.ingredients || [];

  // Stats dari data yang sudah load
  const totalPO = pagination.total || pos.length;
  const totalValue = pos.reduce((s, p) => s + Number(p.total || 0), 0);
  const draftCount = pos.filter(p => p.status === 'draft').length;
  const pendingCount = pos.filter(p => p.status === 'ordered' || p.status === 'partial').length;

  const PO_STATUS = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
    ordered: { label: 'Dipesan', cls: 'bg-blue-100 text-blue-700' },
    partial: { label: 'Sebagian', cls: 'bg-amber-100 text-amber-700' },
    received: { label: 'Diterima', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Batal', cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-4">
      {/* PO summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? Array.from({length:4}).map((_,i) => <SkeletonCard key={i} />) : (
          <>
            <StatCard icon={ClipboardList} label="Total PO" value={totalPO} color="bg-primary" />
            <StatCard icon={Truck} label="Menunggu Terima" value={pendingCount} color="bg-amber-500" alert={pendingCount > 0} />
            <StatCard icon={BarChart3} label="Draft" value={draftCount} color="bg-slate-500" />
            <StatCard icon={Warehouse} label="Nilai PO (halaman)" value={formatRp(totalValue)} color="bg-emerald-600" />
          </>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(PO_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />Buat PO
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <SkeletonTable cols={7} rows={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Tgl Pesan</TableHead>
                  <TableHead>Tgl Exp.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Belum ada PO</TableCell></TableRow>
                ) : pos.map(po => {
                  const st = PO_STATUS[po.status] || PO_STATUS.draft;
                  return (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-semibold">{po.po_number}</TableCell>
                      <TableCell className="text-sm">{po.supplier_name || '—'}</TableCell>
                      <TableCell className="text-sm">{formatDate(po.order_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(po.expected_date)}</TableCell>
                      <TableCell className="font-semibold">{formatRp(po.total)}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          {po.status === 'draft' && (
                            <Button size="sm" variant="outline" className="text-xs h-7"
                              onClick={async () => { await api.put(`/stock/po/${po.id}/status`, { status: 'ordered' }); refetch(); }}>
                              Kirim
                            </Button>
                          )}
                          {(po.status === 'ordered' || po.status === 'partial') && (
                            <Button size="sm" className="text-xs h-7 gap-1"
                              onClick={() => { setSelectedPO(po); setReceiveOpen(true); }}>
                              <Truck className="w-3 h-3" />Terima
                            </Button>
                          )}
                          {po.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                              onClick={async () => { if(confirm('Batalkan PO?')) { await api.put(`/stock/po/${po.id}/status`, { status: 'cancelled' }); refetch(); }}}>
                              Batal
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PO Dialog — server-side search, no pre-loaded lists */}
      <CreatePODialog open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); refetch(); }} />

      {/* Receive PO Dialog */}
      {selectedPO && (
        <ReceivePODialog open={receiveOpen} po={selectedPO} onClose={() => { setReceiveOpen(false); setSelectedPO(null); }} onDone={() => { setReceiveOpen(false); setSelectedPO(null); refetch(); }} />
      )}
    </div>
  );
}

// ── Dialog 1: Header PO (supplier, tanggal) ──────────────────
function CreatePODialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({
    supplier_id: '', supplier_name: '',
    order_date: new Date().toISOString().slice(0,10),
    expected_date: '', notes: '',
  });
  const [step2Open, setStep2Open] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);

  const [supplierQ, setSupplierQ] = useState('');
  const debouncedSupQ = useDebounce(supplierQ, 300);
  const { data: suppData, refetch: refetchSuppliers } = useFetch(
    debouncedSupQ.length >= 1
      ? `/stock/suppliers?q=${encodeURIComponent(debouncedSupQ)}&limit=10`
      : '/stock/suppliers?limit=10'
  );
  const suppliers = suppData?.suppliers || [];
  const [showSupDD, setShowSupDD] = useState(false);

  const reset = () => {
    setForm({ supplier_id: '', supplier_name: '', order_date: new Date().toISOString().slice(0,10), expected_date: '', notes: '' });
    setSupplierQ('');
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Buat Purchase Order — Header
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Langkah 1 dari 2: Info PO</p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Supplier search */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Supplier</label>
                <button type="button" onClick={() => setAddSupplierOpen(true)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  <Plus className="w-3 h-3" />Tambah Baru
                </button>
              </div>
              <div className="relative">
                <Input
                  placeholder={form.supplier_id ? form.supplier_name : 'Cari supplier...'}
                  value={form.supplier_id ? form.supplier_name : supplierQ}
                  onChange={e => {
                    if (form.supplier_id) setForm(f => ({ ...f, supplier_id: '', supplier_name: '' }));
                    setSupplierQ(e.target.value);
                    setShowSupDD(true);
                  }}
                  onFocus={() => setShowSupDD(true)}
                  className={`h-9 text-sm ${form.supplier_id ? 'border-primary bg-primary/5 font-medium' : ''}`}
                />
                {form.supplier_id && (
                  <button type="button" onClick={() => { setForm(f => ({ ...f, supplier_id: '', supplier_name: '' })); setSupplierQ(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">×</button>
                )}
                {showSupDD && !form.supplier_id && (
                  <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-xl overflow-hidden">
                    <div className="p-1 max-h-48 overflow-y-auto">
                      <button type="button" className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary rounded-lg"
                        onClick={() => { setForm(f => ({ ...f, supplier_id: '0', supplier_name: '— Tanpa Supplier' })); setShowSupDD(false); }}>
                        — Tanpa Supplier
                      </button>
                      {suppliers.map(s => (
                        <button key={s.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary rounded-lg flex justify-between items-center gap-2"
                          onClick={() => { setForm(f => ({ ...f, supplier_id: String(s.id), supplier_name: s.name })); setShowSupDD(false); setSupplierQ(''); }}>
                          <span className="font-medium">{s.name}</span>
                          {s.phone && <span className="text-xs text-muted-foreground shrink-0">{s.phone}</span>}
                        </button>
                      ))}
                      {suppliers.length === 0 && debouncedSupQ && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          Tidak ditemukan.{' '}
                          <button type="button" className="text-primary hover:underline"
                            onClick={() => { setAddSupplierOpen(true); setShowSupDD(false); }}>Tambah baru?</button>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tgl Pesan *</label>
                <Input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimasi Tiba</label>
                <Input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsional" />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Batal</Button>
              <Button onClick={() => { setShowSupDD(false); setStep2Open(true); }} disabled={!form.order_date}>
                Lanjut → Pilih Bahan Baku
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Items dialog — terpisah, tidak tertutup scroll */}
      <POItemsDialog
        open={step2Open}
        form={form}
        onBack={() => setStep2Open(false)}
        onDone={() => { setStep2Open(false); reset(); onClose(); onDone(); }}
      />

      <AddSupplierDialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
        onDone={(s) => { refetchSuppliers(); setForm(f => ({ ...f, supplier_id: String(s.id), supplier_name: s.name })); setAddSupplierOpen(false); }}
      />
    </>
  );
}

// ── Dialog 2: Item Bahan Baku ─────────────────────────────────
function POItemsDialog({ open, form, onBack, onDone }) {
  const [items, setItems] = useState([{ ingredient_id: '', ingredient_name: '', unit: '', qty_ordered: 1, unit_cost: '' }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(i => [...i, { ingredient_id: '', ingredient_name: '', unit: '', qty_ordered: 1, unit_cost: '' }]);
  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx));
  const updateItem = (idx, field, val) => setItems(i => i.map((it, j) => j === idx ? { ...it, [field]: val } : it));

  const total = items.reduce((s, i) => s + (parseFloat(i.qty_ordered || 0) * parseFloat(i.unit_cost || 0)), 0);

  const handleSave = async () => {
    if (items.some(i => !i.ingredient_id)) { alert('Semua baris harus memiliki bahan baku'); return; }
    if (items.some(i => !i.qty_ordered || parseFloat(i.qty_ordered) <= 0)) { alert('Qty harus lebih dari 0'); return; }
    setSaving(true);
    try {
      await api.post('/stock/po', {
        supplier_id: form.supplier_id && form.supplier_id !== '0' ? parseInt(form.supplier_id) : null,
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        notes: form.notes || null,
        items: items.map(i => ({
          ingredient_id: parseInt(i.ingredient_id),
          qty_ordered: parseInt(i.qty_ordered),
          unit_cost: parseFloat(i.unit_cost || 0),
        })),
      });
      setItems([{ ingredient_id: '', ingredient_name: '', unit: '', qty_ordered: 1, unit_cost: '' }]);
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal membuat PO'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onBack(); }}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Buat PO — Item Bahan Baku
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Langkah 2 dari 2 · Supplier: <strong>{form.supplier_name || '—'}</strong> · {form.order_date}
          </p>
        </DialogHeader>

        {/* Item list — scrollable, dropdown tidak kena clip */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 mb-2 px-1">
            <div className="col-span-5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Bahan Baku</div>
            <div className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center">Qty</div>
            <div className="col-span-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Harga/Unit</div>
            <div className="col-span-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-right">Subtotal</div>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const lineTotal = parseFloat(item.qty_ordered || 0) * parseFloat(item.unit_cost || 0);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-secondary/20 rounded-xl p-3">
                  {/* Ingredient search — fullwidth row, no overflow clip */}
                  <div className="col-span-5">
                    <IngredientSearchInput
                      selectedName={item.ingredient_id ? `${item.ingredient_name}` : ''}
                      selectedUnit={item.unit}
                      onSelect={ing => {
                        updateItem(idx, 'ingredient_id', String(ing.id));
                        updateItem(idx, 'ingredient_name', ing.name);
                        updateItem(idx, 'unit', ing.unit);
                        updateItem(idx, 'unit_cost', parseFloat(ing.unit_cost));
                      }}
                      onClear={() => { updateItem(idx, 'ingredient_id', ''); updateItem(idx, 'ingredient_name', ''); updateItem(idx, 'unit', ''); updateItem(idx, 'unit_cost', ''); }}
                    />
                  </div>

                  {/* Qty */}
                  <div className="col-span-2">
                    <div className="relative">
                      <Input type="number" min={1} value={item.qty_ordered}
                        onChange={e => updateItem(idx, 'qty_ordered', e.target.value)}
                        className="h-9 text-sm text-center pr-7" placeholder="1" />
                      {item.unit && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit cost */}
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">Rp</span>
                      <Input type="number" min={0} step="1"
                        value={item.unit_cost === '' ? '' : Number(item.unit_cost)}
                        onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                        className="h-9 text-sm pl-8" placeholder="0" />
                    </div>
                  </div>

                  {/* Subtotal + remove */}
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <p className="text-sm font-bold text-primary truncate">
                      {lineTotal > 0 ? formatRp(lineTotal) : '—'}
                    </p>
                    <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 disabled:opacity-30 shrink-0 transition-colors">
                      <span className="text-base leading-none">×</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-3 gap-1.5 w-full text-xs">
            <Plus className="w-3.5 h-3.5" />Tambah Baris Bahan
          </Button>
        </div>

        {/* Footer — total + actions */}
        <div className="px-6 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{items.filter(i => i.ingredient_id).length} bahan · Total PO</p>
            <p className="text-xl font-bold text-primary">{formatRp(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>← Kembali</Button>
            <Button onClick={handleSave} disabled={saving || items.every(i => !i.ingredient_id)}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Buat PO
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Server-side ingredient search — uses fixed-position dropdown to escape overflow:hidden parents
function IngredientSearchInput({ selectedName, selectedUnit, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const debouncedQ = useDebounce(q, 300);

  const { data } = useFetch(
    debouncedQ.length >= 1
      ? `/ingredients?q=${encodeURIComponent(debouncedQ)}&limit=10`
      : show ? '/ingredients?limit=10' : null
  );
  const results = data?.ingredients || [];

  const openDropdown = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setRect(r);
    }
    setShow(true);
  };

  // Already selected — show chip
  if (selectedName && !q) {
    return (
      <div className="flex items-center gap-1.5 h-9 px-3 bg-primary/5 border border-primary/30 rounded-lg">
        <span className="flex-1 text-sm font-medium truncate">{selectedName}</span>
        {selectedUnit && <span className="text-xs text-muted-foreground shrink-0 font-mono">{selectedUnit}</span>}
        <button type="button" onClick={() => { onClear(); setQ(''); }}
          className="text-muted-foreground hover:text-destructive shrink-0 text-base leading-none">×</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); openDropdown(); }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setShow(false), 180)}
        placeholder="Ketik nama bahan..."
        className="h-9 text-sm"
        autoComplete="off"
      />
      {show && rect && (
        <div
          className="bg-card border rounded-xl shadow-2xl z-[9999]"
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 280),
          }}
        >
          <div className="p-1.5 max-h-52 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground text-center">
                {debouncedQ ? `"${debouncedQ}" tidak ditemukan` : 'Ketik untuk mencari bahan baku...'}
              </p>
            ) : results.map(ing => (
              <button key={ing.id} type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-secondary rounded-lg text-sm flex items-center justify-between gap-3 transition-colors"
                onMouseDown={e => { e.preventDefault(); onSelect(ing); setQ(''); setShow(false); }}>
                <div className="min-w-0">
                  <p className="font-medium truncate">{ing.name}</p>
                  {ing.code && <p className="text-[10px] text-muted-foreground font-mono">{ing.code}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-primary">{formatRp(ing.unit_cost)}/{ing.unit}</p>
                  <p className="text-[10px] text-muted-foreground">stok: {ing.stock_qty} {ing.unit}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Add Supplier mini dialog (from PO)
function AddSupplierDialog({ open, onClose, onDone }) {
  const [form, setForm] = useState({ name: '', code: '', contact_person: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.post('/stock/suppliers', form);
      onDone(res.data.supplier);
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Tambah Supplier Baru</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kode</label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUP-001" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telepon</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kontak</label>
              <Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Simpan & Pilih
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceivePODialog({ open, po, onClose, onDone }) {
  const { data, loading } = useFetch(po ? `/stock/po/${po.id}` : null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // Sync items from PO data
  const poItems = data?.purchase_order?.items || [];

  const handleReceive = async () => {
    setSaving(true);
    try {
      await api.post(`/stock/po/${po.id}/receive`, {
        received_date: new Date().toISOString().slice(0, 10),
        items: items.map(i => ({ po_item_id: i.id, qty_received: parseInt(i.qty_receive || 0) })).filter(i => i.qty_received > 0)
      });
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Terima Barang — {po?.po_number}</DialogTitle></DialogHeader>
        {loading ? <Spinner /> : (
          <div className="space-y-4">
            <div className="space-y-2">
              {poItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Dipesan: {item.qty_ordered} | Sudah diterima: {item.qty_received}</p>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min={0}
                      max={item.qty_ordered - item.qty_received}
                      placeholder="Terima"
                      className="h-8 text-sm"
                      value={items[idx]?.qty_receive || ''}
                      onChange={e => {
                        const upd = [...(items.length ? items : poItems.map(i => ({ ...i, qty_receive: 0 })))];
                        upd[idx] = { ...item, qty_receive: e.target.value };
                        setItems(upd);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleReceive} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                <Truck className="w-4 h-4 mr-1" />Konfirmasi Terima
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── STOCK OPNAME TAB ────────────────────────────────────────
function OpnameTab({ active }) {
  const { branchId, setBranchId, isAdmin } = useBranchScope();
  const { data, loading, refetch } = useFetch('/stock/opname');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [saving, setSaving] = useState(false);

  const opnames = data?.opnames || [];
  const OPN_STATUS = {
    draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'Berjalan', cls: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Batal', cls: 'bg-red-100 text-red-700' },
  };

  const totalOpname = opnames.length;
  const completedCount = opnames.filter(o => o.status === 'completed').length;
  const activeCount = opnames.filter(o => o.status === 'draft' || o.status === 'in_progress').length;

  const createOpname = async () => {
    setSaving(true);
    try {
      const payload = { opname_date: new Date().toISOString().slice(0, 10) };
      if (branchId && branchId !== 'all') payload.branch_id = parseInt(branchId);
      const res = await api.post('/stock/opname', payload);
      refetch();
      setDetailId(res.data.opname.id);
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const approve = async (id) => {
    if (!confirm('Finalisasi opname? Stok akan disesuaikan dengan hasil hitung.')) return;
    try {
      const res = await api.post(`/stock/opname/${id}/approve`);
      alert(`Opname selesai. ${res.data.adjusted_items} item disesuaikan.`);
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
  };

  return (
    <div className="space-y-4">
      {/* Opname summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? Array.from({length:3}).map((_,i) => <SkeletonCard key={i} />) : (
          <>
            <StatCard icon={ClipboardList} label="Total Opname" value={totalOpname} color="bg-primary" />
            <StatCard icon={BarChart3} label="Sedang Berjalan" value={activeCount} color="bg-blue-500" alert={activeCount > 0} />
            <StatCard icon={CheckCircle2} label="Selesai" value={completedCount} color="bg-emerald-600" />
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {isAdmin && <BranchSelect branchId={branchId} onChange={setBranchId} />}
        <Button onClick={createOpname} disabled={saving} className="gap-1.5 ml-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Buat Opname Baru
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <SkeletonTable cols={5} rows={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Opname</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opnames.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Belum ada opname</TableCell></TableRow>
                ) : opnames.map(o => {
                  const st = OPN_STATUS[o.status] || OPN_STATUS.draft;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs font-semibold">{o.opname_number}</TableCell>
                      <TableCell className="text-sm">{formatDate(o.opname_date)}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.created_by_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setDetailId(o.id)}>
                            <Eye className="w-3 h-3" />Detail
                          </Button>
                          {(o.status === 'draft' || o.status === 'in_progress') && (
                            <Button size="sm" className="text-xs h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={() => approve(o.id)}>
                              <CheckCircle2 className="w-3 h-3" />Finalisasi
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {detailId && <OpnameDetailDialog id={detailId} onClose={() => { setDetailId(null); refetch(); }} />}
    </div>
  );
}

function OpnameDetailDialog({ id, onClose }) {
  const { data, loading, refetch } = useFetch(`/stock/opname/${id}`);
  const [editItems, setEditItems] = useState({});
  const [saving, setSaving] = useState(false);

  const opname = data?.opname;
  const items = opname?.items || [];

  const handleSave = async () => {
    const changed = Object.entries(editItems).map(([item_id, qty_actual]) => ({ item_id: parseInt(item_id), qty_actual: parseInt(qty_actual) }));
    if (!changed.length) return;
    setSaving(true);
    try {
      await api.put(`/stock/opname/${id}/items`, { items: changed });
      refetch();
      setEditItems({});
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail Opname — {opname?.opname_number}</DialogTitle>
        </DialogHeader>
        {loading ? <Spinner /> : (
          <div className="space-y-3">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stok Sistem</TableHead>
                    <TableHead className="text-right">Stok Aktual</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const actualVal = editItems[item.id] !== undefined ? editItems[item.id] : item.qty_actual;
                    const diff = parseInt(actualVal || 0) - item.qty_system;
                    return (
                      <TableRow key={item.id} className={diff !== 0 ? 'bg-amber-50' : ''}>
                        <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || '—'}</TableCell>
                        <TableCell className="text-right">{item.qty_system} {item.unit}</TableCell>
                        <TableCell className="text-right">
                          {opname?.status !== 'completed' ? (
                            <Input
                              type="number"
                              min={0}
                              value={actualVal}
                              onChange={e => setEditItems(ev => ({ ...ev, [item.id]: e.target.value }))}
                              className="h-7 w-24 text-sm text-right ml-auto"
                            />
                          ) : <span>{item.qty_actual}</span>}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              {opname?.status !== 'completed' && (
                <Button onClick={handleSave} disabled={saving || !Object.keys(editItems).length}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Simpan Hitungan
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── SUPPLIERS TAB ───────────────────────────────────────────
function SuppliersTab() {
  const { data, loading, refetch } = useFetch('/stock/suppliers');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const suppliers = data?.suppliers || [];
  const activeCount = suppliers.filter(s => s.is_active).length;
  const inactiveCount = suppliers.length - activeCount;

  const openCreate = () => { setForm({ name: '', code: '', contact_person: '', phone: '', email: '', address: '', notes: '' }); setEditId(null); setOpen(true); };
  const openEdit = (s) => { setForm({ name: s.name, code: s.code || '', contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setEditId(s.id); setOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/stock/suppliers/${editId}`, form);
      else await api.post('/stock/suppliers', form);
      setOpen(false); refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Supplier summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {loading ? Array.from({length:3}).map((_,i) => <SkeletonCard key={i} />) : (
          <>
            <StatCard icon={Truck} label="Total Supplier" value={suppliers.length} color="bg-primary" />
            <StatCard icon={CheckCircle2} label="Aktif" value={activeCount} color="bg-emerald-600" />
            <StatCard icon={TrendingDown} label="Nonaktif" value={inactiveCount} color="bg-slate-500" />
          </>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" />Tambah Supplier</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? <SkeletonTable cols={7} rows={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead><TableHead>Kode</TableHead>
                  <TableHead>Kontak</TableHead><TableHead>Telepon</TableHead>
                  <TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Belum ada supplier</TableCell></TableRow>
                ) : suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code || '—'}</TableCell>
                    <TableCell className="text-sm">{s.contact_person || '—'}</TableCell>
                    <TableCell className="text-sm">{s.phone || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email || '—'}</TableCell>
                    <TableCell><Badge variant={s.is_active ? 'success' : 'outline'}>{s.is_active ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(s)}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-xs h-7"
                          onClick={() => api.put(`/stock/suppliers/${s.id}`, { is_active: !s.is_active }).then(refetch)}>
                          {s.is_active ? 'Nonaktif' : 'Aktifkan'}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Tambah'} Supplier</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kode</label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SUP-001" /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Kontak</label><Input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Telepon</label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Alamat</label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ADJUSTMENT TAB ──────────────────────────────────────────
function AdjustmentTab() {
  const [mode, setMode] = useState('product'); // 'product' | 'ingredient'
  return (
    <div className="space-y-4">
      {/* Toggle produk / bahan baku */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 max-w-sm">
        <button onClick={() => setMode('product')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === 'product' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          Produk Jual
        </button>
        <button onClick={() => setMode('ingredient')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === 'ingredient' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          Bahan Baku
        </button>
      </div>
      {mode === 'product' ? <ProductAdjustForm /> : <IngredientAdjustForm />}
    </div>
  );
}

function ProductAdjustForm() {
  const { branchId, setBranchId, isAdmin } = useBranchScope();
  const [form, setForm] = useState({ product_id: '', product_name: '', product_stock: 0, product_unit: 'pcs', qty_change: '', movement_type: 'adjustment', note: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.qty_change) return;
    setSaving(true);
    try {
      const res = await api.post('/stock/adjustment', {
        product_id: parseInt(form.product_id),
        qty_change: parseInt(form.qty_change),
        movement_type: form.movement_type,
        note: form.note,
        ...(branchId && branchId !== 'all' ? { branch_id: parseInt(branchId) } : {}),
      });
      setDone(res.data);
      setForm({ product_id: '', product_name: '', product_stock: 0, product_unit: 'pcs', qty_change: '', movement_type: 'adjustment', note: '' });
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Penyesuaian Stok Manual</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cabang *</label>
                <BranchSelect branchId={branchId} onChange={setBranchId} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Produk *</label>
              <ServerSelect
                endpoint="/products"
                value={form.product_id}
                displayValue={form.product_name || ''}
                onChange={(p) => setForm(f => ({ ...f, product_id: String(p.id), product_name: p.name, product_stock: p.stock, product_unit: p.unit || 'pcs' }))}
                onClear={() => setForm(f => ({ ...f, product_id: '', product_name: '', product_stock: 0 }))}
                placeholder="Cari produk..."
                extraParams="&status=active"
                renderOption={(p) => (
                  <div className="flex justify-between gap-2">
                    <span>{p.name}</span>
                    <span className="text-xs text-muted-foreground">stok: {p.stock} {p.unit || ''}</span>
                  </div>
                )}
              />
            </div>

            {form.product_id && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                Stok saat ini: <strong>{form.product_stock} {form.product_unit}</strong>
                {form.qty_change && <> → <strong className={parseInt(form.qty_change) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {form.product_stock + parseInt(form.qty_change || 0)}
                </strong></>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
                <Select value={form.movement_type} onValueChange={v => setForm(f => ({ ...f, movement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Penyesuaian</SelectItem>
                    <SelectItem value="waste">Waste / Rusak</SelectItem>
                    <SelectItem value="return">Retur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah (+/-) *</label>
                <Input type="number" value={form.qty_change} onChange={e => setForm(f => ({ ...f, qty_change: e.target.value }))} placeholder="-5 atau +10" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keterangan</label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Alasan penyesuaian..." />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simpan Penyesuaian
            </Button>
          </form>
        </CardContent>
      </Card>

      {done && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">Berhasil disesuaikan</p>
                <p className="text-xs">Stok baru: <strong>{done.new_stock}</strong> (perubahan: {done.qty_change > 0 ? '+' : ''}{done.qty_change})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Penyesuaian stok bahan baku dengan multi satuan
function IngredientAdjustForm() {
  const { branchId, setBranchId, isAdmin } = useBranchScope();
  const [ingId, setIngId] = useState('');
  const [ingName, setIngName] = useState('');
  const [selectedIng, setSelectedIng] = useState(null);
  const [inputMode, setInputMode] = useState('base');
  const [inputUnitId, setInputUnitId] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [qtyChange, setQtyChange] = useState('');
  const [movementType, setMovementType] = useState('in');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);

  const { data: compatData } = useFetch(ingId ? `/ingredients/compatible-units/${ingId}` : null);
  const compatibleUnits = compatData?.units || [];
  const hasMultiUnit = compatibleUnits.length > 1;
  const baseUnit = compatibleUnits.find(u => u.id === compatData?.base_unit_id) || compatibleUnits[0];
  const selectedInputUnit = compatibleUnits.find(u => String(u.id) === inputUnitId);

  let previewChange = null;
  if (inputMode === 'convert' && inputQty && selectedInputUnit && baseUnit) {
    const from = parseFloat(selectedInputUnit.conversion_factor || 1);
    const to = parseFloat(baseUnit.conversion_factor || 1);
    previewChange = (parseFloat(inputQty) * from / to).toFixed(3);
  } else if (inputMode === 'base' && qtyChange) {
    previewChange = parseFloat(qtyChange).toFixed(3);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ingId) return;
    if (inputMode === 'base' && !qtyChange) return alert('Masukkan jumlah');
    if (inputMode === 'convert' && (!inputQty || !inputUnitId)) return alert('Pilih satuan dan jumlah');
    setSaving(true);
    try {
      const payload = { movement_type: movementType, note };
      if (branchId && branchId !== 'all') payload.branch_id = parseInt(branchId);
      if (inputMode === 'convert') {
        payload.input_qty = parseFloat(inputQty);
        payload.input_unit_id = parseInt(inputUnitId);
        payload.qty_change = 0;
      } else {
        payload.qty_change = parseFloat(qtyChange);
      }
      const res = await api.post(`/ingredients/${ingId}/adjust`, payload);
      setDone(res.data);
      setIngId(''); setIngName(''); setSelectedIng(null); setQtyChange(''); setInputQty(''); setInputUnitId(''); setNote('');
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Penyesuaian Stok Bahan Baku</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cabang *</label>
                <BranchSelect branchId={branchId} onChange={setBranchId} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bahan Baku *</label>
              <ServerSelect
                endpoint="/ingredients"
                value={ingId}
                displayValue={ingName || ''}
                onChange={(i) => { setIngId(String(i.id)); setIngName(i.name); setSelectedIng(i); }}
                onClear={() => { setIngId(''); setIngName(''); setSelectedIng(null); setInputMode('base'); setInputUnitId(''); }}
                placeholder="Cari bahan baku..."
                renderOption={(i) => (
                  <div className="flex justify-between gap-2">
                    <span>{i.name}</span>
                    <span className="text-xs text-muted-foreground">stok: {i.stock_qty} {i.unit}</span>
                  </div>
                )}
              />
            </div>

            {selectedIng && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm flex justify-between items-center">
                <div>
                  <p className="font-semibold">{selectedIng.name}</p>
                  <p className="text-xs text-muted-foreground">Stok saat ini: <strong>{selectedIng.stock_qty} {selectedIng.unit}</strong></p>
                </div>
                {previewChange && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">→ Setelah</p>
                    <p className={`font-bold ${parseFloat(previewChange) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {parseFloat((parseFloat(selectedIng.stock_qty) + parseFloat(previewChange)).toFixed(3))} {selectedIng.unit}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Multi-unit toggle */}
            {hasMultiUnit && (
              <div className="flex bg-muted rounded-lg p-1 gap-1">
                <button type="button" onClick={() => setInputMode('base')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'base' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                  Input dalam {selectedIng?.unit}
                </button>
                <button type="button" onClick={() => { setInputMode('convert'); setMovementType('in'); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${inputMode === 'convert' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
                  Input satuan lain → konversi
                </button>
              </div>
            )}

            {inputMode === 'base' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
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
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah (+/-) *</label>
                  <Input type="number" step="0.001" value={qtyChange}
                    onChange={e => setQtyChange(e.target.value)} placeholder="-5 atau +100" required />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan *</label>
                    <select value={inputUnitId} onChange={e => setInputUnitId(e.target.value)} required
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="">Pilih satuan...</option>
                      {compatibleUnits.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Jumlah {selectedInputUnit ? `(${selectedInputUnit.symbol})` : ''} *
                    </label>
                    <Input type="number" step="0.001" min="0" value={inputQty}
                      onChange={e => setInputQty(e.target.value)} placeholder="0" />
                  </div>
                </div>
                {previewChange && selectedInputUnit && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-sm flex items-center gap-2">
                    <span className="font-bold text-blue-800">{inputQty} {selectedInputUnit.symbol}</span>
                    <span className="text-blue-400">→</span>
                    <span className="font-bold text-blue-900">{previewChange} {selectedIng?.unit}</span>
                    <span className="text-[10px] text-blue-500 ml-1">
                      (1 {selectedInputUnit.symbol} = {parseFloat(selectedInputUnit.conversion_factor)} {baseUnit?.symbol})
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Keterangan</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan penyesuaian..." />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simpan Penyesuaian Bahan Baku
            </Button>
          </form>
        </CardContent>
      </Card>

      {done && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">Berhasil disesuaikan</p>
                <p className="text-xs">Stok baru: <strong>{done.qty_after}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, alert }) {
  return (
    <Card className={alert ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
}

// Skeleton shimmer animation via Tailwind animate-pulse
function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-5 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-1.5 flex-1">
        <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
        <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
      </div>
      <div className="h-4 bg-muted animate-pulse rounded w-16 ml-4" />
    </div>
  );
}

function SkeletonTable({ cols = 5, rows = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {Array.from({length: cols}).map((_, i) => (
          <div key={i} className="h-3 bg-muted animate-pulse rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({length: rows}).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          {Array.from({length: cols}).map((_, j) => (
            <div key={j}
              className="h-4 bg-muted animate-pulse rounded flex-1"
              style={{ opacity: 1 - i * 0.12 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

