import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Plus, Pencil, Trash2, Loader2, Users, LayoutGrid, List, Clock, AlertCircle } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { cn } from '../lib/utils';

const STATUS_OPTS = ['available', 'occupied', 'reserved', 'maintenance'];
const STATUS_LABEL = { available: 'Tersedia', occupied: 'Terisi', reserved: 'Dipesan', maintenance: 'Perawatan' };
const STATUS_COLOR = {
  available: 'bg-green-100 border-green-300 text-green-800',
  occupied: 'bg-red-100 border-red-300 text-red-800',
  reserved: 'bg-amber-100 border-amber-300 text-amber-800',
  maintenance: 'bg-gray-100 border-gray-300 text-gray-600',
};
const STATUS_COLOR_UNPAID = 'bg-orange-100 border-orange-400 text-orange-900';
const STATUS_DOT = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  reserved: 'bg-amber-500',
  maintenance: 'bg-gray-400',
};

const EMPTY = { room_id: '', table_number: '', name: '', capacity: 4, sort_order: 0, is_active: true };

export default function TablesPage() {
  const [searchParams] = useSearchParams();
  const defaultRoom = searchParams.get('room_id') || 'all';

  const [roomFilter, setRoomFilter] = useState(defaultRoom);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const qs = `${roomFilter !== 'all' ? `?room_id=${roomFilter}` : ''}${statusFilter !== 'all' ? `${roomFilter !== 'all' ? '&' : '?'}status=${statusFilter}` : ''}`;
  const { data, loading, refetch } = useFetch(`/tables${qs}`);
  const { data: roomsData } = useFetch('/rooms');

  const tables = data?.tables || [];
  const rooms = roomsData?.rooms || [];

  const openCreate = () => { setForm({ ...EMPTY, room_id: roomFilter !== 'all' ? roomFilter : '' }); setEditId(null); setOpen(true); };
  const openEdit = (t) => {
    setForm({
      room_id: t.room_id ? String(t.room_id) : '',
      table_number: t.table_number,
      name: t.name || '',
      capacity: t.capacity,
      sort_order: t.sort_order,
      is_active: !!t.is_active,
    });
    setEditId(t.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        room_id: form.room_id ? parseInt(form.room_id) : null,
        capacity: parseInt(form.capacity) || 4,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (editId) await api.put(`/tables/${editId}`, payload);
      else await api.post('/tables', payload);
      setOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus meja ini?')) return;
    try {
      await api.delete(`/tables/${id}`);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  const quickStatus = async (id, status, extra = {}) => {
    setUpdatingId(id);
    try {
      // For maintenance — prompt for reason and whether manual (permanent) close
      if (status === 'maintenance') {
        const reason = window.prompt('Alasan maintenance (opsional):', '');
        const isManual = window.confirm(
          'Tutup permanen?\n\n• OK = Tutup manual (tidak auto-buka)\n• Batal = Auto-buka setelah beberapa jam'
        );
        extra.maintenance_note = reason || null;
        extra.manual_close = isManual;
        if (!isManual) {
          // Ask how many hours
          const hrs = window.prompt('Auto-buka setelah berapa jam?', '8');
          extra.auto_free_hours = parseFloat(hrs) || 8;
        }
      }
      await api.patch(`/tables/${id}/status`, { status, ...extra });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal update');
    } finally {
      setUpdatingId(null);
    }
  };

  // count per status
  const counts = tables.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Status summary */}
      <div className="flex gap-3 flex-wrap">
        {STATUS_OPTS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
              statusFilter === s ? STATUS_COLOR[s] : 'bg-background border-border text-muted-foreground hover:border-primary/40'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[s])} />
            {STATUS_LABEL[s]}
            <span className="font-bold">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Room" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Room</SelectItem>
            {rooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex border rounded-lg overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Tambah Meja
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : viewMode === 'grid' ? (
        /* Grid view — floor plan style */
        <div>
          {/* Build room list from actual tables data — fallback if rooms not loaded yet */}
          {(rooms.length > 0 ? rooms : [...new Map(tables.filter(t => t.room_id).map(t => [t.room_id, { id: t.room_id, name: t.room_name || `Room ${t.room_id}` }])).values()])
            .filter(r => roomFilter === 'all' || String(r.id) === roomFilter)
            .map(room => {
              const roomTables = tables.filter(t => t.room_id === room.id);
              if (roomFilter === 'all' && roomTables.length === 0) return null;
              return (
                <div key={room.id} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-sm">{room.name}</h3>
                    <span className="text-xs text-muted-foreground">{roomTables.length} meja</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {roomTables.map(t => (
                      <TableCard
                        key={t.id}
                        table={t}
                        onEdit={() => openEdit(t)}
                        onDelete={() => handleDelete(t.id)}
                        onStatusChange={(s) => quickStatus(t.id, s)}
                        updating={updatingId === t.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          {/* Tables without room */}
          {(() => {
            const noRoom = tables.filter(t => !t.room_id);
            if (!noRoom.length) return null;
            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Tanpa Room</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {noRoom.map(t => (
                    <TableCard key={t.id} table={t} onEdit={() => openEdit(t)} onDelete={() => handleDelete(t.id)} onStatusChange={(s) => quickStatus(t.id, s)} updating={updatingId === t.id} />
                  ))}
                </div>
              </div>
            );
          })()}
          {tables.length === 0 && (
            <div className="text-center text-muted-foreground py-16">Tidak ada meja</div>
          )}
        </div>
      ) : (
        /* List view */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Meja</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Kapasitas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Tidak ada meja</TableCell></TableRow>
                ) : tables.map(t => {
                  const hasUnpaid = parseInt(t.unpaid_order_count || 0) > 0;
                  return (
                  <TableRow key={t.id} className={hasUnpaid ? 'bg-orange-50 hover:bg-orange-100/60' : ''}>
                    <TableCell className="font-mono font-medium">
                      <div className="flex items-center gap-2">
                        {t.table_number}
                        {hasUnpaid && (
                          <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" /> Blm Bayar
                          </span>
                        )}
                      </div>
                      {hasUnpaid && t.unpaid_order_number && (
                        <p className="text-[10px] font-mono text-orange-600 mt-0.5">#{t.unpaid_order_number}</p>
                      )}
                    </TableCell>
                    <TableCell>{t.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.room_name || '—'}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" />{t.capacity}</div></TableCell>
                    <TableCell>
                      <Select value={t.status} onValueChange={(s) => quickStatus(t.id, s)} disabled={updatingId === t.id}>
                        <SelectTrigger className={cn('h-7 text-xs w-32 border', hasUnpaid ? 'border-orange-300 bg-orange-50 text-orange-800' : STATUS_COLOR[t.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTS.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'success' : 'outline'}>{t.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Meja' : 'Tambah Meja Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nomor Meja *</label>
                <Input value={form.table_number} onChange={e => setForm(f => ({ ...f, table_number: e.target.value }))} required placeholder="T01" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Meja</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="misal: Meja Sudut" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kapasitas</label>
                <Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan</label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Room</label>
                <Select value={form.room_id || 'none'} onValueChange={v => setForm(f => ({ ...f, room_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih room" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Room</SelectItem>
                    {rooms.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tbl_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="tbl_active" className="text-sm">Meja aktif</label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan' : 'Tambah Meja'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Grid card component
function TableCard({ table, onEdit, onDelete, onStatusChange, updating }) {
  const hasUnpaid = parseInt(table.unpaid_order_count || 0) > 0;

  return (
    <div className={cn(
      'relative rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md select-none',
      hasUnpaid ? STATUS_COLOR_UNPAID : STATUS_COLOR[table.status],
      !table.is_active && 'opacity-50'
    )}>
      {/* Status dot / unpaid pulse */}
      {hasUnpaid ? (
        <span className="absolute top-2 right-2 flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
        </span>
      ) : (
        <div className={cn('absolute top-2 right-2 w-2.5 h-2.5 rounded-full', STATUS_DOT[table.status])} />
      )}

      <p className="font-bold text-sm">{table.table_number}</p>
      {table.name && <p className="text-[10px] truncate opacity-70">{table.name}</p>}
      <div className="flex items-center gap-0.5 mt-1">
        <Users className="w-3 h-3 opacity-60" />
        <span className="text-[10px] opacity-70">{table.capacity}</span>
      </div>

      {/* Unpaid badge */}
      {hasUnpaid && (
        <div className="mt-1.5 flex items-center gap-1 bg-orange-500 text-white rounded-md px-1.5 py-0.5">
          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="text-[9px] font-bold truncate">Blm Bayar</span>
        </div>
      )}
      {hasUnpaid && table.unpaid_order_number && (
        <p className="text-[9px] font-mono opacity-70 mt-0.5 truncate">#{table.unpaid_order_number}</p>
      )}

      {/* Quick action buttons */}
      <div className="flex gap-1 mt-2">
        {STATUS_OPTS.filter(s => s !== table.status).slice(0, 2).map(s => (
          <button
            key={s}
            disabled={updating}
            onClick={(e) => { e.stopPropagation(); onStatusChange(s); }}
            className="flex-1 text-[9px] bg-white/40 hover:bg-white/60 rounded px-1 py-0.5 truncate transition-colors font-medium"
            title={STATUS_LABEL[s]}
          >
            {STATUS_LABEL[s].slice(0, 4)}
          </button>
        ))}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-[9px] bg-white/40 hover:bg-white/60 rounded px-1 py-0.5 transition-colors"
          title="Edit"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
      </div>

      {updating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
    </div>
  );
}
