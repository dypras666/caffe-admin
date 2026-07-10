import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Loader2, Clock, DollarSign, Printer, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/ui/toast';

const fmt = (v) => `Rp ${Number(v || 0).toLocaleString('id')}`;

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('id', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ─── Shift Report Dialog ─── */
function ShiftReportDialog({ shiftId, open, onClose }) {
  const { data, loading } = useFetch(open && shiftId ? `/shifts/${shiftId}/report` : null);

  const report = data?.report || data || {};
  const summary = report.summary || {};
  const paymentBreakdown = report.payment_breakdown || [];
  const topItems = report.top_items || [];
  const orders = report.orders || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Laporan Shift #{report.shift_number || shiftId}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5 print:space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Revenue', value: fmt(summary.total_revenue) },
                { label: 'Total Orders', value: Number(summary.total_orders || 0).toLocaleString('id') },
                { label: 'Kas Awal', value: fmt(summary.opening_cash) },
                { label: 'Selisih Kas', value: fmt(summary.cash_difference), diff: Number(summary.cash_difference || 0) },
              ].map(({ label, value, diff }) => (
                <div key={label} className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-base font-bold mt-0.5 ${diff !== undefined ? (diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : '') : ''}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Payment breakdown */}
            {paymentBreakdown.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Rincian Pembayaran</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs text-muted-foreground">Metode</th>
                      <th className="py-2 px-3 text-right text-xs text-muted-foreground">Transaksi</th>
                      <th className="py-2 px-3 text-right text-xs text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBreakdown.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3 capitalize">{p.method || p.payment_method}</td>
                        <td className="py-2 px-3 text-right">{Number(p.count || 0).toLocaleString('id')}</td>
                        <td className="py-2 px-3 text-right font-medium">{fmt(p.total || p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top items */}
            {topItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Item Terlaris</p>
                <div className="space-y-1.5">
                  {topItems.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b pb-1.5 last:border-0">
                      <span className="flex-1 truncate">{i + 1}. {item.name}</span>
                      <span className="text-muted-foreground text-xs mx-3">{Number(item.qty || item.qty_sold || 0)}x</span>
                      <span className="font-medium">{fmt(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash reconciliation */}
            {(summary.opening_cash !== undefined || summary.closing_cash !== undefined) && (
              <div>
                <p className="text-sm font-semibold mb-2">Rekonsiliasi Kas</p>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">Kas Awal</td>
                      <td className="py-2 px-3 text-right">{fmt(summary.opening_cash)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">Pendapatan Tunai</td>
                      <td className="py-2 px-3 text-right">{fmt(summary.cash_revenue)}</td>
                    </tr>
                    <tr className="border-b font-medium">
                      <td className="py-2 px-3 text-muted-foreground">Kas Diharapkan</td>
                      <td className="py-2 px-3 text-right">{fmt((Number(summary.opening_cash || 0) + Number(summary.cash_revenue || 0)))}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">Kas Aktual</td>
                      <td className="py-2 px-3 text-right">{fmt(summary.closing_cash)}</td>
                    </tr>
                    <tr className={Number(summary.cash_difference || 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-red-50 dark:bg-red-950/20'}>
                      <td className="py-2 px-3 font-semibold">Selisih</td>
                      <td className={`py-2 px-3 text-right font-bold ${Number(summary.cash_difference || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {Number(summary.cash_difference || 0) > 0 ? '+' : ''}{fmt(summary.cash_difference)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Orders list */}
            {orders.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Daftar Order ({orders.length})</p>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3 text-left">No. Order</th>
                        <th className="py-1.5 px-3 text-left">Waktu</th>
                        <th className="py-1.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={o.id || i} className="border-t">
                          <td className="py-1.5 px-3 font-mono">{o.order_number}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{formatDateTime(o.created_at)}</td>
                          <td className="py-1.5 px-3 text-right font-medium">{fmt(o.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button variant="outline" onClick={handlePrint} className="gap-1.5">
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button onClick={onClose}>Tutup</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Close Shift Dialog ─── */
function CloseShiftDialog({ shift, open, onClose, onSuccess }) {
  const toast = useToast();
  const [closingCash, setClosingCash] = useState('');
  const [handoverCash, setHandoverCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { shift, summary }

  const expectedCash = shift ? parseFloat(shift.live_expected_cash || shift.opening_cash || 0) : 0;
  const closingNum   = Number(closingCash) || 0;
  const diff         = closingCash !== '' ? closingNum - expectedCash : null;

  const handleClose = async () => {
    setLoading(true);
    try {
      const { data } = await api.put(`/shifts/${shift.id}/close`, {
        closing_cash:  closingNum,
        notes:         notes || undefined,
        handover_cash: handoverCash !== '' ? Number(handoverCash) : undefined,
      });
      setResult(data);
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menutup shift');
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setResult(null); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {result ? 'Shift Berhasil Ditutup' : `Tutup Shift — ${shift?.shift_number}`}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          /* ── Post-close result ── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Total Orders',     value: String(summary.total_orders) },
                { label: 'Total Revenue',    value: fmt(summary.total_revenue) },
                { label: 'Kas Awal',         value: fmt(summary.opening_cash) },
                { label: 'Kas Aktual',       value: fmt(summary.closing_cash) },
                { label: 'Kas Diharapkan',   value: fmt(summary.expected_cash) },
              ].map(({ label, value }) => (
                <div key={label} className="border rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-bold text-sm mt-0.5">{value}</p>
                </div>
              ))}
              <div className={`border rounded-lg p-2.5 text-center ${
                Number(summary.cash_difference) > 0 ? 'border-emerald-300 bg-emerald-50' :
                Number(summary.cash_difference) < 0 ? 'border-red-300 bg-red-50' : ''
              }`}>
                <p className="text-[10px] text-muted-foreground">Selisih Kas</p>
                <p className={`font-bold text-sm mt-0.5 ${Number(summary.cash_difference) > 0 ? 'text-emerald-600' : Number(summary.cash_difference) < 0 ? 'text-red-500' : ''}`}>
                  {Number(summary.cash_difference) > 0 ? '+' : ''}{fmt(summary.cash_difference)}
                </p>
              </div>
            </div>

            {summary.handover_cash !== null && summary.handover_cash !== undefined && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm">
                <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Diserahkan ke shift berikutnya:</span>
                <span className="font-bold text-primary ml-auto">{fmt(summary.handover_cash)}</span>
              </div>
            )}

            {summary.payment_breakdown?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Per Metode Bayar</p>
                <div className="space-y-1">
                  {summary.payment_breakdown.map(p => (
                    <div key={p.payment_method} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{p.payment_method} ({p.count}x)</span>
                      <span className="font-medium">{fmt(p.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => { setResult(null); onClose(); }}>Selesai</Button>
          </div>
        ) : (
          /* ── Close form ── */
          <div className="space-y-4">
            {/* Live preview */}
            <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Orders</p>
                <p className="font-bold text-base">{shift?.live_total_orders ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-bold text-sm">{fmt(shift?.live_total_revenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kas Diharapkan</p>
                <p className="font-bold text-sm">{fmt(expectedCash)}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Kas Aktual di Laci (Rp) *
              </label>
              <Input type="number" placeholder="0" value={closingCash}
                onChange={e => setClosingCash(e.target.value)} autoFocus />
              {diff !== null && (
                <p className={`text-xs mt-1 font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {diff === 0 ? 'Kas pas ✓' : `Selisih: ${diff > 0 ? '+' : ''}${fmt(diff)}`}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Kas Diserahkan ke Shift Berikutnya (Rp)
                <span className="font-normal ml-1 text-[10px]">opsional</span>
              </label>
              <Input type="number" placeholder="0 = tidak ada serah terima" value={handoverCash}
                onChange={e => setHandoverCash(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Catatan penutupan shift..."
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleClose} disabled={loading || closingCash === ''} variant="destructive" className="gap-1.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Tutup Shift
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main ShiftPage ─── */
export default function ShiftPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const { data: settingsData, loading: settingsLoading } = useFetch('/settings');
  const { data: currentShiftData, loading: currentShiftLoading, refetch: refetchCurrent } = useFetch('/shifts/current');
  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useFetch('/shifts?limit=10');
  const { data: stationsData } = useFetch('/stations');

  const [openingCash, setOpeningCash] = useState('');
  const [station, setStation] = useState('');
  const [notes, setNotes] = useState('');
  const [opening, setOpening] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reportDialogShiftId, setReportDialogShiftId] = useState(null);

  const settings = settingsData?.settings || [];
  const shiftEnabled = settings.find(s => s.setting_key === 'shift_enabled')?.setting_value === 'true';

  const currentShift = currentShiftData?.shift || currentShiftData || null;
  const hasOpenShift = !!(currentShift && currentShift.id && !currentShift.closed_at);

  const history = historyData?.shifts || [];
  const stations = stationsData?.stations || [];

  // Auto-suggest opening cash from last closed shift's handover_cash
  const lastClosed = history.find(s => s.status === 'closed' || s.closed_at);
  const suggestedCash = lastClosed?.handover_cash ? parseFloat(lastClosed.handover_cash) : null;

  const isLoading = settingsLoading || currentShiftLoading;

  const handleOpenShift = async () => {
    setOpening(true);
    try {
      await api.post('/shifts/open', {
        opening_cash: Number(openingCash) || 0,
        station_id: station || undefined,
        notes: notes || undefined,
      });
      setOpeningCash('');
      setStation('');
      setNotes('');
      refetchCurrent();
      refetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuka shift');
    } finally {
      setOpening(false);
    }
  };

  const handleCloseSuccess = () => {
    refetchCurrent();
    refetchHistory();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Shift not enabled ── */
  if (!shiftEnabled) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Clock className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold">Fitur Shift belum diaktifkan</p>
              <p className="text-sm text-muted-foreground mt-1">Aktifkan di <strong>Pengaturan &gt; POS</strong> untuk menggunakan manajemen shift.</p>
            </div>
            <Button onClick={() => navigate('/settings#pos')} variant="outline" className="w-full">
              Aktifkan Shift
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-lg font-semibold">Manajemen Shift</h1>

      {/* Open shift or current shift */}
      {!hasOpenShift ? (
        /* ── Buka Shift ── */
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardHeader>
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Buka Shift Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Kas Awal (Rp)</label>
                {suggestedCash !== null && openingCash === '' && (
                  <button type="button" onClick={() => setOpeningCash(String(suggestedCash))}
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    Pakai serah terima {fmt(suggestedCash)}
                  </button>
                )}
              </div>
              <Input
                type="number"
                placeholder="0"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
              />
            </div>
            {stations.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Stasiun (opsional)</label>
                <Select value={station} onValueChange={setStation}>
                  <SelectTrigger><SelectValue placeholder="Pilih stasiun..." /></SelectTrigger>
                  <SelectContent>
                    {stations.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name || s.station_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan pembukaan shift..."
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Button onClick={handleOpenShift} disabled={opening} className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Buka Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Current open shift ── */
        <Card className="border-amber-400 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Shift Sedang Berjalan
              </CardTitle>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300">Aktif</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Shift No</p>
                <p className="font-semibold font-mono">{currentShift.shift_number || `#${currentShift.id}`}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dibuka Oleh</p>
                <p className="font-semibold">{currentShift.opened_by_name || currentShift.user_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dibuka Pada</p>
                <p className="font-semibold">{formatDateTime(currentShift.opened_at || currentShift.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kas Awal</p>
                <p className="font-semibold">{fmt(currentShift.opening_cash)}</p>
              </div>
            </div>

            {/* Live stats */}
            {(currentShift.total_orders !== undefined || currentShift.total_revenue !== undefined) && (
              <div className="border rounded-lg p-3 bg-muted/30 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="font-bold">{fmt(currentShift.total_revenue)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="font-bold">{Number(currentShift.total_orders || 0).toLocaleString('id')}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setCloseDialogOpen(true)}
            >
              Tutup Shift
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shift history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Shift</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : history.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Belum ada riwayat shift</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left">Shift</th>
                    <th className="py-2 text-left">Dibuka Oleh</th>
                    <th className="py-2 text-left hidden sm:table-cell">Dibuka</th>
                    <th className="py-2 text-left hidden sm:table-cell">Ditutup</th>
                    <th className="py-2 text-right">Orders</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right hidden md:table-cell">Selisih Kas</th>
                    <th className="py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s, i) => {
                    const diff = Number(s.cash_difference || 0);
                    const isOpen = !s.closed_at;
                    return (
                      <tr
                        key={s.id || i}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setReportDialogShiftId(s.id)}
                      >
                        <td className="py-2 font-mono text-xs">{s.shift_number || `#${s.id}`}</td>
                        <td className="py-2">{s.opened_by_name || s.user_name || '—'}</td>
                        <td className="py-2 text-muted-foreground text-xs hidden sm:table-cell">{formatDateTime(s.opened_at || s.created_at)}</td>
                        <td className="py-2 text-muted-foreground text-xs hidden sm:table-cell">{isOpen ? '—' : formatDateTime(s.closed_at)}</td>
                        <td className="py-2 text-right">{Number(s.total_orders || s.orders || 0).toLocaleString('id')}</td>
                        <td className="py-2 text-right font-medium">{fmt(s.total_revenue || s.revenue)}</td>
                        <td className={`py-2 text-right hidden md:table-cell font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {diff !== 0 ? (diff > 0 ? '+' : '') + fmt(diff) : '—'}
                        </td>
                        <td className="py-2 text-center">
                          {isOpen
                            ? <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300 text-[10px]">Aktif</Badge>
                            : <Badge variant="outline" className="text-[10px] text-muted-foreground">Selesai</Badge>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close shift dialog */}
      {hasOpenShift && currentShift && (
        <CloseShiftDialog
          shift={currentShift}
          open={closeDialogOpen}
          onClose={() => setCloseDialogOpen(false)}
          onSuccess={handleCloseSuccess}
        />
      )}

      {/* Shift report dialog */}
      <ShiftReportDialog
        shiftId={reportDialogShiftId}
        open={!!reportDialogShiftId}
        onClose={() => setReportDialogShiftId(null)}
      />
    </div>
  );
}
