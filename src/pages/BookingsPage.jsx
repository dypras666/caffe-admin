import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Check, X, Plus, Banknote } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'cancelled', 'completed'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan', completed: 'Selesai' };
const STATUS_CLS = { pending: 'badge-status-pending', confirmed: 'badge-status-ready', cancelled: 'badge-status-cancelled', completed: 'badge-status-completed' };

function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' }); }

export default function BookingsPage() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', booking_date: '', booking_time: '', guests: 1, special_request: ''
  });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_status: 'unpaid', dp_amount: 0, total_amount: 0
  });

  const qs = `?page=${page}&limit=10${status !== 'all' ? `&status=${status}` : ''}`;
  const { data, loading, refetch } = useFetch(`/bookings${qs}`);

  const bookings = data?.bookings || [];
  const pagination = data?.pagination || {};

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.put(`/bookings/${id}`, { status: newStatus });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal update');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/bookings', form);
      setIsModalOpen(false);
      setForm({ name: '', email: '', phone: '', booking_date: '', booking_time: '', guests: 1, special_request: '' });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membuat booking');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (b) => {
    setSelectedBooking(b);
    setPaymentForm({
      payment_status: b.payment_status || 'unpaid',
      dp_amount: Number(b.dp_amount) || 0,
      total_amount: Number(b.total_amount) || 0
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/bookings/${selectedBooking.id}/payment`, paymentForm);
      setPaymentModalOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'Semua Status' : STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>

        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-1.5 ml-2">
          <Plus className="w-4 h-4" />
          Tambah Booking
        </Button>

        <span className="text-sm text-muted-foreground ml-auto">
          Total: {pagination.total || 0} booking
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Booking</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal &amp; Waktu</TableHead>
                  <TableHead>Tamu</TableHead>
                  <TableHead>DP</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">Tidak ada booking</TableCell></TableRow>
                ) : bookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-semibold text-primary">{b.booking_number || `#${b.id}`}</p>
                        <p className="text-[10px] text-muted-foreground">{b.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{formatDate(b.booking_date)}</p>
                      <p className="text-muted-foreground">{b.booking_time?.slice(0, 5)}</p>
                    </TableCell>
                    <TableCell>{b.guests} orang</TableCell>
                    <TableCell className="text-sm">
                      {b.dp_amount > 0 ? (
                        <div>
                          <p className="font-medium">Rp {Number(b.dp_amount).toLocaleString('id')}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.payment_status === 'paid' || b.payment_status === 'partial' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {b.payment_status === 'paid' || b.payment_status === 'partial' ? 'Dibayar' : 'Belum'}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">Tanpa DP</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        b.payment_status === 'partial' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.payment_status === 'paid' ? 'Lunas' : b.payment_status === 'partial' ? 'Partial / DP' : 'Belum Bayar'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={STATUS_CLS[b.status] || ''}>{STATUS_LABEL[b.status] || b.status}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {b.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-50" disabled={updatingId === b.id}
                              onClick={() => updateStatus(b.id, 'confirmed')} title="Konfirmasi">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={updatingId === b.id}
                              onClick={() => updateStatus(b.id, 'cancelled')} title="Batalkan">
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {b.status === 'confirmed' && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" disabled={updatingId === b.id}
                            onClick={() => updateStatus(b.id, 'completed')}>
                            Selesai
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50" disabled={updatingId === b.id}
                          onClick={() => openPaymentModal(b)} title="Pembayaran">
                          <Banknote className="w-4 h-4" />
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

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Halaman {pagination.page} dari {pagination.total_pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Booking Manual</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBooking} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nama Pemesan</label>
              <Input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Budi Santoso" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input required type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="budi@example.com" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">No. Telepon / WA</label>
              <Input required value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="081234567890" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tanggal</label>
                <Input required type="date" value={form.booking_date} onChange={e => setForm(p => ({...p, booking_date: e.target.value}))} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Waktu</label>
                <Input required type="time" value={form.booking_time} onChange={e => setForm(p => ({...p, booking_time: e.target.value}))} />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Jumlah Tamu (Pax)</label>
              <Input required type="number" min="1" value={form.guests} onChange={e => setForm(p => ({...p, guests: e.target.value}))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Permintaan Khusus</label>
              <Input value={form.special_request} onChange={e => setForm(p => ({...p, special_request: e.target.value}))} placeholder="Opsional (cth: Di pojok)" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simpan Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manajemen Pembayaran Booking</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status Pembayaran</label>
              <Select value={paymentForm.payment_status} onValueChange={v => setPaymentForm(p => ({...p, payment_status: v}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Belum Bayar</SelectItem>
                  <SelectItem value="partial">Partial / DP</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="refunded">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Total Tagihan (Rp)</label>
              <Input required type="number" min="0" value={paymentForm.total_amount} onChange={e => setPaymentForm(p => ({...p, total_amount: e.target.value}))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nominal DP / Dibayar (Rp)</label>
              <Input required type="number" min="0" value={paymentForm.dp_amount} onChange={e => setPaymentForm(p => ({...p, dp_amount: e.target.value}))} />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simpan Pembayaran
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
