import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Plus, Pencil, Trash2, Loader2, DoorOpen, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast';

const EMPTY = { name: '', description: '', capacity: '', sort_order: 0, is_active: true };

export default function RoomsPage() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/rooms');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const rooms = data?.rooms || [];

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (r) => {
    setForm({ name: r.name, description: r.description || '', capacity: r.capacity, sort_order: r.sort_order, is_active: !!r.is_active });
    setEditId(r.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) || 0, sort_order: parseInt(form.sort_order) || 0 };
      if (editId) await api.put(`/rooms/${editId}`, payload);
      else await api.post('/rooms', payload);
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus room ini? Semua meja di room ini akan kehilangan referensi room.')) return;
    try {
      await api.delete(`/rooms/${id}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  const totalCapacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
  const totalTables = rooms.reduce((s, r) => s + (r.total_tables || 0), 0);
  const availableTables = rooms.reduce((s, r) => s + (r.available_tables || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Room</p>
              <p className="text-2xl font-bold">{rooms.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Kapasitas</p>
              <p className="text-2xl font-bold">{totalCapacity}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <DoorOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meja Tersedia</p>
              <p className="text-2xl font-bold">{availableTables} / {totalTables}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center">
        <Button onClick={openCreate} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />
          Tambah Room
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    {room.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                  <Badge variant={room.is_active ? 'success' : 'outline'}>
                    {room.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm mb-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{room.available_tables || 0}</p>
                    <p className="text-xs text-muted-foreground">Tersedia</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{room.total_tables || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Meja</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{room.capacity || 0}</p>
                    <p className="text-xs text-muted-foreground">Kapasitas</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => navigate(`/tables?room_id=${room.id}`)}
                  >
                    Lihat Meja
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(room)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(room.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rooms.length === 0 && (
            <div className="md:col-span-3 text-center text-muted-foreground py-12">Belum ada room</div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Room' : 'Tambah Room Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Room *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="misal: Indoor, Outdoor, VIP" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Deskripsi singkat tentang room"
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kapasitas Orang</label>
                <Input type="number" min={0} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan Tampil</label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="room_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="room_active" className="text-sm">Room aktif</label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan' : 'Tambah Room'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
