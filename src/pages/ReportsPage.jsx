import { useState, useMemo, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useShiftGuard } from '../hooks/useShiftGuard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Loader2, TrendingUp, ShoppingBag, Users, Package, RefreshCw, Clock,
  FileSpreadsheet, FileText,
} from 'lucide-react';
import { exportReportSummaryExcel, exportProductsExcel, exportPDF, exportExcel } from '../lib/export';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const formatRp = (v) => `Rp ${Number(v || 0).toLocaleString('id')}`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

/* ─── shared components ───────────────────────────────────────────────────── */
function BranchCashierFilter({ branchId, cashierId, onBranch, onCashier, showCashier = true }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: branchData } = useFetch(isAdmin ? '/branches' : null);
  const branches = branchData?.branches || [];

  // Kasir: locked to own branch — notify parent once on mount
  useEffect(() => {
    if (!isAdmin && user?.branch_id) {
      onBranch(String(user.branch_id));
    }
  }, [isAdmin, user?.branch_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: usersData } = useFetch(
    showCashier && isAdmin
      ? `/users?role=kasir&status=active${branchId && branchId !== 'all' ? `&branch_id=${branchId}` : ''}`
      : null,
  );
  const cashiers = usersData?.users || [];

  // Kasir: don't show any filter (locked to own branch server-side)
  if (!isAdmin) return null;

  return (
    <>
      <Select value={branchId} onValueChange={(v) => { onBranch(v); if (showCashier) onCashier('all'); }}>
        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Cabang</SelectItem>
          {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {showCashier && (
        <Select value={cashierId} onValueChange={onCashier}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Semua Kasir" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kasir</SelectItem>
            {cashiers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </>
  );
}

function DateRangePicker({ from, to, onFrom, onTo }) {
  const presets = [
    { label: 'Hari ini', from: todayStr, to: todayStr },
    { label: '7 hari', from: () => daysAgo(6), to: todayStr },
    { label: '30 hari', from: () => daysAgo(29), to: todayStr },
    { label: 'Bulan ini', from: startOfMonth, to: todayStr },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button key={p.label} size="sm" variant="outline" className="text-xs h-8"
          onClick={() => { onFrom(p.from()); onTo(p.to()); }}>
          {p.label}
        </Button>
      ))}
      <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="h-8 text-xs w-36" />
      <span className="text-muted-foreground text-xs">—</span>
      <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} className="h-8 text-xs w-36" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'bg-primary' }) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-start gap-4">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value ?? '—'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text = 'Belum ada data' }) {
  return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

function LoadingCenter() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/* ─── Tab 1 — Ringkasan ───────────────────────────────────────────────────── */
function TabRingkasan() {
  const [from, setFrom] = useState(() => daysAgo(6));
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState('all');
  const [cashierId, setCashierId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to });
  if (branchId !== 'all') qs.set('branch_id', branchId);
  if (cashierId !== 'all') qs.set('cashier_id', cashierId);

  const { data, loading, refetch } = useFetch(`/reports/summary?${qs}`);
  const summary = data || {};
  const dailyData = (summary.daily_data || []).map((d) => ({
    ...d,
    label: new Date(d.date || d.day).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
  }));
  const paymentData = (summary.payment_breakdown || []).map((p) => ({
    name: p.method || p.payment_method,
    value: Number(p.total || p.amount || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId={cashierId} onBranch={setBranchId} onCashier={setCashierId} />
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        {!loading && data && (<>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => exportReportSummaryExcel(summary, `${from}_${to}`)}>
            <FileSpreadsheet className="w-3.5 h-3.5" />Excel
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-red-700 border-red-300 hover:bg-red-50"
            onClick={() => exportPDF({ title:'Laporan Penjualan', subtitle:'Café Azzura', period:`${from} s/d ${to}`, filename:'laporan_ringkasan',
              tables:[{ title:'Ringkasan', columns:['Metrik','Nilai'], rows:[
                ['Total Penjualan',`Rp ${Number(summary.total_revenue||0).toLocaleString('id')}`],
                ['Total Transaksi',String(summary.total_orders||0)],
                ['Rata-rata Order',`Rp ${Number(summary.avg_order_value||summary.avg_order||0).toLocaleString('id')}`],
                ['Item Terjual',String(summary.items_sold||0)],
              ]},
              ...(summary.payment_breakdown?.length ? [{title:'Per Metode Bayar', columns:['Metode','Transaksi','Total'],
                rows:(summary.payment_breakdown||[]).map(p=>[p.payment_method,p.cnt||p.count||0,`Rp ${Number(p.total||0).toLocaleString('id')}`])}] : []),
            ]})}>
            <FileText className="w-3.5 h-3.5" />PDF
          </Button>
        </>)}
      </div>

      {loading ? <LoadingCenter /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Total Penjualan" value={formatRp(summary.total_revenue)} color="bg-emerald-600" />
            <StatCard icon={ShoppingBag} label="Total Transaksi" value={Number(summary.total_orders || 0).toLocaleString('id')} color="bg-primary" />
            <StatCard icon={Users} label="Rata-rata Order" value={formatRp(summary.avg_order)} color="bg-violet-600" />
            <StatCard icon={Package} label="Item Terjual" value={Number(summary.items_sold || 0).toLocaleString('id')} color="bg-amber-500" />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Tren Revenue Harian</CardTitle></CardHeader>
              <CardContent>
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyData}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [formatRp(v), 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(20 50% 32%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Metode Pembayaran</CardTitle></CardHeader>
              <CardContent>
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {paymentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatRp(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Tab 2 — Per Produk ──────────────────────────────────────────────────── */
function TabPerProduk() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(todayStr);
  const [sortBy, setSortBy] = useState('qty');
  const [filterCat, setFilterCat] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [cashierId, setCashierId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to, limit: '50' });
  if (branchId !== 'all') qs.set('branch_id', branchId);
  if (cashierId !== 'all') qs.set('cashier_id', cashierId);

  const { data, loading, refetch } = useFetch(`/reports/products?${qs}`);
  const rawProducts = data?.products || [];

  const categories = useMemo(
    () => [...new Set(rawProducts.map((p) => p.category_name || p.category).filter(Boolean))],
    [rawProducts],
  );

  const totalRevenue = rawProducts.reduce((s, p) => s + Number(p.revenue || 0), 0);

  const products = useMemo(() => {
    let list = filterCat === 'all' ? rawProducts : rawProducts.filter((p) => (p.category_name || p.category) === filterCat);
    return [...list].sort((a, b) =>
      sortBy === 'qty'
        ? Number(b.qty_sold || b.total_sold || 0) - Number(a.qty_sold || a.total_sold || 0)
        : Number(b.revenue || 0) - Number(a.revenue || 0),
    );
  }, [rawProducts, sortBy, filterCat]);

  const top10 = products.slice(0, 10).map((p) => ({
    name: (p.product_name || p.name || '').slice(0, 20),
    qty: Number(p.qty_sold || p.total_sold || 0),
    revenue: Number(p.revenue || 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId={cashierId} onBranch={(v) => { setBranchId(v); setCashierId('all'); }} onCashier={setCashierId} />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="qty">Sort: Qty Terjual</SelectItem>
            <SelectItem value="revenue">Sort: Revenue</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? <LoadingCenter /> : (
        <>
          {top10.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Top 10 Produk</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }}
                      tickFormatter={(v) => sortBy === 'revenue' ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v) => [sortBy === 'revenue' ? formatRp(v) : v, sortBy === 'revenue' ? 'Revenue' : 'Qty']} />
                    <Bar dataKey={sortBy === 'revenue' ? 'revenue' : 'qty'} fill="hsl(20 50% 32%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nama Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Qty Terjual</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Belum ada data</TableCell></TableRow>
                  ) : products.map((p, i) => (
                    <TableRow key={p.id || i}>
                      <TableCell className="text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{p.product_name || p.name}</TableCell>
                      <TableCell>
                        {(p.category_name || p.category) && (
                          <Badge variant="secondary" className="text-xs">{p.category_name || p.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(p.qty_sold || p.total_sold || 0).toLocaleString('id')}
                      </TableCell>
                      <TableCell className="text-right">{formatRp(p.revenue)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {totalRevenue > 0 ? `${((Number(p.revenue || 0) / totalRevenue) * 100).toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── Tab 3 — Per Jam ─────────────────────────────────────────────────────── */
function TabPerJam() {
  const [from, setFrom] = useState(todayStr);
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState('all');
  const [cashierId, setCashierId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to });
  if (branchId !== 'all') qs.set('branch_id', branchId);
  if (cashierId !== 'all') qs.set('cashier_id', cashierId);

  const { data, loading, refetch } = useFetch(`/reports/hourly?${qs}`);

  const { chartData, peakHours } = useMemo(() => {
    const raw = data?.hours || [];
    const maxOrders = Math.max(...raw.map((h) => Number(h.orders || 0)), 1);
    const threshold = maxOrders * 0.7;
    const peaks = new Set(raw.filter((h) => Number(h.orders || 0) >= threshold).map((h) => Number(h.hour)));

    const full = Array.from({ length: 24 }, (_, i) => {
      const found = raw.find((h) => Number(h.hour) === i);
      return {
        hour: `${String(i).padStart(2, '0')}:00`,
        orders: Number(found?.orders || 0),
        revenue: Number(found?.revenue || 0),
        isPeak: peaks.has(i),
      };
    });
    return { chartData: full, peakHours: peaks };
  }, [data]);

  const tableRows = data?.hours || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId={cashierId} onBranch={(v) => { setBranchId(v); setCashierId('all'); }} onCashier={setCashierId} />
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? <LoadingCenter /> : (
        <>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle className="text-sm">Pesanan per Jam</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [v, 'Pesanan']} />
                    <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.isPeak ? '#f59e0b' : 'hsl(20 50% 32%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Revenue per Jam</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [formatRp(v), 'Revenue']} />
                    <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.isPeak ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jam</TableHead>
                    <TableHead className="text-right">Pesanan</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Rata-rata / Order</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Belum ada data</TableCell></TableRow>
                  ) : tableRows.map((h) => {
                    const hourNum = Number(h.hour);
                    const isPeak = peakHours.has(hourNum);
                    return (
                      <TableRow key={h.hour} className={isPeak ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}>
                        <TableCell className="font-mono text-sm">{String(hourNum).padStart(2, '0')}:00</TableCell>
                        <TableCell className="text-right font-semibold">{Number(h.orders || 0)}</TableCell>
                        <TableCell className="text-right">{formatRp(h.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {Number(h.orders) > 0 ? formatRp(Number(h.revenue) / Number(h.orders)) : '—'}
                        </TableCell>
                        <TableCell>
                          {isPeak && Number(h.orders) > 0 && (
                            <Badge variant="warning" className="text-xs">Peak Hour</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── Tab 4 — Per Meja ────────────────────────────────────────────────────── */
const HEAT_CLS = [
  'bg-gray-100 text-gray-400 dark:bg-gray-800',
  'bg-emerald-100 text-emerald-700',
  'bg-emerald-300 text-emerald-800',
  'bg-emerald-500 text-white',
  'bg-emerald-700 text-white',
];

function heatLevel(orders, max) {
  if (!max || Number(orders) === 0) return 0;
  const r = Number(orders) / max;
  if (r < 0.2) return 1;
  if (r < 0.4) return 2;
  if (r < 0.7) return 3;
  return 4;
}

function TabPerMeja() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState('all');
  const [cashierId, setCashierId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to });
  if (branchId !== 'all') qs.set('branch_id', branchId);
  if (cashierId !== 'all') qs.set('cashier_id', cashierId);

  const { data, loading, refetch } = useFetch(`/reports/tables?${qs}`);
  const tables = useMemo(() => [...(data?.tables || [])].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)), [data]);
  const maxOrders = Math.max(...tables.map((t) => Number(t.orders || 0)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId={cashierId} onBranch={(v) => { setBranchId(v); setCashierId('all'); }} onCashier={setCashierId} />
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? <LoadingCenter /> : (
        <>
          {tables.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm">Peta Aktivitas Meja</CardTitle>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Rendah</span>
                    {[1, 2, 3, 4].map((l) => (
                      <span key={l} className={`w-4 h-4 rounded ${HEAT_CLS[l].split(' ')[0]}`} />
                    ))}
                    <span>Tinggi</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tables.map((t) => {
                    const level = heatLevel(t.orders, maxOrders);
                    const label = t.table_number || t.table_name || t.name || t.table_id;
                    return (
                      <div key={label}
                        title={`Meja ${label}: ${t.orders} order — ${formatRp(t.revenue)}`}
                        className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center cursor-default select-none font-semibold ${HEAT_CLS[level]}`}>
                        <span className="text-[10px] leading-tight">{label}</span>
                        <span className="text-lg font-bold leading-tight">{t.orders}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Meja</TableHead>
                    <TableHead className="text-right">Total Order</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Avg per Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">Belum ada data</TableCell></TableRow>
                  ) : tables.map((t) => {
                    const label = t.table_number || t.table_name || t.name || t.table_id;
                    const orders = Number(t.orders || 0);
                    return (
                      <TableRow key={label}>
                        <TableCell className="font-semibold">{label}</TableCell>
                        <TableCell className="text-right">{orders.toLocaleString('id')}</TableCell>
                        <TableCell className="text-right">{formatRp(t.revenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {orders > 0 ? formatRp(Number(t.revenue) / orders) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── Tab 5 — Per Staff ───────────────────────────────────────────────────── */
function TabPerStaff() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to });
  if (branchId !== 'all') qs.set('branch_id', branchId);

  const { data, loading, refetch } = useFetch(`/reports/staff?${qs}`);
  const staff = data?.staff || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId="all" onBranch={setBranchId} onCashier={() => {}} showCashier={false} />
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? <LoadingCenter /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nama Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Order Ditangani</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Tips</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Belum ada data</TableCell></TableRow>
                ) : staff.map((s, i) => (
                  <TableRow key={s.user_id || s.id || i}>
                    <TableCell className="text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name || s.user_name}</TableCell>
                    <TableCell>
                      {s.role && <Badge variant="outline" className="text-xs capitalize">{s.role}</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{Number(s.orders || s.transactions || 0).toLocaleString('id')}</TableCell>
                    <TableCell className="text-right">{formatRp(s.revenue)}</TableCell>
                    <TableCell className="text-right">{formatRp(s.tips)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Tab 6 — Shift ───────────────────────────────────────────────────────── */
function TabPerShift() {
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(todayStr);
  const [branchId, setBranchId] = useState('all');

  const qs = new URLSearchParams({ date_from: from, date_to: to });
  if (branchId !== 'all') qs.set('branch_id', branchId);

  const { data, loading, refetch } = useFetch(`/shifts?${qs}`);
  const shifts = data?.shifts || (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <BranchCashierFilter branchId={branchId} cashierId="all" onBranch={setBranchId} onCashier={() => {}} showCashier={false} />
        <Button size="sm" variant="outline" onClick={refetch} className="gap-1.5 h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading ? <LoadingCenter /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Shift</TableHead>
                  <TableHead>Dibuka Oleh</TableHead>
                  <TableHead>Dibuka</TableHead>
                  <TableHead>Ditutup</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Selisih Kas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Belum ada data shift</TableCell></TableRow>
                ) : shifts.map((s, i) => {
                  const diff = Number(s.cash_difference || 0);
                  return (
                    <TableRow key={s.id || i}>
                      <TableCell className="font-mono font-semibold text-sm">#{s.shift_number || s.shift_no || (i + 1)}</TableCell>
                      <TableCell>{s.opened_by_name || s.opened_by || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.opened_at ? new Date(s.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.closed_at ? new Date(s.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{formatRp(s.total_revenue || s.revenue)}</TableCell>
                      <TableCell className={`text-right font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {diff > 0 ? '+' : ''}{formatRp(diff)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'open' ? 'success' : 'secondary'} className="text-xs">
                          {s.status === 'open' ? 'Buka' : 'Tutup'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { shiftRequired } = useShiftGuard();

  const { data: settingsData } = useFetch('/settings');
  const settings = settingsData?.settings || [];
  const shiftEnabled = settings.find((s) => s.setting_key === 'shift_enabled')?.setting_value === 'true';

  if (shiftRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="bg-card border rounded-2xl shadow p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <p className="font-semibold text-base">Shift Belum Dibuka</p>
          <p className="text-sm text-muted-foreground">Buka shift di halaman POS untuk mengakses laporan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Laporan</h1>
        <p className="text-sm text-muted-foreground">Analisis penjualan dan performa kafe</p>
      </div>

      <Tabs defaultValue="ringkasan">
        <TabsList className="flex-wrap h-auto gap-1 p-1 justify-start">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="produk">Per Produk</TabsTrigger>
          <TabsTrigger value="jam">Per Jam</TabsTrigger>
          <TabsTrigger value="meja">Per Meja</TabsTrigger>
          {isAdmin && <TabsTrigger value="staff">Per Kasir</TabsTrigger>}
          {shiftEnabled && <TabsTrigger value="shift">Shift</TabsTrigger>}
        </TabsList>

        <TabsContent value="ringkasan" className="mt-5"><TabRingkasan /></TabsContent>
        <TabsContent value="produk" className="mt-5"><TabPerProduk /></TabsContent>
        <TabsContent value="jam" className="mt-5"><TabPerJam /></TabsContent>
        <TabsContent value="meja" className="mt-5"><TabPerMeja /></TabsContent>
        {isAdmin && <TabsContent value="staff" className="mt-5"><TabPerStaff /></TabsContent>}
        {shiftEnabled && <TabsContent value="shift" className="mt-5"><TabPerShift /></TabsContent>}
      </Tabs>
    </div>
  );
}
