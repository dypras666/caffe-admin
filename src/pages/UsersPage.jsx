import { useState, useEffect } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import api from '../lib/api';
import { useToast } from '../components/ui/toast';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Loader2, UserCheck, UserX, Pencil, Search, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'kasir', phone: '', branch_id: '', station_id: '' };
const ROLE_BADGE = { admin: 'destructive', kasir: 'warning', waiter: 'secondary', member: 'outline' };

export default function UsersPage() {
  const toast = useToast();
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]             = useState(1);

  const [open, setOpen]         = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const debouncedSearch = useDebounce(search, 350);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, branchFilter, statusFilter]);

  const qs = new URLSearchParams({ page, limit: 20 });
  if (debouncedSearch) qs.set('search', debouncedSearch);
  if (roleFilter)      qs.set('role', roleFilter);
  if (branchFilter)    qs.set('branch_id', branchFilter);
  if (statusFilter)    qs.set('status', statusFilter);

  const { data, loading, refetch } = useFetch(`/users?${qs.toString()}`);
  const { data: branchData } = useFetch('/branches');
  const { data: stationData } = useFetch('/stations');
  const { data: demoSetting } = useFetch('/settings/is_demo_tenant');
  const isDemo = demoSetting?.setting?.setting_value === 'true' || window.location.hostname.includes('demo');

  const isMainAdmin = (u) => Boolean(
    u && (u.role === 'admin' || (u.email && (
      u.email.toLowerCase().startsWith('owner@') ||
      u.email.toLowerCase().startsWith('admin@')
    )))
  );

  const users      = data?.users || [];
  const pagination = data?.pagination || {};
  const branches   = branchData?.branches || [];
  const stations   = stationData?.stations || [];

  const openCreate = () => {
    if (isDemo) {
      toast.warning('Penambahan pengguna baru dinonaktifkan pada website demo demi keamanan data.');
      return;
    }
    setEditUser(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };
  const openEdit   = (u) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', branch_id: u.branch_id ? String(u.branch_id) : '', station_id: u.station_id ? String(u.station_id) : '' });
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editUser) {
        const payload = { name: form.name, role: form.role, phone: form.phone || null, branch_id: form.branch_id ? Number(form.branch_id) : null, station_id: form.station_id ? Number(form.station_id) : null };
        if (form.password && !isDemo) {
          payload.password = form.password;
        }
        await api.put(`/users/${editUser.id}`, payload);
      } else {
        if (isDemo) {
          toast.error('Penambahan pengguna baru dinonaktifkan pada website demo demi keamanan.');
          return;
        }
        await api.post('/auth/register', { ...form, branch_id: form.branch_id ? Number(form.branch_id) : null, station_id: form.station_id ? Number(form.station_id) : null });
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      setEditUser(null);
      refetch();
      toast.success(editUser ? 'Pengguna berhasil diperbarui' : 'Pengguna berhasil ditambahkan');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const toggleStatus = async (id, currentStatus, targetUser) => {
    if (isDemo) {
      toast.warning('Pengubahan status pengguna dinonaktifkan pada website demo.');
      return;
    }
    setUpdatingId(id);
    try {
      await api.put(`/users/${id}`, { status: currentStatus === 'active' ? 'inactive' : 'active' });
      toast.success('Status pengguna berhasil diubah');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal update status');
    } finally { setUpdatingId(null); }
  };

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 rounded-lg text-sm flex items-center gap-2.5 shadow-sm">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">Mode Demo Aktif:</span> Penambahan pengguna baru dan penggantian password dinonaktifkan demi keamanan bersama.
          </div>
        </div>
      )}

      {/* Header + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / email / telepon..." className="pl-8 h-8 text-sm" />
        </div>

        {/* Role filter */}
        <Select value={roleFilter || '_all'} onValueChange={v => setRoleFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Semua Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Role</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="kasir">Kasir</SelectItem>
            <SelectItem value="waiter">Waiter</SelectItem>
            <SelectItem value="station">Station / Dapur</SelectItem>
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>

        {/* Branch filter */}
        <Select value={branchFilter || '_all'} onValueChange={v => setBranchFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Cabang</SelectItem>
            <SelectItem value="none">Tanpa Cabang</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={statusFilter || '_all'} onValueChange={v => setStatusFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto whitespace-nowrap">
          {pagination.total ?? users.length} pengguna
        </span>
        <Button
          onClick={openCreate}
          disabled={isDemo}
          className={isDemo ? "gap-1.5 h-8 text-sm opacity-60 cursor-not-allowed" : "gap-1.5 h-8 text-sm"}
          title={isDemo ? "Penambahan pengguna dinonaktifkan pada mode demo" : undefined}
        >
          <Plus className="w-4 h-4" />Tambah
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE[u.role] || 'secondary'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.branch_name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : 'outline'}>
                        {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          disabled={updatingId === u.id || u.role === 'admin' || (isDemo && isMainAdmin(u))}
                          onClick={() => toggleStatus(u.id, u.status, u)}
                          title={u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          className={u.status === 'active' ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}
                        >
                          {updatingId === u.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : u.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Halaman {pagination.page} dari {pagination.total_pages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditUser(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? `Edit — ${editUser.name}` : 'Tambah Pengguna Baru'}</DialogTitle>
          </DialogHeader>

          {isDemo && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block">Mode Demo Aktif</span>
                Password pengguna dikunci demi kenyamanan dan tidak dapat diubah pada website demo.
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required disabled={!!editUser}
                className={editUser ? 'bg-muted cursor-not-allowed' : ''}
              />
              {editUser && <p className="text-[10px] text-muted-foreground mt-0.5">Email tidak bisa diubah</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {editUser ? 'Password Baru (kosongkan jika tidak ingin ubah)' : 'Password *'}
              </label>
              <Input type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required={!editUser && !isDemo} minLength={editUser ? (form.password ? 6 : 0) : 6}
                disabled={Boolean(isDemo)}
                placeholder={isDemo ? 'Password dikunci (Mode Demo)' : (editUser ? 'Kosongkan jika tidak diubah' : 'Min. 6 karakter')}
                className={isDemo ? 'bg-muted cursor-not-allowed text-muted-foreground' : ''}
              />
              {isDemo ? (
                <p className="text-[10px] text-amber-600 mt-1">🔒 Password pengguna dikunci dan tidak dapat diubah pada website demo</p>
              ) : editUser ? (
                <p className="text-[10px] text-muted-foreground mt-0.5">Kosongkan jika tidak ingin mengubah password</p>
              ) : null}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telepon</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Role *</label>
                <Select
                  value={form.role}
                  onValueChange={v => setForm(f => ({ ...f, role: v }))}
                  disabled={Boolean(isDemo)}
                >
                  <SelectTrigger className={isDemo ? 'bg-muted cursor-not-allowed' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kasir">Kasir</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="station">Station / Dapur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cabang</label>
                <Select value={form.branch_id || '_none'} onValueChange={v => setForm(f => ({ ...f, branch_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Tidak ditentukan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Tidak ditentukan</SelectItem>
                    {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'station' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Station / Dapur</label>
                  <Select value={form.station_id || '_none'} onValueChange={v => setForm(f => ({ ...f, station_id: v === '_none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Tidak ditentukan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Tidak ditentukan</SelectItem>
                      {stations.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditUser(null); }}>Batal</Button>
              <Button type="submit" disabled={saving || (!editUser && isDemo)}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
