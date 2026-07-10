import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useShiftGuard } from '../hooks/useShiftGuard';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { buildReceiptHTML, buildKitchenHTML, smartPrint } from '../lib/printer';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import {
  Loader2, RefreshCw, Users, ShoppingBag, Receipt, Utensils,
  ChevronRight, Clock, Check, X, Printer, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TABLE_STATUS_STYLE = {
  available:   { bg: 'bg-green-50 border-green-300 hover:bg-green-100',   dot: 'bg-green-500',  label: 'Tersedia' },
  occupied:    { bg: 'bg-red-50 border-red-300 hover:bg-red-100',         dot: 'bg-red-500',    label: 'Terisi' },
  reserved:    { bg: 'bg-amber-50 border-amber-300 hover:bg-amber-100',   dot: 'bg-amber-500',  label: 'Dipesan' },
  maintenance: { bg: 'bg-gray-50 border-gray-300',                         dot: 'bg-gray-400',   label: 'Perawatan' },
};

const ORDER_STATUS_CLS = {
  pending:   'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready:     'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};
const ORDER_STATUS_LABEL = {
  pending: 'Pending', preparing: 'Diproses', ready: 'Siap', completed: 'Selesai', cancelled: 'Batal',
};
const NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'completed' };

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatTime(d) { return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }

export default function TableOrderPage() {
  const { user: currentUser } = useAuth();
  const { shiftRequired } = useShiftGuard();
  const [roomFilter, setRoomFilter] = useState('all');
  const [selectedTable, setSelectedTable] = useState(null);
  const { data: tablesData, loading: loadingTables, refetch: refetchTables } = useFetch('/tables');
  const { data: roomsData } = useFetch('/rooms');
  const { data: branchesData } = useFetch('/branches');
  const currentBranch = currentUser?.branch_id
    ? (branchesData?.branches || []).find(b => b.id === currentUser.branch_id)
    : null;
  const navigate = useNavigate();

  const tables = tablesData?.tables || [];
  const rooms = roomsData?.rooms || [];
  const filtered = tables.filter(t => t.is_active && (roomFilter === 'all' || String(t.room_id) === roomFilter));

  // Active orders summary per table
  const { data: activeOrdersData, refetch: refetchOrders } = useFetch('/orders?status=pending&limit=100&page=1');
  const { data: preparingData } = useFetch('/orders?status=preparing&limit=100&page=1');
  const { data: readyData } = useFetch('/orders?status=ready&limit=100&page=1');

  const allActiveOrders = [
    ...(activeOrdersData?.orders || []),
    ...(preparingData?.orders || []),
    ...(readyData?.orders || []),
  ];

  // Map table_number → orders
  const tableOrders = allActiveOrders.reduce((acc, o) => {
    const key = o.table_number;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const refetchAll = () => { refetchTables(); refetchOrders(); };

  if (shiftRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="bg-card border rounded-2xl shadow p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <p className="font-semibold text-base">Shift Belum Dibuka</p>
          <p className="text-sm text-muted-foreground">Buka shift di halaman POS untuk mengakses Table Order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branch indicator */}
      {currentBranch && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="w-3.5 h-3.5" />
          <span className="font-medium text-foreground">{currentBranch.name}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setRoomFilter('all')}
            className={cn('px-3 py-1.5 text-xs rounded-lg font-medium transition-colors', roomFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
          >
            Semua Room
          </button>
          {rooms.map(r => (
            <button
              key={r.id}
              onClick={() => setRoomFilter(String(r.id))}
              className={cn('px-3 py-1.5 text-xs rounded-lg font-medium transition-colors', roomFilter === String(r.id) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
            >
              {r.name}
              <span className="ml-1 opacity-60">
                ({tables.filter(t => String(t.room_id) === String(r.id) && t.status === 'available').length} tersedia)
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={refetchAll} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/pos')} className="gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" />Buka POS
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
        {Object.entries(TABLE_STATUS_STYLE).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', v.dot)} />
            {v.label}
          </span>
        ))}
      </div>

      {/* Floor plan by room */}
      {loadingTables ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {rooms
            .filter(r => roomFilter === 'all' || String(r.id) === roomFilter)
            .map(room => {
              const roomTables = filtered.filter(t => t.room_id === room.id);
              if (!roomTables.length) return null;
              return (
                <div key={room.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-sm">{room.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {roomTables.filter(t => t.status === 'available').length}/{roomTables.length} tersedia
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {roomTables.map(table => {
                      const orders = tableOrders[table.table_number] || [];
                      const style = TABLE_STATUS_STYLE[table.status] || TABLE_STATUS_STYLE.available;
                      const totalBill = orders.reduce((s, o) => s + Number(o.total || 0), 0);
                      return (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTable(table)}
                          className={cn(
                            'relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md',
                            style.bg,
                            selectedTable?.id === table.id && 'ring-2 ring-primary ring-offset-1'
                          )}
                        >
                          <div className={cn('absolute top-2 right-2 w-2 h-2 rounded-full', style.dot)} />
                          <p className="font-bold text-sm">{table.table_number}</p>
                          {table.name && <p className="text-[10px] opacity-70 truncate">{table.name}</p>}
                          <div className="flex items-center gap-0.5 mt-1 text-[10px] opacity-60">
                            <Users className="w-2.5 h-2.5" />{table.capacity}
                          </div>
                          {orders.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              <div className="text-[10px] font-semibold">{orders.length} order</div>
                              <div className="text-[10px] font-bold text-primary">{formatRp(totalBill)}</div>
                              {/* Status pills */}
                              <div className="flex gap-0.5 flex-wrap">
                                {Object.entries(
                                  orders.reduce((acc, o) => { acc[o.order_status] = (acc[o.order_status] || 0) + 1; return acc; }, {})
                                ).map(([status, count]) => (
                                  <span key={status} className={cn('text-[8px] px-1 rounded-full font-medium', ORDER_STATUS_CLS[status])}>
                                    {count} {ORDER_STATUS_LABEL[status]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {/* Tables without room */}
          {(() => {
            const noRoom = filtered.filter(t => !t.room_id);
            if (!noRoom.length) return null;
            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Tanpa Room</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {noRoom.map(table => {
                    const orders = tableOrders[table.table_number] || [];
                    const style = TABLE_STATUS_STYLE[table.status] || TABLE_STATUS_STYLE.available;
                    return (
                      <button key={table.id} onClick={() => setSelectedTable(table)}
                        className={cn('rounded-xl border-2 p-3 text-left transition-all hover:shadow-md', style.bg)}>
                        <p className="font-bold text-sm">{table.table_number}</p>
                        <div className="flex items-center gap-0.5 mt-1 text-[10px] opacity-60"><Users className="w-2.5 h-2.5" />{table.capacity}</div>
                        {orders.length > 0 && <div className="text-[10px] font-semibold mt-1">{orders.length} order</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Table Detail Panel */}
      {selectedTable && (
        <TableDetailPanel
          table={selectedTable}
          orders={tableOrders[selectedTable.table_number] || []}
          onClose={() => setSelectedTable(null)}
          onRefresh={refetchAll}
          navigate={navigate}
        />
      )}
    </div>
  );
}

// ─── Table Detail Panel ───────────────────────────────────────
function TableDetailPanel({ table, orders, onClose, onRefresh, navigate }) {
  const [updatingId, setUpdatingId] = useState(null);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      onRefresh();
    } catch (err) { alert(err.response?.data?.error || 'Gagal'); }
    finally { setUpdatingId(null); }
  };

  const printReceipt = async (orderId) => {
    try {
      const r = await api.get(`/printers/receipt/${orderId}`);
      await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt');
    } catch { alert('Gagal print'); }
  };

  const printKitchen = async (orderId) => {
    try {
      const r = await api.get(`/printers/kitchen/${orderId}`);
      await smartPrint(buildKitchenHTML(r.data.ticket, r.data.printer), r.data.printer, 'kitchen');
    } catch { alert('Gagal print'); }
  };

  const style = TABLE_STATUS_STYLE[table.status] || TABLE_STATUS_STYLE.available;
  const totalBill = orders.reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <div className="fixed inset-y-0 right-0 w-80 xl:w-96 bg-card border-l shadow-2xl z-50 flex flex-col" style={{ top: '64px' }}>
      {/* Header */}
      <div className={cn('p-4 border-b', style.bg.split(' ')[0])}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', style.dot)} />
              <h3 className="font-bold text-lg">{table.table_number}</h3>
              {table.name && <span className="text-sm text-muted-foreground">{table.name}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{table.capacity} orang</span>
              <span>{style.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        {orders.length > 0 && (
          <div className="mt-2 pt-2 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{orders.length} order aktif</span>
            <span className="font-bold text-primary">{formatRp(totalBill)}</span>
          </div>
        )}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Tidak ada order aktif</p>
            <Button size="sm" className="mt-3 gap-1" onClick={() => { onClose(); navigate('/pos'); }}>
              <ShoppingBag className="w-3.5 h-3.5" />Buat Order
            </Button>
          </div>
        ) : (
          orders.map(order => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">{order.order_number}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{formatTime(order.created_at)}
                      {order.customer_name && ` · ${order.customer_name}`}
                    </p>
                  </div>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', ORDER_STATUS_CLS[order.order_status])}>
                    {ORDER_STATUS_LABEL[order.order_status]}
                  </span>
                </div>

                <div className="text-right font-bold text-sm text-primary mb-2">{formatRp(order.total)}</div>

                {/* Action buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {NEXT_STATUS[order.order_status] && (
                    <Button size="sm" className="text-[10px] h-7 px-2 flex-1" disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, NEXT_STATUS[order.order_status])}>
                      {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      {ORDER_STATUS_LABEL[NEXT_STATUS[order.order_status]]}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-2 gap-1" onClick={() => printReceipt(order.id)}>
                    <Receipt className="w-3 h-3" />Struk
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-2 gap-1" onClick={() => printKitchen(order.id)}>
                    <Utensils className="w-3 h-3" />Dapur
                  </Button>
                  {['pending', 'preparing'].includes(order.order_status) && (
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 px-2 text-destructive hover:bg-destructive/10"
                      disabled={updatingId === order.id}
                      onClick={() => { if (confirm('Batalkan order ini?')) updateStatus(order.id, 'cancelled'); }}>
                      Batal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t space-y-2">
        <Button
          className="w-full gap-1.5"
          onClick={() => { onClose(); navigate(`/pos?table_id=${table.id}&table_number=${table.table_number}`); }}
        >
          <ShoppingBag className="w-4 h-4" />Tambah Order ke Meja Ini
        </Button>
        {table.status === 'occupied' && orders.length === 0 && (
          <Button variant="outline" className="w-full text-xs gap-1" onClick={async () => {
            await api.patch(`/tables/${table.id}/status`, { status: 'available' });
            onRefresh();
          }}>
            Bebaskan Meja
          </Button>
        )}
      </div>
    </div>
  );
}
