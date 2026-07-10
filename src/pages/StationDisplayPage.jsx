import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { cn } from '../lib/utils';
import {
  ChefHat, GlassWater, Clock, CheckCircle, AlertCircle,
  RefreshCw, Printer, Volume2, VolumeX, PlayCircle, Loader,
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff} detik lalu`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  return `${h} jam lalu`;
}

function avgWaitMinutes(orders) {
  if (!orders.length) return 0;
  const now = Date.now();
  const total = orders.reduce((s, o) => s + (now - new Date(o.created_at).getTime()), 0);
  return Math.round(total / orders.length / 60000);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) { /* audio blocked — ignore */ }
}

const TYPE_ICON = {
  dapur: <ChefHat className="w-5 h-5" />,
  bar: <GlassWater className="w-5 h-5" />,
};

const ORDER_TYPE_LABEL = {
  dine_in: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  delivery: 'Delivery',
  online: 'Online',
};

// ── item status button ─────────────────────────────────────────────────────

function ItemRow({ item, onStatusChange }) {
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/stations/items/${item.id}/status`, { status: newStatus });
      onStatusChange(item.id, newStatus);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status');
    } finally {
      setUpdating(false);
    }
  };

  const isPending = item.station_status === 'pending';
  const isPreparing = item.station_status === 'preparing';
  const isReady = item.station_status === 'ready';

  return (
    <div className={cn(
      'flex items-start gap-3 py-3 px-3 rounded-lg transition-colors',
      isReady ? 'bg-green-900/30 opacity-60' : 'bg-gray-800/60',
    )}>
      {/* Qty + name */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-bold text-lg leading-tight',
          isReady ? 'text-green-400 line-through' : 'text-white',
        )}>
          <span className="text-yellow-300 mr-1">{item.quantity}×</span>
          {item.product_name}
        </p>
        {item.notes && (
          <p className="text-sm text-orange-300 mt-0.5 italic">📝 {item.notes}</p>
        )}
        {item.addons_selected && item.addons_selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.addons_selected.map((a, i) => {
              const name = typeof a === 'string' ? a : (a.addon_name || a.name || '');
              const qty = typeof a === 'object' && a.qty > 1 ? ` ×${a.qty}` : '';
              return (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  +{name}{qty}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0">
        {isReady ? (
          <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Selesai
          </span>
        ) : (
          <div className="flex gap-2">
            {isPending && (
              <button
                disabled={updating}
                onClick={() => handleStatus('preparing')}
                className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {updating ? '...' : 'Proses'}
              </button>
            )}
            {isPreparing && (
              <button
                disabled={updating}
                onClick={() => handleStatus('ready')}
                className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {updating ? '...' : 'Selesai'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── order card ─────────────────────────────────────────────────────────────

function OrderCard({ order, onItemStatusChange }) {
  const [visible, setVisible] = useState(true);
  const [items, setItems] = useState(order.items || []);

  const [bulkUpdating, setBulkUpdating] = useState(false);

  const handleItemStatus = (itemId, newStatus) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, station_status: newStatus } : it));
    onItemStatusChange && onItemStatusChange(itemId, newStatus);
  };

  // Proses semua item sekaligus
  const handleBulkStatus = async (targetStatus) => {
    const toUpdate = items.filter(it =>
      targetStatus === 'preparing' ? it.station_status === 'pending'
        : it.station_status === 'preparing'
    );
    if (!toUpdate.length) return;
    setBulkUpdating(true);
    try {
      await Promise.all(toUpdate.map(it =>
        api.patch(`/stations/items/${it.id}/status`, { status: targetStatus })
      ));
      setItems(prev => prev.map(it =>
        toUpdate.find(u => u.id === it.id) ? { ...it, station_status: targetStatus } : it
      ));
    } catch (err) {
      alert('Gagal update semua: ' + (err.response?.data?.error || err.message));
    } finally {
      setBulkUpdating(false);
    }
  };

  const allReady = items.length > 0 && items.every(it => it.station_status === 'ready');

  // Fade out when all items ready
  useEffect(() => {
    if (allReady) {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [allReady]);

  if (!visible) return null;

  const pendingCount = items.filter(it => it.station_status === 'pending').length;
  const preparingCount = items.filter(it => it.station_status === 'preparing').length;

  const handlePrint = async () => {
    try {
      await api.get(`/printers/kitchen/${order.id}`);
      window.print();
    } catch (_) {
      window.print();
    }
  };

  return (
    <div className={cn(
      'rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-700',
      allReady
        ? 'border-green-500 bg-green-900/20 scale-95 opacity-40'
        : pendingCount > 0
        ? 'border-yellow-600 bg-gray-800'
        : 'border-blue-500 bg-gray-800',
    )}>
      {/* Card header */}
      <div className={cn(
        'px-4 py-3 flex items-center justify-between',
        allReady ? 'bg-green-800/40' : pendingCount > 0 ? 'bg-yellow-900/40' : 'bg-blue-900/40',
      )}>
        <div className="flex items-center gap-3">
          <span className="font-mono font-black text-3xl text-white tracking-tight">
            #{order.order_number}
          </span>
          <div className="flex flex-col gap-1">
            {order.table_number && (
              <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full font-medium">
                Meja {order.table_number}
              </span>
            )}
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
              {ORDER_TYPE_LABEL[order.order_type] || order.order_type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {timeAgo(order.created_at)}
            </span>
            {allReady && (
              <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                <CheckCircle className="w-3 h-3" /> Semua Selesai
              </span>
            )}
          </div>
          <button
            onClick={handlePrint}
            title="Print Ulang"
            className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk action buttons */}
      {!allReady && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-700">
          {pendingCount > 0 && (
            <button
              disabled={bulkUpdating}
              onClick={() => handleBulkStatus('preparing')}
              className="flex-1 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Proses Semua ({pendingCount})
            </button>
          )}
          {preparingCount > 0 && pendingCount === 0 && (
            <button
              disabled={bulkUpdating}
              onClick={() => handleBulkStatus('ready')}
              className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {bulkUpdating ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Selesai Semua ({preparingCount})
            </button>
          )}
        </div>
      )}

      {/* Status pill row */}
      {!allReady && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-700">
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
              {pendingCount} menunggu
            </span>
          )}
          {preparingCount > 0 && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
              {preparingCount} diproses
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 p-3 space-y-2">
        {items.map(item => (
          <ItemRow key={item.id} item={item} onStatusChange={handleItemStatus} />
        ))}
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function StationDisplayPage() {
  const { stationCode } = useParams();
  const [stationData, setStationData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get(`/stations/display/${stationCode}`);
      const newOrders = res.data.orders || [];
      setStationData(res.data.station);
      setOrders(newOrders);
      setError(null);

      // Sound alert on new orders
      setLastOrderCount(prev => {
        if (prev !== null && newOrders.length > prev && soundEnabledRef.current) {
          beep();
        }
        return newOrders.length;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat data stasiun');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stationCode]);

  // Initial load
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pendingOrders = orders.filter(o =>
    o.items?.some(it => it.station_status === 'pending')
  );
  const preparingOrders = orders.filter(o =>
    o.items?.some(it => it.station_status === 'preparing') &&
    !o.items?.some(it => it.station_status === 'pending')
  );
  const avgWait = avgWaitMinutes(orders);

  const clockStr = clock.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const dateStr = clock.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-xl">Memuat stasiun {stationCode}…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
          <p className="text-2xl font-bold">Stasiun tidak ditemukan</p>
          <p className="text-gray-400">{error}</p>
          <p className="text-gray-500">Kode stasiun: <span className="font-mono text-white">{stationCode}</span></p>
          <button onClick={() => fetchData(false)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col select-none">
      {/* ── Header ── */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 rounded-xl text-white">
            {TYPE_ICON[stationData?.type] || <ChefHat className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {stationData?.name || stationCode}
            </h1>
            {stationData?.branch_name && (
              <p className="text-xs text-amber-400 font-medium">{stationData.branch_name}</p>
            )}
            <p className="text-xs text-gray-400">{dateStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats bar */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-3xl font-black text-yellow-400 leading-none">{pendingOrders.length}</p>
              <p className="text-xs text-gray-400">Menunggu</p>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div className="text-center">
              <p className="text-3xl font-black text-blue-400 leading-none">{preparingOrders.length}</p>
              <p className="text-xs text-gray-400">Diproses</p>
            </div>
            <div className="w-px h-10 bg-gray-600" />
            <div className="text-center">
              <p className="text-3xl font-black text-white leading-none">{avgWait}</p>
              <p className="text-xs text-gray-400">Rata-rata (mnt)</p>
            </div>
          </div>

          <div className="w-px h-10 bg-gray-600 hidden sm:block" />

          {/* Clock */}
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-white">{clockStr}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundEnabled(s => !s)}
              title={soundEnabled ? 'Matikan suara' : 'Aktifkan suara'}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              {soundEnabled
                ? <Volume2 className="w-5 h-5 text-green-400" />
                : <VolumeX className="w-5 h-5 text-gray-500" />}
            </button>
            <button
              onClick={() => fetchData(false)}
              title="Refresh"
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className={cn('w-5 h-5 text-gray-300', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats bar (mobile) ── */}
      <div className="sm:hidden flex gap-4 bg-gray-800/80 px-6 py-2 border-b border-gray-700 text-sm">
        <span className="text-yellow-400 font-bold">{pendingOrders.length} menunggu</span>
        <span className="text-blue-400 font-bold">{preparingOrders.length} diproses</span>
        <span className="text-gray-400">{avgWait} mnt rata-rata</span>
      </div>

      {/* ── Orders grid ── */}
      <main className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
            <p className="text-3xl font-bold text-white">Semua Bersih!</p>
            <p className="text-gray-400 mt-2">Tidak ada pesanan aktif di stasiun ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
