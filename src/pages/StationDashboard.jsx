import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { ChefHat, GlassWater, Clock, CheckCircle, AlertCircle, RefreshCw, Printer, Volume2, VolumeX, PlayCircle, Loader, MessageSquare, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff} detik lalu`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  return `${h} jam lalu`;
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
  } catch (_) { }
}

function ItemRow({ item, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState(item.station_notes || '');
  const [showCommentInput, setShowCommentInput] = useState(false);

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

  const handleSaveComment = async () => {
    setUpdating(true);
    try {
      await api.patch(`/stations/items/${item.id}/notes`, { station_notes: comment });
      setShowCommentInput(false);
      alert('Komentar berhasil dikirim ke kasir!');
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan komentar');
    } finally {
      setUpdating(false);
    }
  };

  const isPending = item.station_status === 'pending';
  const isPreparing = item.station_status === 'preparing';
  const isReady = item.station_status === 'ready';

  return (
    <div className={cn('flex flex-col gap-2 py-3 px-3 rounded-lg transition-colors', isReady ? 'bg-green-100/50 opacity-70' : 'bg-white border')}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-sm leading-tight', isReady ? 'text-green-700 line-through' : 'text-gray-900')}>
            <span className="text-primary mr-1">{item.quantity}×</span>
            {item.product_name}
          </p>
          {item.notes && <p className="text-xs text-orange-600 mt-0.5 italic">📝 {item.notes}</p>}
          {item.addons_selected && item.addons_selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.addons_selected.map((a, i) => {
                const name = typeof a === 'string' ? a : (a.addon_name || a.name || '');
                const qty = typeof a === 'object' && a.qty > 1 ? ` ×${a.qty}` : '';
                return (
                  <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    +{name}{qty}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2">
          {isReady ? (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Selesai
            </span>
          ) : (
            <div className="flex gap-1.5 flex-col items-end">
              <div className="flex gap-1.5">
                {isPending && (
                  <button disabled={updating} onClick={() => handleStatus('preparing')} className="px-3 py-1 rounded-md bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs transition-colors">
                    Proses
                  </button>
                )}
                {isPreparing && (
                  <button disabled={updating} onClick={() => handleStatus('ready')} className="px-3 py-1 rounded-md bg-green-500 hover:bg-green-400 text-white font-semibold text-xs transition-colors">
                    Selesai
                  </button>
                )}
              </div>
              <button onClick={() => setShowCommentInput(!showCommentInput)} className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                <MessageSquare className="w-3 h-3" /> {comment ? 'Edit Komentar' : 'Kirim Komentar'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showCommentInput && !isReady && (
        <div className="flex gap-2 mt-2">
          <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Catatan ke kasir..." className="flex-1 text-sm border rounded-md px-2 py-1" />
          <button disabled={updating} onClick={handleSaveComment} className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-xs font-semibold">Simpan</button>
        </div>
      )}
      {!showCommentInput && comment && (
         <p className="text-xs text-blue-700 bg-blue-50 p-1.5 rounded-md mt-1 border border-blue-100">Komentar: {comment}</p>
      )}
    </div>
  );
}

function OrderCard({ order, onItemStatusChange }) {
  const [items, setItems] = useState(order.items || []);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const handleItemStatus = (itemId, newStatus) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, station_status: newStatus } : it));
    onItemStatusChange && onItemStatusChange(itemId, newStatus);
  };

  const handleBulkStatus = async (targetStatus) => {
    const toUpdate = items.filter(it => targetStatus === 'preparing' ? it.station_status === 'pending' : it.station_status === 'preparing');
    if (!toUpdate.length) return;
    setBulkUpdating(true);
    try {
      await Promise.all(toUpdate.map(it => api.patch(`/stations/items/${it.id}/status`, { status: targetStatus })));
      setItems(prev => prev.map(it => toUpdate.find(u => u.id === it.id) ? { ...it, station_status: targetStatus } : it));
    } catch (err) {
      alert('Gagal update semua: ' + (err.response?.data?.error || err.message));
    } finally {
      setBulkUpdating(false);
    }
  };

  const allReady = items.length > 0 && items.every(it => it.station_status === 'ready');
  const pendingCount = items.filter(it => it.station_status === 'pending').length;
  const preparingCount = items.filter(it => it.station_status === 'preparing').length;

  if (allReady) return null; // hide immediately in dashboard view when all done? Actually keep it until refreshed is fine.

  return (
    <div className={cn('rounded-xl border flex flex-col overflow-hidden bg-white shadow-sm', pendingCount > 0 ? 'border-yellow-300' : 'border-blue-300')}>
      <div className={cn('px-4 py-2 flex items-center justify-between', pendingCount > 0 ? 'bg-yellow-50' : 'bg-blue-50')}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg text-gray-900 tracking-tight">#{order.order_number}</span>
          <div className="flex gap-1">
            {order.table_number && <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full font-medium">Meja {order.table_number}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" /> {timeAgo(order.created_at)}</span>
        </div>
      </div>

      <div className="flex gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
        {pendingCount > 0 && (
          <button disabled={bulkUpdating} onClick={() => handleBulkStatus('preparing')} className="flex-1 py-1.5 rounded-md bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
            {bulkUpdating ? <Loader className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
            Proses Semua ({pendingCount})
          </button>
        )}
        {preparingCount > 0 && pendingCount === 0 && (
          <button disabled={bulkUpdating} onClick={() => handleBulkStatus('ready')} className="flex-1 py-1.5 rounded-md bg-green-500 hover:bg-green-400 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5">
            {bulkUpdating ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Selesai Semua ({preparingCount})
          </button>
        )}
      </div>

      <div className="flex-1 p-2 space-y-2">
        {items.map(item => (
          <ItemRow key={item.id} item={item} onStatusChange={handleItemStatus} />
        ))}
      </div>
    </div>
  );
}

export default function StationDashboard() {
  const { user } = useAuth();
  const stationCode = user?.station?.code;
  const [activeTab, setActiveTab] = useState('queue');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const [lastOrderCount, setLastOrderCount] = useState(null);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const fetchData = useCallback(async (silent = false) => {
    if (!stationCode) return;
    if (!silent) setRefreshing(true);
    try {
      if (activeTab === 'queue') {
        const res = await api.get(`/stations/display/${stationCode}`);
        const newOrders = res.data.orders || [];
        setOrders(newOrders);
        setLastOrderCount(prev => {
          if (prev !== null && newOrders.length > prev && soundEnabledRef.current) beep();
          return newOrders.length;
        });
      } else {
        const res = await api.get(`/stations/my-products`);
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stationCode, activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab !== 'queue') return;
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [fetchData, activeTab]);

  const handleStockUpdate = async (productId, newStock) => {
    try {
      await api.patch(`/stations/products/${productId}/stock`, { stock: newStock });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
    } catch (err) {
      alert('Gagal update stok: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!stationCode) {
    return <div className="p-8 text-center text-gray-500">Anda tidak ditugaskan ke stasiun (station) apa pun.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard {user.station.name}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg bg-white border shadow-sm">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-green-600" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
          <button onClick={() => fetchData(false)} className="p-2 rounded-lg bg-white border shadow-sm">
            <RefreshCw className={cn('w-4 h-4 text-gray-600', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b">
        <button onClick={() => setActiveTab('queue')} className={cn("pb-2 font-medium text-sm transition-colors", activeTab === 'queue' ? 'border-b-2 border-primary text-primary' : 'text-gray-500')}>Task Queue</button>
        <button onClick={() => setActiveTab('stock')} className={cn("pb-2 font-medium text-sm transition-colors", activeTab === 'stock' ? 'border-b-2 border-primary text-primary' : 'text-gray-500')}>Update Stok</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : activeTab === 'queue' ? (
        orders.filter(o => o.items?.some(i => i.station_status !== 'ready')).length === 0 ? (
          <div className="text-center py-20 bg-white border rounded-xl border-dashed">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-bold text-gray-900">Queue Bersih!</p>
            <p className="text-sm text-gray-500">Tidak ada pesanan tertunda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Stok Saat Ini</th>
                <th className="px-4 py-3 font-semibold w-40">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-1 rounded-md font-bold text-xs", p.stock > 10 ? 'bg-green-100 text-green-800' : p.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>
                      {p.stock === null ? '∞' : p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" defaultValue={p.stock || ''} placeholder="Tak terbatas" onBlur={e => {
                      const v = e.target.value === '' ? null : parseInt(e.target.value);
                      if (v !== p.stock) handleStockUpdate(p.id, v);
                    }} className="w-full border rounded-md px-2 py-1 text-sm" />
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada produk yang di-assign ke stasiun ini.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
