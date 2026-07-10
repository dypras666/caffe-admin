import { useState } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Shield, AlertTriangle, Info, Search, Filter,
  ChevronLeft, ChevronRight, Loader2, Eye,
  Users, BarChart3, Clock, Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Constants ───────────────────────────────────────────────
const MODULES = ['order','inventory','booking','user','settings','media','stock','payment','room','system'];
const MODULE_LABEL = {
  order: 'Pesanan', inventory: 'Produk/Kategori', booking: 'Booking',
  user: 'Pengguna', settings: 'Pengaturan', media: 'Media',
  stock: 'Stok', payment: 'Pembayaran', room: 'Room/Meja', system: 'Sistem',
};
const MODULE_COLOR = {
  order: 'bg-blue-100 text-blue-700',
  inventory: 'bg-violet-100 text-violet-700',
  booking: 'bg-amber-100 text-amber-700',
  user: 'bg-green-100 text-green-700',
  settings: 'bg-gray-100 text-gray-700',
  media: 'bg-pink-100 text-pink-700',
  stock: 'bg-orange-100 text-orange-700',
  payment: 'bg-emerald-100 text-emerald-700',
  room: 'bg-cyan-100 text-cyan-700',
  system: 'bg-slate-100 text-slate-700',
};
const SEV_CONFIG = {
  info:     { label: 'Info',     cls: 'bg-blue-100 text-blue-700',   icon: Info },
  warning:  { label: 'Warning',  cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  critical: { label: 'Kritis',   cls: 'bg-red-100 text-red-700',     icon: Shield },
};

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
}

function actionToLabel(action) {
  return (action || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main Page ───────────────────────────────────────────────
export default function AuditPage() {
  return (
    <div className="space-y-5">
      <Tabs defaultValue="trail">
        <TabsList>
          <TabsTrigger value="trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>
        <TabsContent value="trail" className="mt-4"><AuditTrailTab /></TabsContent>
        <TabsContent value="stats" className="mt-4"><AuditStatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Audit Trail Tab ─────────────────────────────────────────
function AuditTrailTab() {
  const [filters, setFilters] = useState({
    search: '', module: 'all', severity: 'all', date_from: '', date_to: '',
  });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  const debouncedSearch = useDebounce(filters.search, 400);
  const qs = buildQS({ ...filters, search: debouncedSearch, page, limit: 30 });
  const { data, loading } = useFetch(`/audit${qs}`);

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari aksi, deskripsi, user..."
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filters.module} onValueChange={v => setFilter('module', v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Semua Modul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Modul</SelectItem>
                {MODULES.map(m => <SelectItem key={m} value={m}>{MODULE_LABEL[m] || m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.severity} onValueChange={v => setFilter('severity', v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Semua Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Level</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Kritis</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} className="w-36 h-9" />
              <span className="text-muted-foreground text-sm">—</span>
              <Input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} className="w-36 h-9" />
            </div>
            {(filters.search || filters.module !== 'all' || filters.severity !== 'all' || filters.date_from) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilters({ search: '', module: 'all', severity: 'all', date_from: '', date_to: '' }); setPage(1); }}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats chips */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{pagination.total || 0} log ditemukan</span>
        {pagination.total_pages > 1 && <span>· halaman {pagination.page}/{pagination.total_pages}</span>}
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
                  <TableHead className="w-36">Waktu</TableHead>
                  <TableHead className="w-20">Level</TableHead>
                  <TableHead className="w-24">Modul</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-24">IP</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      Tidak ada log ditemukan
                    </TableCell>
                  </TableRow>
                ) : logs.map(log => {
                  const sev = SEV_CONFIG[log.severity] || SEV_CONFIG.info;
                  const mod = log.module || 'system';
                  return (
                    <TableRow key={log.id} className={log.severity === 'critical' ? 'bg-red-50/50' : log.severity === 'warning' ? 'bg-amber-50/30' : ''}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sev.cls}`}>
                          <sev.icon className="w-3 h-3" />
                          {sev.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${MODULE_COLOR[mod] || 'bg-gray-100 text-gray-600'}`}>
                          {MODULE_LABEL[mod] || mod}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">{log.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                        {log.description || '—'}
                      </TableCell>
                      <TableCell>
                        {log.user_name ? (
                          <div>
                            <p className="text-xs font-medium">{log.user_name}</p>
                            <p className="text-[10px] text-muted-foreground">{log.user_role}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Publik</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.ip_address?.replace('::ffff:', '').replace('::1', 'localhost') || '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailId(log.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Halaman {pagination.page} dari {pagination.total_pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, pagination.total_pages - 4)) + i;
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-8" onClick={() => setPage(p)}>
                  {p}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailId && <LogDetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

// ─── Log Detail Dialog ───────────────────────────────────────
function LogDetailDialog({ id, onClose }) {
  const { data, loading } = useFetch(`/audit/${id}`);
  const log = data?.log;
  const sev = log ? (SEV_CONFIG[log.severity] || SEV_CONFIG.info) : SEV_CONFIG.info;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Detail Audit Log #{id}
          </DialogTitle>
        </DialogHeader>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div> : log ? (
          <div className="space-y-4 text-sm">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/30 rounded-lg">
              <div><p className="text-xs text-muted-foreground mb-0.5">Waktu</p><p className="font-medium">{formatDateTime(log.created_at)}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Level</p>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sev.cls}`}>
                  <sev.icon className="w-3 h-3" />{sev.label}
                </span>
              </div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Modul</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULE_COLOR[log.module] || 'bg-gray-100 text-gray-600'}`}>
                  {MODULE_LABEL[log.module] || log.module || 'system'}
                </span>
              </div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Aksi</p><p className="font-mono font-medium">{log.action}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">User</p>
                <p className="font-medium">{log.user_name || 'Publik'}</p>
                {log.user_email && <p className="text-xs text-muted-foreground">{log.user_email} · {log.user_role}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">IP Address</p>
                <p className="font-mono">{log.ip_address?.replace('::ffff:', '').replace('::1', 'localhost') || '—'}</p>
              </div>
              {log.table_name && <div><p className="text-xs text-muted-foreground mb-0.5">Tabel</p><p className="font-mono">{log.table_name} #{log.record_id}</p></div>}
            </div>

            {/* Description */}
            {log.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Deskripsi</p>
                <p className="text-sm bg-secondary/30 rounded-lg p-3">{log.description}</p>
              </div>
            )}

            {/* Old / New values diff */}
            {(log.old_values || log.new_values) && (
              <div className="grid grid-cols-2 gap-3">
                {log.old_values && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Nilai Sebelum</p>
                    <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-48 text-red-900">
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {log.new_values && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Nilai Sesudah</p>
                    <pre className="text-xs bg-green-50 border border-green-100 rounded-lg p-3 overflow-auto max-h-48 text-green-900">
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* User Agent */}
            {log.user_agent && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Browser / Client</p>
                <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2 break-all">{log.user_agent}</p>
              </div>
            )}
          </div>
        ) : <p className="text-muted-foreground text-center py-8">Log tidak ditemukan</p>}
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats Tab ───────────────────────────────────────────────
function AuditStatsTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const qs = buildQS({ date_from: dateFrom, date_to: dateTo });
  const { data, loading } = useFetch(`/audit/stats${qs}`);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const { totals = {}, by_module = [], by_severity = [], by_user = [], by_day = [] } = data || {};

  const sevColor = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' };
  const dayChartData = [...by_day].reverse().map(d => ({ date: d.day?.slice(5), count: d.count }));

  return (
    <div className="space-y-5">
      {/* Date range filter */}
      <div className="flex items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" />
        <span className="text-muted-foreground">—</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-sm" />
        {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Reset</Button>}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Total Log" value={totals.total || 0} color="bg-primary" />
        <StatCard icon={Info} label="Hari Ini" value={totals.today || 0} color="bg-blue-500" />
        <StatCard icon={AlertTriangle} label="Warning" value={totals.warnings || 0} color="bg-amber-500" alert={totals.warnings > 0} />
        <StatCard icon={Shield} label="Kritis" value={totals.critical || 0} color="bg-red-500" alert={totals.critical > 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Activity by day chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />Aktivitas Harian</CardTitle></CardHeader>
          <CardContent>
            {dayChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dayChartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(20 50% 32%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-10">Tidak ada data</p>}
          </CardContent>
        </Card>

        {/* By Severity */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Per Level</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {by_severity.map(s => {
                const cfg = SEV_CONFIG[s.severity] || SEV_CONFIG.info;
                const pct = totals.total ? Math.round(s.count / totals.total * 100) : 0;
                return (
                  <div key={s.severity}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </span>
                      <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: sevColor[s.severity] || '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* By module */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Per Modul</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {by_module.filter(m => m.module).map(m => {
                const pct = totals.total ? Math.round(m.count / totals.total * 100) : 0;
                return (
                  <div key={m.module} className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-24 text-center ${MODULE_COLOR[m.module] || 'bg-gray-100 text-gray-600'}`}>
                      {MODULE_LABEL[m.module] || m.module}
                    </span>
                    <div className="flex-1 h-2 bg-secondary rounded-full">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{m.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top users */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Pengguna Teraktif</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {by_user.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Tidak ada data</p>
              ) : by_user.map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.user_name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">{u.role}</p>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground">{u.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────
function buildQS(obj) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== '' && v !== 'all') params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

function StatCard({ icon: Icon, label, value, color, alert }) {
  return (
    <Card className={alert ? 'border-amber-300 bg-amber-50/40' : ''}>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
