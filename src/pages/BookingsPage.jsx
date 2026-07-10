import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'cancelled', 'completed'];
const STATUS_LABEL = { pending: 'Pending', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan', completed: 'Selesai' };
const STATUS_CLS = { pending: 'badge-status-pending', confirmed: 'badge-status-ready', cancelled: 'badge-status-cancelled', completed: 'badge-status-completed' };

function formatDate(d) { return new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' }); }

export default function BookingsPage() {
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.dp_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {b.dp_paid ? 'Lunas' : 'Belum'}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">Tanpa DP</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        b.payment_status === 'dp_paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.payment_status === 'paid' ? 'Lunas' : b.payment_status === 'dp_paid' ? 'DP Bayar' : 'Belum Bayar'}
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
    </div>
  );
}
