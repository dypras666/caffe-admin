import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { useToast } from '../components/ui/toast';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  CalendarDays, Clock, Users, Plus, Check, Loader2, Search,
  Phone, MessageSquare, AlertCircle, CheckCircle2, XCircle, ArrowRight,
  Filter, Tag, DollarSign, RefreshCw, Wallet, CreditCard, Trash2, QrCode, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { smartPrint, buildReceiptHTML } from '../lib/printer';

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

const SERVICE_STATUS_BADGE = {
  pending: { label: 'Menunggu Jadwal', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Dikonfirmasi', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
  in_progress: { label: 'Sedang Berlangsung', cls: 'bg-purple-100 text-purple-800 border-purple-300' },
  completed: { label: 'Selesai', cls: 'bg-green-100 text-green-800 border-green-300' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-red-100 text-red-800 border-red-300' },
};

const generateDynamicQris = (qris, amount) => {
  if (!qris) return '';
  let amtStr = amount.toString();
  if (amtStr.includes('.')) amtStr = amount.toFixed(0);
  
  let idx = 0;
  const tags = {};
  while (idx < qris.length) {
    const tag = qris.substring(idx, idx + 2);
    const len = parseInt(qris.substring(idx + 2, idx + 4), 10);
    if (isNaN(len)) break;
    const val = qris.substring(idx + 4, idx + 4 + len);
    tags[tag] = val;
    idx += 4 + len;
  }
  
  tags['01'] = '12';
  tags['54'] = amtStr;
  
  let newQris = '';
  for (let i = 0; i < 63; i++) {
    const t = i.toString().padStart(2, '0');
    if (tags[t]) {
      const v = tags[t];
      newQris += t + v.length.toString().padStart(2, '0') + v;
    }
  }
  
  newQris += '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < newQris.length; i++) {
    crc ^= (newQris.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  
  return newQris + crc.toString(16).toUpperCase().padStart(4, '0');
};

export default function ServicesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tabType, setTabType] = useState('all'); // 'all' | 'booking' | 'preorder' | 'service'
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openCreate, setOpenCreate] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Settle / Pelunasan Dialog State
  const [openSettle, setOpenSettle] = useState(false);
  const [settleOrder, setSettleOrder] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('cash');
  const [settleNotes, setSettleNotes] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleHistory, setSettleHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form order layanan baru
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    order_type: 'booking',
    product_id: '',
    service_date: new Date().toISOString().split('T')[0],
    service_time: '14:00',
    service_person_count: '2',
    notes: '',
    payment_mode: 'dp', // 'pending' | 'dp' | 'paid'
    dp_amount: '',
    payment_method: 'cash',
  });

  // Query orders that are services
  const qsParams = new URLSearchParams({
    page: String(page),
    limit: '20',
  });
  if (tabType !== 'all') qsParams.append('order_type', tabType);
  if (statusFilter !== 'all') qsParams.append('service_status', statusFilter);
  if (search) qsParams.append('search', search);

  const { data, loading, refetch } = useFetch(`/orders?${qsParams.toString()}`);
  const statsQs = new URLSearchParams();
  if (tabType !== 'all') statsQs.append('order_type', tabType);
  const { data: statsData, refetch: refetchStats } = useFetch(`/orders/services/stats${statsQs.toString() ? `?${statsQs.toString()}` : ''}`);
  const { data: prodData } = useFetch('/products?product_type=service&limit=100');
  const { data: payMethodsData } = useFetch('/payments/methods');
  const { data: settingsData } = useFetch('/settings');
  
  const paymentMethods = (payMethodsData?.methods || payMethodsData || []).filter(m => m.is_active !== 0);
  const settings = (settingsData?.settings || []).reduce((a, s) => ({ ...a, [s.setting_key]: s.setting_value }), {});

  const stats = statsData || {
    total: 0, pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0,
    total_value: 0, total_paid: 0, total_remaining: 0
  };

  const refreshAll = () => {
    refetch();
    refetchStats();
  };

  const [qrisUniqueCode, setQrisUniqueCode] = useState(0);

  // When settleMethod changes to 'qris', fetch unique code
  useEffect(() => {
    if (settleMethod === 'qris') {
      api.get('/orders/qris/unique-code').then(res => {
        setQrisUniqueCode(res.data?.unique_code || 0);
      }).catch(console.error);
    } else {
      setQrisUniqueCode(0);
    }
  }, [settleMethod]);

  const handlePrintNota = async (orderId) => {
    try {
      const r = await api.get(`/printers/receipt/${orderId}`);
      await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mencetak nota');
    }
  };

  const handleSendWA = (order) => {
    let text = `*Bukti Pemesanan / Tagihan*\n`;
    text += `No. Order: ${order.order_number}\n`;
    text += `Nama: ${order.customer_name || '-'}\n`;
    text += `Tgl: ${formatDate(order.created_at)}\n\n`;
    
    text += `Total Tagihan: ${formatRp(order.total || order.total_amount)}\n`;
    text += `Sudah Dibayar: ${formatRp(order.paid_amount || order.dp_amount || 0)}\n`;
    const sisa = ((order.total || order.total_amount) - (order.paid_amount || 0));
    text += `Sisa Pembayaran: ${formatRp(sisa)}\n\n`;
    text += `Terima kasih!`;

    const phone = order.customer_phone ? order.customer_phone.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    if (!phone) {
      toast.error("Nomor WA pelanggan tidak tersedia!");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Filter orders to only service/booking/preorder or those with service_date
  const allOrders = data?.orders || [];
  const serviceOrders = allOrders.filter(o => 
    ['booking', 'preorder', 'service'].includes(o.order_type) || o.service_date
  );

  const serviceProducts = prodData?.products || [];

  const openSettleDialog = async (order) => {
    setSettleOrder(order);
    const rem = Number(order.remaining_amount != null ? order.remaining_amount : (order.total - (order.paid_amount || 0)));
    setSettleAmount(String(rem > 0 ? rem : order.total));
    setSettleMethod('cash');
    setSettleNotes('');
    setSettleHistory([]);
    setOpenSettle(true);
    
    // Ambil riwayat pembayaran
    setLoadingHistory(true);
    try {
      const res = await api.get(`/orders/${order.id}`);
      if (res.data?.order?.payments) {
        setSettleHistory(res.data.order.payments);
      }
    } catch (e) {
      console.error('Failed to load payment history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Hapus riwayat pembayaran ini?')) return;
    try {
      await api.delete(`/orders/${settleOrder.id}/payments/${paymentId}`);
      toast.success('Riwayat pembayaran dihapus');
      // Refresh order list to update stats
      refreshAll();
      // Reload history to reflect changes in dialog
      const res = await api.get(`/orders/${settleOrder.id}`);
      if (res.data?.order?.payments) {
        setSettleHistory(res.data.order.payments);
      }
      
      // Update local settleOrder stats roughly (will be accurately updated when list refetches)
      const newRem = res.data?.order?.remaining_amount;
      const newPaid = res.data?.order?.paid_amount;
      setSettleOrder(prev => ({ ...prev, remaining_amount: newRem, paid_amount: newPaid }));
      setSettleAmount(String(newRem > 0 ? newRem : res.data?.order?.total));
      
    } catch (e) {
      toast.error(e.response?.data?.error || 'Gagal menghapus riwayat');
    }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleOrder) return;
    const baseAmt = parseFloat(settleAmount) || 0;
    const amt = settleMethod === 'qris' ? baseAmt + qrisUniqueCode : baseAmt;
    if (amt <= 0) {
      toast.warning('Nominal pelunasan harus lebih dari 0');
      return;
    }
    setSettling(true);
    try {
      await api.post(`/orders/${settleOrder.id}/settle`, {
        amount: amt,
        payment_method: settleMethod,
        notes: settleNotes || undefined,
      });
      toast.success('Pelunasan berhasil diproses & dicatat ke shift kasir!');
      setOpenSettle(false);
      setSettleOrder(null);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal memproses pelunasan');
    } finally {
      setSettling(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/service-status`, { service_status: newStatus });
      toast.success('Status layanan berhasil diubah');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal mengubah status layanan');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!form.product_id) {
      toast.warning('Pilih item layanan terlebih dahulu');
      return;
    }
    const selectedProd = serviceProducts.find(p => String(p.id) === String(form.product_id));
    if (!selectedProd) {
      toast.error('Layanan tidak ditemukan');
      return;
    }

    const prodPrice = parseFloat(selectedProd.price || 0);
    const dpVal = parseFloat(form.dp_amount) || 0;

    if (form.payment_mode === 'dp') {
      if (dpVal <= 0) {
        toast.warning('Masukkan nominal DP yang valid');
        return;
      }
      if (dpVal >= prodPrice) {
        toast.warning('Nominal DP harus lebih kecil dari total harga. Pilih opsi "Bayar Lunas" jika membayar penuh.');
        return;
      }
    }

    setCreating(true);
    try {
      const payload = {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || undefined,
        customer_email: form.customer_email || undefined,
        order_type: form.order_type,
        service_date: form.service_date,
        service_time: form.service_time,
        service_person_count: parseInt(form.service_person_count || '1'),
        service_status: 'pending',
        payment_method: form.payment_method,
        payment_status: form.payment_mode === 'pending' ? 'pending' : form.payment_mode === 'dp' ? 'partial' : 'paid',
        dp_amount: form.payment_mode === 'dp' ? dpVal : undefined,
        notes: form.notes,
        items: [
          {
            product_id: selectedProd.id,
            quantity: 1,
            notes: form.notes || undefined,
            service_date: form.service_date,
            service_time: form.service_time,
          }
        ]
      };

      await api.post('/orders', payload);
      toast.success('Pesanan layanan berhasil dibuat!');
      setOpenCreate(false);
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        order_type: 'booking',
        product_id: '',
        service_date: new Date().toISOString().split('T')[0],
        service_time: '14:00',
        service_person_count: '2',
        notes: '',
        payment_mode: 'dp',
        dp_amount: '',
        payment_method: 'cash',
      });
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuat order layanan');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Manajemen Layanan & Booking</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau dan proses pesanan reservasi meja, ruangan, pre-order terjadwal, dan pesanan jasa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshAll()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button onClick={() => setOpenCreate(true)} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4" />
            + Buat Order Layanan Baru
          </Button>
        </div>
      </div>

      {/* Status Summary Cards (Total Data, Pending, Konfirmasi, Dikerjakan, Selesai, Dibatalkan) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Data */}
        <div
          onClick={() => { setStatusFilter('all'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20 dark:bg-slate-100 dark:text-slate-900'
              : 'bg-card text-card-foreground border-border hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'all' ? 'text-slate-300 dark:text-slate-600' : 'text-muted-foreground'}`}>
              Total Data
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'all' ? 'bg-white/10 dark:bg-slate-900/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
              <CalendarDays className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.total || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'all' ? 'text-slate-300/80 dark:text-slate-600' : 'text-muted-foreground'}`}>
            {formatRp(stats.total_value || 0)}
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-card text-card-foreground border-border hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
              Pending
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'pending' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.pending || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'pending' ? 'text-amber-100' : 'text-muted-foreground'}`}>
            Menunggu Jadwal
          </div>
        </div>

        {/* Konfirmasi */}
        <div
          onClick={() => { setStatusFilter('confirmed'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'confirmed'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-600/20'
              : 'bg-card text-card-foreground border-border hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'confirmed' ? 'text-blue-100' : 'text-blue-700 dark:text-blue-400'}`}>
              Konfirmasi
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'confirmed' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.confirmed || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'confirmed' ? 'text-blue-100' : 'text-muted-foreground'}`}>
            Dikonfirmasi
          </div>
        </div>

        {/* Kerjakan / Sedang Berlangsung */}
        <div
          onClick={() => { setStatusFilter('in_progress'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'in_progress'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-600/20'
              : 'bg-card text-card-foreground border-border hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'in_progress' ? 'text-purple-100' : 'text-purple-700 dark:text-purple-400'}`}>
              Dikerjakan
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'in_progress' ? 'bg-white/20' : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'}`}>
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.in_progress || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'in_progress' ? 'text-purple-100' : 'text-muted-foreground'}`}>
            Sedang Berlangsung
          </div>
        </div>

        {/* Selesai */}
        <div
          onClick={() => { setStatusFilter('completed'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-600/20'
              : 'bg-card text-card-foreground border-border hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
              Selesai
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'completed' ? 'bg-white/20' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}`}>
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.completed || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
            Layanan Tuntas
          </div>
        </div>

        {/* Dibatalkan */}
        <div
          onClick={() => { setStatusFilter('cancelled'); setPage(1); }}
          className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${
            statusFilter === 'cancelled'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-600/20'
              : 'bg-card text-card-foreground border-border hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${statusFilter === 'cancelled' ? 'text-rose-100' : 'text-rose-700 dark:text-rose-400'}`}>
              Dibatalkan
            </span>
            <span className={`p-1.5 rounded-lg ${statusFilter === 'cancelled' ? 'bg-white/20' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'}`}>
              <XCircle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {stats.cancelled || 0}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${statusFilter === 'cancelled' ? 'text-rose-100' : 'text-muted-foreground'}`}>
            Order Batal
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
        {/* Type Tabs */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => { setTabType('all'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tabType === 'all' ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Semua Layanan
          </button>
          <button
            type="button"
            onClick={() => { setTabType('booking'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tabType === 'booking' ? 'bg-background shadow-sm text-blue-600 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Booking / Reservasi
          </button>
          <button
            type="button"
            onClick={() => { setTabType('preorder'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tabType === 'preorder' ? 'bg-background shadow-sm text-amber-600 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Pre-Order
          </button>
          <button
            type="button"
            onClick={() => { setTabType('service'); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tabType === 'service' ? 'bg-background shadow-sm text-purple-600 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Jasa Lainnya
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari order / nama / no HP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="Status Layanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu Jadwal</SelectItem>
              <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
              <SelectItem value="in_progress">Sedang Berlangsung</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : serviceOrders.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold text-base text-foreground">Belum ada pesanan layanan atau booking</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Layanan yang dipesan oleh pelanggan atau kasir akan muncul di sini dengan detail jadwal dan status pengerjaan.
              </p>
              <Button onClick={() => setOpenCreate(true)} className="mt-4 gap-1.5" size="sm">
                <Plus className="w-4 h-4" /> Buat Order Sekarang
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order & Jadwal</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Tipe & Layanan</TableHead>
                    <TableHead>Total & Bayar</TableHead>
                    <TableHead>Status Layanan</TableHead>
                    <TableHead className="text-right">Ubah Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceOrders.map(o => {
                    const st = SERVICE_STATUS_BADGE[o.service_status || 'pending'] || SERVICE_STATUS_BADGE.pending;
                    const isPaid = o.payment_status === 'paid';
                    const orderTypeLabel = o.order_type === 'booking' ? 'Booking' : o.order_type === 'preorder' ? 'Pre-Order' : 'Layanan';

                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30">
                        {/* Order & Jadwal */}
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-mono text-xs font-bold text-primary">{o.order_number}</span>
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                              <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{formatDate(o.service_date || o.created_at)}</span>
                              {o.service_time && (
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-mono text-[11px]">
                                  {o.service_time}
                                </span>
                              )}
                            </div>
                            {o.service_person_count && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{o.service_person_count} Orang / Tamu</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Pelanggan */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{o.customer_name || 'Pelanggan Umum'}</p>
                            {o.customer_phone ? (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs text-muted-foreground">{o.customer_phone}</span>
                                <a
                                  href={`https://wa.me/${o.customer_phone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Chat WhatsApp"
                                  className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Tipe & Layanan */}
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={`text-[10px] font-mono uppercase ${
                              o.order_type === 'booking' ? 'border-blue-400 text-blue-700 bg-blue-50' :
                              o.order_type === 'preorder' ? 'border-amber-400 text-amber-700 bg-amber-50' :
                              'border-purple-400 text-purple-700 bg-purple-50'
                            }`}>
                              {orderTypeLabel}
                            </Badge>
                            {o.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]" title={o.notes}>
                                "{o.notes}"
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Total & Bayar */}
                        <TableCell>
                          <div>
                            <p className="font-bold text-sm">{formatRp(o.total || o.total_amount)}</p>
                            {isPaid ? (
                              <Badge variant="success" className="text-[10px] mt-0.5 bg-green-100 text-green-800 border-green-300">
                                Lunas
                              </Badge>
                            ) : o.payment_status === 'partial' ? (
                              <div className="space-y-1 mt-1">
                                <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                                  DP: {formatRp(o.paid_amount || o.dp_amount)}
                                </Badge>
                                <p className="text-[11px] font-bold text-amber-700">
                                  Sisa: {formatRp(o.remaining_amount != null ? o.remaining_amount : (o.total - (o.paid_amount || 0)))}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSettleDialog(o)}
                                  className="h-6 text-[10px] px-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 font-semibold"
                                >
                                  <Wallet className="w-3 h-3" /> Pelunasan
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-1 mt-1">
                                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                                  Belum Bayar
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSettleDialog(o)}
                                  className="h-6 text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 flex items-center gap-1 font-semibold"
                                >
                                  <CreditCard className="w-3 h-3" /> Bayar / Pelunasan
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Status Layanan */}
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                            {st.label}
                          </span>
                        </TableCell>

                        {/* Aksi Ubah Status */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="outline" className="w-8 h-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => handlePrintNota(o.id)} title="Cetak Nota">
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="w-8 h-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleSendWA(o)} title="Kirim WA">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Select
                              disabled={updatingId === o.id}
                              value={o.service_status || 'pending'}
                              onValueChange={(val) => handleStatusChange(o.id, val)}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Menunggu</SelectItem>
                                <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                                <SelectItem value="in_progress">Dikerjakan</SelectItem>
                                <SelectItem value="completed">Selesai</SelectItem>
                                <SelectItem value="cancelled">Batalkan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Buat Order Layanan Baru */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Buat Order Layanan / Booking Baru
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Jenis Layanan */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Jenis Layanan *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'booking', label: 'Booking / Meja' },
                    { id: 'preorder', label: 'Pre-Order' },
                    { id: 'service', label: 'Jasa / Lainnya' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, order_type: t.id }))}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                        form.order_type === t.id ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-600' : 'border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih Item Layanan (from products table where product_type = 'service') */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Pilih Layanan (Tabel Produk) *</label>
                <Select
                  value={form.product_id}
                  onValueChange={v => setForm(f => ({ ...f, product_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="-- Pilih Layanan --" /></SelectTrigger>
                  <SelectContent>
                    {serviceProducts.length === 0 ? (
                      <SelectItem value="_empty" disabled>Belum ada item layanan di menu Produk</SelectItem>
                    ) : (
                      serviceProducts.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} — {formatRp(p.price)} {p.duration_minutes ? `(${p.duration_minutes} mnt)` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {serviceProducts.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Tip: Tambahkan produk dengan tipe "Layanan / Jasa" di menu <strong>Produk</strong> terlebih dahulu.
                  </p>
                )}
              </div>

              {/* Tanggal & Jam */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal Layanan *</label>
                <Input
                  type="date"
                  value={form.service_date}
                  onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Jam Layanan *</label>
                <Input
                  type="time"
                  value={form.service_time}
                  onChange={e => setForm(f => ({ ...f, service_time: e.target.value }))}
                  required
                />
              </div>

              {/* Data Pelanggan */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Pelanggan *</label>
                <Input
                  placeholder="Nama pemesan"
                  value={form.customer_name}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">No. WhatsApp / HP</label>
                <Input
                  placeholder="0812xxxx"
                  value={form.customer_phone}
                  onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                />
              </div>

              {/* Jumlah Orang / Tamu */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah Orang / Porsi</label>
                <Input
                  type="number"
                  min="1"
                  value={form.service_person_count}
                  onChange={e => setForm(f => ({ ...f, service_person_count: e.target.value }))}
                />
              </div>
              {/* Metode Pembayaran */}
              <div className="col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1 block">Metode Pembayaran</label>
                <Select
                  value={form.payment_method}
                  onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.code}>{pm.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="transfer">Transfer Bank</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Opsi Pembayaran & DP */}
              <div className="col-span-2 bg-muted/40 p-3 rounded-xl border space-y-2.5">
                <label className="text-xs font-bold text-foreground block">Sistem Pembayaran / Uang Muka (DP)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'dp', label: 'Bayar DP (Uang Muka)' },
                    { id: 'paid', label: 'Bayar Lunas' },
                    { id: 'pending', label: 'Bayar Nanti' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        const curProd = serviceProducts.find(p => String(p.id) === String(form.product_id));
                        const price = curProd ? parseFloat(curProd.price || 0) : 0;
                        setForm(f => ({
                          ...f,
                          payment_mode: m.id,
                          dp_amount: m.id === 'dp' && !f.dp_amount && price > 0 ? String(Math.round(price * 0.3)) : f.dp_amount
                        }));
                      }}
                      className={`py-1.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                        form.payment_mode === m.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-600'
                          : 'border-input hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {form.payment_mode === 'dp' && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Nominal Uang Muka (DP):</span>
                      {form.product_id && (
                        <div className="flex gap-1.5">
                          {[
                            { pct: 0.2, label: '20%' },
                            { pct: 0.3, label: '30%' },
                            { pct: 0.5, label: '50%' }
                          ].map(c => {
                            const curProd = serviceProducts.find(p => String(p.id) === String(form.product_id));
                            const pPrice = curProd ? parseFloat(curProd.price || 0) : 0;
                            return (
                              <button
                                key={c.label}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, dp_amount: String(Math.round(pPrice * c.pct)) }))}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted hover:bg-emerald-100 hover:text-emerald-800 border"
                              >
                                {c.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                      <Input
                        type="number"
                        placeholder="Contoh: 50000"
                        value={form.dp_amount}
                        onChange={e => setForm(f => ({ ...f, dp_amount: e.target.value }))}
                        className="pl-8 text-xs font-bold h-9"
                        required={form.payment_mode === 'dp'}
                      />
                    </div>
                    {form.product_id && (
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground bg-background px-2.5 py-1.5 rounded-lg border">
                        <span>Sisa Pelunasan Nanti:</span>
                        <span className="font-bold text-amber-700">
                          {(() => {
                            const curProd = serviceProducts.find(p => String(p.id) === String(form.product_id));
                            const pPrice = curProd ? parseFloat(curProd.price || 0) : 0;
                            const dp = parseFloat(form.dp_amount) || 0;
                            return formatRp(Math.max(0, pPrice - dp));
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan / Permintaan Khusus</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Meja dekat jendela, request hiasan kue ultah, dsb."
                  className="w-full text-xs rounded-lg border border-input p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Simpan & Buat Order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Pelunasan */}
      <Dialog open={openSettle} onOpenChange={setOpenSettle}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Pelunasan Pesanan — {settleOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettle} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 text-xs border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan:</span>
                  <span className="font-semibold">{settleOrder?.customer_name || 'Pelanggan Umum'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tagihan:</span>
                  <span className="font-bold">{formatRp(settleOrder?.total)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Sudah Dibayar (DP):</span>
                  <span className="font-bold">{formatRp(settleOrder?.paid_amount || settleOrder?.dp_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold border-t pt-2 text-sm">
                  <span>Sisa Tagihan:</span>
                  <span>{formatRp(settleOrder?.remaining_amount != null ? settleOrder.remaining_amount : (settleOrder?.total - (settleOrder?.paid_amount || 0)))}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Metode Pembayaran Pelunasan *</label>
                <Select value={settleMethod} onValueChange={setSettleMethod}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.code}>{pm.name}</SelectItem>
                    )) : (
                      <>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="transfer">Transfer Bank</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Nominal Pembayaran Pelunasan *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">Rp</span>
                  <Input
                    type="text"
                    value={settleAmount ? Number(settleAmount).toLocaleString('id') : ''}
                    onChange={e => setSettleAmount(e.target.value.replace(/\D/g, ''))}
                    className="pl-8 text-sm font-bold h-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Pelunasan (Opsional)</label>
                <Input
                  placeholder="Contoh: Pelunasan saat check-in tamu / serah terima kue"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* QRIS Code (if selected) */}
              {settleMethod === 'qris' && (
                <div className="border rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    Pembayaran QRIS
                  </p>
                  {settings?.qris_string ? (
                    <div className="bg-white p-3 rounded-xl shadow-sm border mb-2">
                      <QRCodeSVG value={generateDynamicQris(settings.qris_string, (Number(settleAmount) || 0) + qrisUniqueCode)} size={160} level="M" />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-slate-200 rounded-xl flex flex-col items-center justify-center mb-2">
                      <CreditCard className="w-10 h-10 text-slate-400 mb-2" />
                      <span className="text-[10px] text-slate-500 text-center px-4">String QRIS Belum Dikonfigurasi</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center font-medium">
                    {formatRp((Number(settleAmount) || 0) + qrisUniqueCode)}
                  </p>
                  {qrisUniqueCode > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mt-1 font-semibold text-center">
                      Termasuk Kode Unik: +{qrisUniqueCode}
                    </span>
                  )}
                </div>
              )}

              {/* Riwayat Pembayaran */}
              {loadingHistory ? (
                <div className="flex justify-center py-4 border rounded-xl"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : settleHistory.length > 0 ? (
                <div className="space-y-2 border rounded-xl p-3.5 bg-muted/20">
                  <label className="text-xs font-semibold text-foreground mb-1 block">Riwayat Pembayaran</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {settleHistory.map((pay) => (
                      <div key={pay.id} className="flex justify-between items-center text-xs p-2.5 bg-white border rounded-lg shadow-sm">
                        <div>
                          <div className="font-semibold text-foreground">
                            {pay.payment_type === 'dp' ? 'Uang Muka (DP)' : pay.payment_type === 'settlement' ? 'Pelunasan' : 'Pembayaran'} — <span className="uppercase text-emerald-700">{pay.payment_method}</span>
                          </div>
                          <div className="text-muted-foreground text-[10px] mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(pay.created_at)} {new Date(pay.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {pay.notes && <div className="text-[10px] italic text-muted-foreground mt-1">"{pay.notes}"</div>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground">
                            {formatRp(pay.amount)}
                          </span>
                          {user?.role === 'admin' && (
                            <Button variant="ghost" size="icon" type="button" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => handleDeletePayment(pay.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic text-center p-4 border rounded-xl bg-slate-50/50">
                  Belum ada riwayat pembayaran.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenSettle(false)}>Batal</Button>
              <Button type="submit" disabled={settling} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                {settling && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Konfirmasi Pelunasan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
