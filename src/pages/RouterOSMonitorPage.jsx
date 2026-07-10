import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  ArrowDown, ArrowUp, Cpu, CircleOff, CircleX, Database, Download, EthernetPort,
  ExternalLink, HardDrive, Loader2, MonitorSmartphone, Play, RefreshCcw, Router,
  Signal, Square, Trash2, Upload, Users, Wifi, Activity, ShoppingCart, Clock,
  ChevronRight, Globe, Network,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area,
} from 'recharts';

const POLL_INTERVAL_MS = 3000;
const MAX_HISTORY = 40;

function fmtBytes(b) {
  if (!b || b === '0') return '0 B';
  const n = parseInt(b);
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function fmtBits(bps) {
  if (!bps || bps === '0') return '0 bps';
  const n = parseFloat(bps);
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)} Gbps`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} Mbps`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)} Kbps`;
  return `${n.toFixed(0)} bps`;
}

function fmtTime(s) { return s || '—'; }

// ─── Speed animated bar ──────────────────────────────────────
function SpeedBar({ valueBps, type, compact = false }) {
  const maxBps = 10 * 1000 * 1000; // 10 Mbps reference
  const pct = Math.min(100, (valueBps / maxBps) * 100);
  const isRx = type === 'rx';
  const color = isRx ? 'emerald' : 'blue';
  const gradient = isRx ? 'from-emerald-400 to-emerald-600' : 'from-blue-400 to-blue-600';

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'py-0.5'}`}>
      {isRx
        ? <ArrowDown className={`w-3 h-3 flex-shrink-0 text-emerald-500 ${valueBps > 1000 ? 'animate-bounce' : ''}`} />
        : <ArrowUp className={`w-3 h-3 flex-shrink-0 text-blue-500 ${valueBps > 1000 ? 'animate-bounce' : ''}`} />
      }
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
          style={{ width: `${Math.max(pct, valueBps > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono ${compact ? 'w-14' : 'w-16'} text-right ${isRx ? 'text-emerald-600' : 'text-blue-600'}`}>
        {fmtBits(valueBps)}
      </span>
    </div>
  );
}

// ─── Table Card ──────────────────────────────────────────────
function TableCard({ user, rxRate, txRate, onClick }) {
  const h = user.hotspot;
  const isOnline = user.online;
  const tableNum = user.order?.table_number || user.booking?.table_number || '?';
  const username = user.credential?.username || h?.user || '—';
  const hasOrder = !!user.order?.order_number;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group
        ${isOnline
          ? 'border-emerald-200/60 bg-gradient-to-br from-white to-emerald-50/50 hover:border-emerald-300'
          : 'border-border/50 bg-muted/20 opacity-60 hover:opacity-80'
        }`}
    >
      {/* Top row: table number + status */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0">Meja</p>
          <p className="text-4xl font-black tracking-tighter leading-none">{tableNum}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full
            ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {isOnline && h?.uptime && (
            <span className="text-[10px] text-muted-foreground font-mono">{fmtTime(h.uptime)}</span>
          )}
        </div>
      </div>

      {/* Username + IP */}
      <p className="text-xs font-mono text-muted-foreground truncate mb-2.5">{username}</p>

      {/* Speed bars */}
      {isOnline ? (
        <div className="space-y-1 mb-2.5">
          <SpeedBar valueBps={rxRate} type="rx" compact />
          <SpeedBar valueBps={txRate} type="tx" compact />
        </div>
      ) : (
        <div className="h-8 flex items-center">
          <span className="text-xs text-muted-foreground/60">Tidak terhubung</span>
        </div>
      )}

      {/* Total bytes */}
      {isOnline && h && (
        <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono mb-2.5">
          <span>DL: {fmtBytes(h['bytes-in'])}</span>
          <span>UL: {fmtBytes(h['bytes-out'])}</span>
        </div>
      )}

      {/* Order footer */}
      <div className={`pt-2 border-t ${isOnline ? 'border-emerald-100' : 'border-border/40'}`}>
        {hasOrder ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-primary">#{user.order.order_number}</span>
              {user.order.total && (
                <p className="text-sm font-bold mt-0.5">Rp {parseInt(user.order.total).toLocaleString('id-ID')}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
              <span className="text-[10px]">{user.items.length} item</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tidak ada pesanan</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────
function TableDetailModal({ user, onClose }) {
  const [conns, setConns] = useState([]);
  const [loadingConns, setLoadingConns] = useState(false);
  const [tab, setTab] = useState('order');

  useEffect(() => {
    if (!user) return;
    const ip = user.hotspot?.address;
    if (!ip) return;
    setLoadingConns(true);
    api.get('/integrations/mikrotik/connection/tracking')
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : [];
        const prefix = ip.split('/')[0];
        setConns(all.filter(c => (c['src-address'] || '').startsWith(prefix)));
      })
      .catch(() => {})
      .finally(() => setLoadingConns(false));
  }, [user]);

  if (!user) return null;

  const h = user.hotspot;
  const tableNum = user.order?.table_number || user.booking?.table_number || '?';
  const username = user.credential?.username || h?.user || '—';
  const isOnline = user.online;

  return (
    <Dialog open={!!user} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${isOnline ? 'bg-gradient-to-r from-emerald-50 to-white' : 'bg-muted/20'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl
                ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {tableNum}
              </div>
              <div>
                <DialogTitle className="text-lg">Meja {tableNum}</DialogTitle>
                <p className="text-sm text-muted-foreground font-mono">{username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`flex items-center gap-1 text-xs font-medium ${isOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {h?.address && <span className="text-xs text-muted-foreground font-mono">{h.address}</span>}
                  {h?.uptime && <span className="text-xs text-muted-foreground">{fmtTime(h.uptime)}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Speed summary */}
          {isOnline && h && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Total Download</span>
                </div>
                <p className="text-lg font-bold text-emerald-600">{fmtBytes(h['bytes-in'])}</p>
              </div>
              <div className="bg-white/80 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Total Upload</span>
                </div>
                <p className="text-lg font-bold text-blue-600">{fmtBytes(h['bytes-out'])}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b px-6">
          {[
            { id: 'order', label: 'Pesanan', icon: ShoppingCart },
            { id: 'conns', label: `Koneksi${conns.length ? ` (${conns.length})` : ''}`, icon: Network },
          ].map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'order' && (
            <div className="space-y-4">
              {user.items.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">
                      {user.order?.order_number ? `Order #${user.order.order_number}` : 'Item Pesanan'}
                    </h4>
                    {user.order?.order_status && (
                      <Badge variant={user.order.order_status === 'completed' ? 'default' : 'secondary'}>
                        {user.order.order_status}
                      </Badge>
                    )}
                  </div>
                  <div className="divide-y border rounded-xl overflow-hidden">
                    {user.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                            {item.quantity}
                          </span>
                          <span className="text-sm font-medium truncate">{item.product_name}</span>
                        </div>
                        <span className="text-sm font-semibold ml-3">Rp {parseInt(item.price || 0).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                    {user.order?.total && (
                      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 font-semibold">
                        <span>Total</span>
                        <span className="text-base">Rp {parseInt(user.order.total).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Tidak ada pesanan terhubung ke user ini</p>
                </div>
              )}
            </div>
          )}

          {tab === 'conns' && (
            <div>
              {loadingConns ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : conns.length > 0 ? (
                <div className="space-y-2">
                  {conns.map((c, i) => {
                    const bytes = parseInt(c['original-bytes-in'] || 0) + parseInt(c['original-bytes-out'] || 0);
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate font-medium">{c['dst-address']}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {c.protocol || 'tcp'} · port {c['dst-port'] || '—'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{fmtBytes(bytes)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Network className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Tidak ada koneksi aktif tercatat</p>
                  <p className="text-xs text-center">HTTPS/SSL biasanya tidak muncul di connection tracking</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Usage by Table Tab (redesigned) ──────────────────────────
function UsageByTableTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const prevBytesRef = useRef({});
  const ratesRef = useRef({});
  const intervalRef = useRef(null);

  const poll = useCallback(async (isInitial = false) => {
    try {
      const res = await api.get('/integrations/mikrotik/hotspot/active-with-details');
      const data = Array.isArray(res.data) ? res.data : [];
      const now = Date.now();

      data.forEach(u => {
        const h = u.hotspot;
        const id = u.credential?.id || u.hotspot?.user || `user-${u.order?.table_number}`;
        const curIn = parseInt(h?.['bytes-in'] || 0);
        const curOut = parseInt(h?.['bytes-out'] || 0);
        const prev = prevBytesRef.current[id];
        if (prev && !isInitial) {
          const dt = (now - prev.time) / 1000 || POLL_INTERVAL_MS / 1000;
          ratesRef.current[id] = {
            rxRate: Math.max(0, (curIn - prev.bytesIn) * 8 / dt),
            txRate: Math.max(0, (curOut - prev.bytesOut) * 8 / dt),
          };
        }
        prevBytesRef.current[id] = { bytesIn: curIn, bytesOut: curOut, time: now };
      });

      setUsers(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback(() => {
    setRunning(true);
    poll(true);
    intervalRef.current = setInterval(() => poll(false), POLL_INTERVAL_MS);
  }, [poll]);

  const stopPolling = () => {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => {
    startPolling();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startPolling]);

  const sorted = [...users].sort((a, b) => {
    const ta = a.order?.table_number || a.booking?.table_number || '';
    const tb = b.order?.table_number || b.booking?.table_number || '';
    return ta.localeCompare(tb, undefined, { numeric: true });
  });

  const filtered = sorted.filter(u => {
    if (filter === 'online') return u.online;
    if (filter === 'offline') return !u.online;
    return true;
  });

  const online = sorted.filter(u => u.online);
  const totalDl = online.reduce((s, u) => s + parseInt(u.hotspot?.['bytes-in'] || 0), 0);
  const totalUl = online.reduce((s, u) => s + parseInt(u.hotspot?.['bytes-out'] || 0), 0);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={startPolling} />;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-0 bg-gradient-to-br from-violet-50 to-violet-100/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-violet-600 mb-1">Total Meja</p>
            <p className="text-2xl font-black text-violet-700">{sorted.length}</p>
            <p className="text-[10px] text-violet-500 mt-0.5">{online.length} sedang online</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-emerald-600 mb-1">Online</p>
            <p className="text-2xl font-black text-emerald-700">{online.length}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">aktif terhubung</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-sky-50 to-sky-100/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-sky-600 flex items-center gap-1 mb-1">
              <ArrowDown className="w-3 h-3" /> Total DL
            </p>
            <p className="text-lg font-black text-sky-700">{fmtBytes(totalDl)}</p>
            <p className="text-[10px] text-sky-500 mt-0.5">semua meja online</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-orange-600 flex items-center gap-1 mb-1">
              <ArrowUp className="w-3 h-3" /> Total UL
            </p>
            <p className="text-lg font-black text-orange-700">{fmtBytes(totalUl)}</p>
            <p className="text-[10px] text-orange-500 mt-0.5">semua meja online</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {[
            { id: 'all', label: `Semua (${sorted.length})` },
            { id: 'online', label: `Online (${online.length})` },
            { id: 'offline', label: `Offline (${sorted.length - online.length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === f.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live · setiap {POLL_INTERVAL_MS / 1000}s
            </span>
          )}
          {running
            ? <Button size="sm" variant="outline" onClick={stopPolling}><Square className="w-3.5 h-3.5 mr-1" /> Pause</Button>
            : <Button size="sm" onClick={startPolling}><Play className="w-3.5 h-3.5 mr-1" /> Resume</Button>
          }
          <Button size="sm" variant="ghost" onClick={() => poll(true)}>
            <RefreshCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Wifi className="w-12 h-12 opacity-20" />
          <p className="text-sm">Tidak ada meja yang terhubung WiFi hotspot</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((u, idx) => {
            const id = u.credential?.id || u.hotspot?.user || `idx-${idx}`;
            const rates = ratesRef.current[id] || { rxRate: 0, txRate: 0 };
            return (
              <TableCard
                key={id}
                user={u}
                rxRate={rates.rxRate}
                txRate={rates.txRate}
                onClick={() => setSelectedUser(u)}
              />
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <TableDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function RouterOSMonitorPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Router className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">RouterOS Monitor</h1>
          <p className="text-xs text-muted-foreground">Monitoring jaringan MikroTik real-time</p>
        </div>
      </div>
      <Tabs defaultValue="bytable">
        <TabsList className="h-auto p-1 gap-1">
          {[
            { value: 'bytable', label: 'Usage by Table', icon: Users },
            { value: 'dashboard', label: 'Dashboard', icon: Cpu },
            { value: 'traffic', label: 'Traffic', icon: Activity },
            { value: 'active', label: 'Active Users', icon: Wifi },
            { value: 'queue', label: 'Queue', icon: Signal },
            { value: 'users', label: 'Hotspot Users', icon: Users },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs px-3 py-2">
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="bytable" className="mt-4"><UsageByTableTab /></TabsContent>
        <TabsContent value="dashboard" className="mt-4"><DashboardTab /></TabsContent>
        <TabsContent value="traffic" className="mt-4"><TrafficTab /></TabsContent>
        <TabsContent value="active" className="mt-4"><ActiveTab /></TabsContent>
        <TabsContent value="queue" className="mt-4"><QueueTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────
function DashboardTab() {
  const [state, setState] = useState({ resource: null, interfaces: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const [res, ifs] = await Promise.all([
        api.get('/integrations/mikrotik/system/resource'),
        api.get('/integrations/mikrotik/interface'),
      ]);
      setState({ resource: res.data, interfaces: ifs.data, loading: false, error: null });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.response?.data?.error || err.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <LoadingSpinner />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const r = state.resource || {};
  const memUsedPct = r['total-memory'] && r['free-memory']
    ? Math.round((1 - parseInt(r['free-memory']) / parseInt(r['total-memory'])) * 100) : 0;
  const diskUsedPct = r['total-hdd-space'] && r['free-hdd-space']
    ? Math.round((1 - parseInt(r['free-hdd-space']) / parseInt(r['total-hdd-space'])) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ResourceCard icon={Cpu} label="CPU Load" value={`${r['cpu-load'] || '?'}%`} pct={parseInt(r['cpu-load'] || 0)} color="violet" />
        <ResourceCard icon={Database} label="RAM Used" value={`${memUsedPct}%`}
          sub={`${fmtBytes(parseInt(r['total-memory'] || 0) - parseInt(r['free-memory'] || 0))} / ${fmtBytes(r['total-memory'])}`}
          pct={memUsedPct} color="blue" />
        <ResourceCard icon={HardDrive} label="Disk Used" value={`${diskUsedPct}%`}
          sub={`${fmtBytes(parseInt(r['total-hdd-space'] || 0) - parseInt(r['free-hdd-space'] || 0))} / ${fmtBytes(r['total-hdd-space'])}`}
          pct={diskUsedPct} color="amber" />
        <ResourceCard icon={Clock} label="Uptime" value={r.uptime || '?'} color="emerald" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <EthernetPort className="w-4 h-4 text-primary" /> Interfaces
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>MAC</TableHead>
                <TableHead>Status</TableHead><TableHead>MTU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(state.interfaces || []).map(iface => (
                <TableRow key={iface['.id'] || iface.name}>
                  <TableCell className="font-medium">{iface.name}</TableCell>
                  <TableCell className="text-sm">{iface.type}</TableCell>
                  <TableCell className="font-mono text-xs">{iface['mac-address'] || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={iface.running === 'true' ? 'default' : 'secondary'}>
                      {iface.running === 'true' ? 'Running' : 'Down'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{iface['actual-mtu'] || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ResourceCard({ icon: Icon, label, value, sub, pct, color }) {
  const colors = {
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  };
  const barColors = {
    violet: 'bg-violet-500', blue: 'bg-blue-500',
    amber: 'bg-amber-500', emerald: 'bg-emerald-500',
  };
  return (
    <Card className={`border ${colors[color] || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${colors[color]?.split(' ')[0]}`} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold mb-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mb-2">{sub}</p>}
        {pct !== undefined && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColors[color]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Traffic ────────────────────────────────────────────────
function TrafficTab() {
  const [interfaces, setInterfaces] = useState([]);
  const [selectedIface, setSelectedIface] = useState('ether1');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dataRef = useRef([]);
  const [chartData, setChartData] = useState([]);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const loadInterfaces = useCallback(async () => {
    try {
      const res = await api.get('/integrations/mikrotik/interface');
      setInterfaces(res.data.filter(i => i.type === 'ether'));
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInterfaces(); }, [loadInterfaces]);

  const poll = useCallback(async () => {
    try {
      const res = await api.post(`/integrations/mikrotik/interface/monitor-traffic/${selectedIface}`);
      const data = Array.isArray(res.data) ? res.data[0] : res.data;
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      dataRef.current = [
        ...dataRef.current.slice(-(MAX_HISTORY - 1)),
        {
          time: `${elapsed}s`,
          rx: parseFloat(data['rx-bits-per-second'] || 0),
          tx: parseFloat(data['tx-bits-per-second'] || 0),
          rxRate: fmtBits(data['rx-bits-per-second']),
          txRate: fmtBits(data['tx-bits-per-second']),
        },
      ];
      setChartData([...dataRef.current]);
    } catch { /* ignore */ }
  }, [selectedIface]);

  const start = () => {
    dataRef.current = []; setChartData([]);
    startTimeRef.current = Date.now();
    setRunning(true); poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };
  const stop = () => {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  useEffect(() => { if (running) { stop(); setTimeout(start, 150); } }, [selectedIface]);

  const current = chartData[chartData.length - 1];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadInterfaces} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedIface} onChange={e => setSelectedIface(e.target.value)}
          className="flex h-9 rounded-lg border border-input bg-background px-3 py-1 text-sm">
          {interfaces.map(i => (<option key={i.name} value={i.name}>{i.name}</option>))}
        </select>
        {!running
          ? <Button size="sm" onClick={start}><Play className="w-3.5 h-3.5 mr-1" /> Start</Button>
          : <Button size="sm" variant="destructive" onClick={stop}><Square className="w-3.5 h-3.5 mr-1" /> Stop</Button>
        }
        {running && <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <ArrowDown className="w-3 h-3 text-emerald-500" /> Download (RX)
            </p>
            <p className="text-2xl font-bold text-emerald-600">{current?.rxRate || '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <ArrowUp className="w-3 h-3 text-blue-500" /> Upload (TX)
            </p>
            <p className="text-2xl font-bold text-blue-600">{current?.txRate || '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))"
                tickFormatter={v => { if (v >= 1e9) return `${(v/1e9).toFixed(0)}G`; if (v >= 1e6) return `${(v/1e6).toFixed(0)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`; return v; }} />
              <Tooltip formatter={(v, n) => [fmtBits(v), n === 'rx' ? 'Download' : 'Upload']} labelFormatter={l => `Time: ${l}`} />
              <Legend />
              <Area type="monotone" dataKey="rx" stroke="#16a34a" fill="url(#rxGrad)" name="rx" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey="tx" stroke="#2563eb" fill="url(#txGrad)" name="tx" dot={false} strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Polling every {POLL_INTERVAL_MS / 1000}s · Last {MAX_HISTORY} points
      </p>
    </div>
  );
}

// ─── Active Users ──────────────────────────────────────────
function ActiveTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const prevRef = useRef({});
  const ratesRef = useRef({});
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await api.get('/integrations/mikrotik/hotspot/active');
      const data = Array.isArray(res.data) ? res.data : [];
      const now = Date.now();
      const rates = {};
      data.forEach(u => {
        const id = u['.id'];
        const prev = prevRef.current[id];
        const curBytesIn = parseInt(u['bytes-in'] || 0);
        const curBytesOut = parseInt(u['bytes-out'] || 0);
        if (prev) {
          const dt = (now - prev.time) / 1000 || 1;
          rates[id] = {
            rxRate: Math.max(0, (curBytesIn - prev.bytesIn) * 8 / dt),
            txRate: Math.max(0, (curBytesOut - prev.bytesOut) * 8 / dt),
          };
        }
        prevRef.current[id] = { bytesIn: curBytesIn, bytesOut: curBytesOut, time: now };
      });
      Object.keys(prevRef.current).forEach(id => { if (!data.find(u => u['.id'] === id)) delete prevRef.current[id]; });
      ratesRef.current = rates;
      setUsers(data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  }, []);

  const startPolling = () => {
    setRunning(true);
    prevRef.current = {}; ratesRef.current = {};
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };
  const stopPolling = () => {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => { startPolling(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const handleKill = async (id) => {
    if (!confirm('Kill this active session?')) return;
    try { await api.post(`/integrations/mikrotik/hotspot/active/${id}/kill`); poll(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={startPolling} />;

  const totalRx = users.reduce((s, u) => s + parseInt(u['bytes-in'] || 0), 0);
  const totalTx = users.reduce((s, u) => s + parseInt(u['bytes-out'] || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </CardContent></Card>
        <Card className="border-emerald-100 bg-emerald-50/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3 text-emerald-500" /> Total Download</p>
          <p className="text-lg font-bold text-emerald-600">{fmtBytes(totalRx)}</p>
        </CardContent></Card>
        <Card className="border-blue-100 bg-blue-50/30"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUp className="w-3 h-3 text-blue-500" /> Total Upload</p>
          <p className="text-lg font-bold text-blue-600">{fmtBytes(totalTx)}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center justify-end gap-2">
        {running
          ? <Button size="sm" variant="destructive" onClick={stopPolling}><Square className="w-3.5 h-3.5 mr-1" /> Stop</Button>
          : <Button size="sm" onClick={startPolling}><Play className="w-3.5 h-3.5 mr-1" /> Start</Button>
        }
        {running && <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Address</TableHead><TableHead>Uptime</TableHead>
                <TableHead>DL Total</TableHead><TableHead>UL Total</TableHead>
                <TableHead>DL Rate</TableHead><TableHead>UL Rate</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No active hotspot users.</TableCell></TableRow>
              )}
              {users.map(u => {
                const r = ratesRef.current[u['.id']];
                return (
                  <TableRow key={u['.id']}>
                    <TableCell className="font-medium">{u.user}</TableCell>
                    <TableCell className="font-mono text-xs">{u.address}</TableCell>
                    <TableCell className="text-sm">{fmtTime(u.uptime)}</TableCell>
                    <TableCell className="text-sm">{fmtBytes(u['bytes-in'])}</TableCell>
                    <TableCell className="text-sm">{fmtBytes(u['bytes-out'])}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {r ? <span className="text-emerald-600">{fmtBits(r.rxRate)}</span> : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r ? <span className="text-blue-600">{fmtBits(r.txRate)}</span> : '—'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="destructive" onClick={() => handleKill(u['.id'])}>
                        <CircleOff className="w-3.5 h-3.5 mr-1" /> Kill
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {users.length > 0 && <UserTrafficChart users={users} ratesRef={ratesRef} />}
    </div>
  );
}

function UserTrafficChart({ users, ratesRef }) {
  const barData = users.map(u => {
    const r = ratesRef.current[u['.id']];
    return {
      name: u.user.length > 12 ? u.user.slice(0, 12) : u.user,
      download: r ? r.rxRate : 0,
      upload: r ? r.txRate : 0,
    };
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" /> Current Traffic per User</CardTitle></CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))"
              tickFormatter={v => { if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`; return v; }} />
            <Tooltip formatter={(v, n) => [fmtBits(v), n === 'download' ? 'Download' : 'Upload']} />
            <Legend />
            <Bar dataKey="download" fill="#16a34a" name="download" radius={[4, 4, 0, 0]} />
            <Bar dataKey="upload" fill="#2563eb" name="upload" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Queue ──────────────────────────────────────────────────
function QueueTab() {
  const [state, setState] = useState({ queues: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get('/integrations/mikrotik/queue/simple');
      setState({ queues: res.data, loading: false, error: null });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.response?.data?.error || err.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state.loading) return <LoadingSpinner />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Signal className="w-4 h-4" /> Simple Queues</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCcw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Target</TableHead>
              <TableHead>Max Upload</TableHead><TableHead>Max Download</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(state.queues || []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No queues configured.</TableCell></TableRow>
            )}
            {(state.queues || []).map(q => {
              const parts = (q['max-limit'] || '').split('/');
              return (
                <TableRow key={q['.id'] || q.name}>
                  <TableCell className="font-medium">{q.name}</TableCell>
                  <TableCell className="font-mono text-xs">{q.target}</TableCell>
                  <TableCell>{parts[1] ? fmtBytes(parts[1]) : '—'}</TableCell>
                  <TableCell>{parts[0] ? fmtBytes(parts[0]) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={q.disabled === 'true' ? 'secondary' : 'default'}>
                      {q.disabled === 'true' ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Hotspot Users ──────────────────────────────────────────
function UsersTab() {
  const [state, setState] = useState({ users: [], loading: true, error: null });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get('/integrations/mikrotik/hotspot/user');
      setState({ users: res.data, loading: false, error: null });
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.response?.data?.error || err.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, currentDisabled) => {
    try {
      await api.patch(`/integrations/mikrotik/hotspot/user/${id}`, { disabled: currentDisabled === 'true' ? 'false' : 'true' });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete hotspot user "${name}"?`)) return;
    try { await api.delete(`/integrations/mikrotik/hotspot/user/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (state.loading) return <LoadingSpinner />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Wifi className="w-4 h-4" /> Hotspot Users ({state.users.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={load}><RefreshCcw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead><TableHead>Password</TableHead><TableHead>Profile</TableHead>
              <TableHead>Limit</TableHead><TableHead>Traffic</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(state.users || []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hotspot users.</TableCell></TableRow>
            )}
            {(state.users || []).map(u => (
              <TableRow key={u['.id']}>
                <TableCell className="font-mono text-sm font-medium">{u.name}</TableCell>
                <TableCell className="font-mono text-sm">{u.password || '—'}</TableCell>
                <TableCell className="text-sm">{u.profile || 'default'}</TableCell>
                <TableCell className="text-sm">{u['limit-uptime'] || '—'}</TableCell>
                <TableCell className="text-sm">
                  <span className="flex items-center gap-1 text-emerald-600"><Download className="w-3 h-3" />{fmtBytes(u['bytes-in'])}</span>
                  <span className="flex items-center gap-1 text-blue-600"><Upload className="w-3 h-3" />{fmtBytes(u['bytes-out'])}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={u.disabled === 'true' ? 'secondary' : 'default'}>{u.disabled === 'true' ? 'Disabled' : 'Active'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant={u.disabled === 'true' ? 'default' : 'secondary'} onClick={() => handleToggle(u['.id'], u.disabled)}>
                      {u.disabled === 'true' ? <><Play className="w-3 h-3 mr-1" /> Activate</> : <><CircleOff className="w-3 h-3 mr-1" /> Disable</>}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u['.id'], u.name)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Shared ─────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm">Memuat data...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <CircleX className="w-8 h-8 text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-destructive">Gagal memuat data</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCcw className="w-3.5 h-3.5 mr-1" /> Retry</Button>}
    </div>
  );
}
