import { useFetch } from '../hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ShoppingBag, Users, ClipboardList, TrendingUp, Coffee, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function StatCard({ icon: Icon, label, value, sub, color = 'bg-primary' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 flex items-start gap-4">
        <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-0.5">{value ?? '—'}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_LABEL = {
  pending: { label: 'Pending', cls: 'badge-status-pending' },
  preparing: { label: 'Diproses', cls: 'badge-status-preparing' },
  ready: { label: 'Siap', cls: 'badge-status-ready' },
  completed: { label: 'Selesai', cls: 'badge-status-completed' },
  cancelled: { label: 'Dibatalkan', cls: 'badge-status-cancelled' },
};

export default function DashboardPage() {
  const { data, loading } = useFetch('/dashboard/stats');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = data || {};
  const recentOrders = stats.recent_orders || [];
  const salesData = stats.sales_chart || [];
  const topProducts = stats.top_products || [];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Total Pesanan Hari Ini" value={stats.orders_today ?? 0} sub="Semua status" color="bg-primary" />
        <StatCard icon={TrendingUp} label="Revenue Hari Ini" value={stats.revenue_today ? `Rp ${Number(stats.revenue_today).toLocaleString('id')}` : 'Rp 0'} sub="Pesanan selesai" color="bg-emerald-600" />
        <StatCard icon={ClipboardList} label="Booking Aktif" value={stats.bookings_pending ?? 0} sub="Belum dikonfirmasi" color="bg-amber-500" />
        <StatCard icon={Users} label="Total Member" value={stats.total_users ?? 0} sub="Admin + Kasir + Member" color="bg-violet-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Sales chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Penjualan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => [`Rp ${Number(v).toLocaleString('id')}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="hsl(20 50% 32%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                <Coffee className="w-8 h-8 mr-2 opacity-30" />
                Belum ada data penjualan
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.slice(0, 6).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.total_sold} terjual</p>
                    </div>
                    <p className="text-xs font-semibold text-primary">
                      Rp {Number(p.revenue || 0).toLocaleString('id')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Belum ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map(order => {
                const s = STATUS_LABEL[order.order_status] || { label: order.order_status, cls: '' };
                return (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_name || 'Walk-in'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={s.cls}>{s.label}</span>
                      <p className="text-sm font-semibold">
                        Rp {Number(order.total_amount || 0).toLocaleString('id')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">Belum ada pesanan hari ini</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
