import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import { usePermissions } from '../context/PermissionsContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Plus, Loader2, Pencil, Trash2, ShieldCheck, Check, X, Save } from 'lucide-react';
import { useToast } from '../components/ui/toast';

// ─── Permission matrix definition ────────────────────────────
// Each resource has a list of actions with label + description
const RESOURCES = [
  {
    key: 'orders',
    label: 'Pesanan',
    actions: [
      { key: 'create',        label: 'Buat Pesanan' },
      { key: 'read',          label: 'Lihat Pesanan' },
      { key: 'update_status', label: 'Ubah Status' },
      { key: 'cancel',        label: 'Batalkan Pesanan' },
      { key: 'delete',        label: 'Hapus Pesanan' },
    ],
  },
  {
    key: 'products',
    label: 'Produk',
    actions: [
      { key: 'read',   label: 'Lihat Produk' },
      { key: 'create', label: 'Tambah Produk' },
      { key: 'update', label: 'Edit Produk' },
      { key: 'delete', label: 'Hapus Produk' },
    ],
  },
  {
    key: 'bookings',
    label: 'Reservasi',
    actions: [
      { key: 'create',        label: 'Buat Reservasi' },
      { key: 'read',          label: 'Lihat Reservasi' },
      { key: 'update_status', label: 'Ubah Status' },
      { key: 'delete',        label: 'Hapus Reservasi' },
    ],
  },
  {
    key: 'customers',
    label: 'Pelanggan',
    actions: [
      { key: 'read', label: 'Lihat Data Pelanggan' },
    ],
  },
];

// ─── Permission Matrix editor for one non-admin role ─────────
function PermissionMatrix({ role, onSaved }) {
  const toast = useToast();
  const { reload: reloadPerms } = usePermissions();
  const [saving, setSaving] = useState(false);

  // Parse permissions from role
  const parsePerms = (role) => {
    let raw = role.permissions;
    if (!raw) raw = {};
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
    // normalise to { resource: { action: bool } }
    const out = {};
    for (const res of RESOURCES) {
      out[res.key] = {};
      const src = raw[res.key] || {};
      for (const act of res.actions) {
        out[res.key][act.key] = Array.isArray(src)
          ? src.includes(act.key)
          : src[act.key] === true;
      }
    }
    return out;
  };

  const [perms, setPerms] = useState(() => parsePerms(role));

  const toggle = (resource, action) => {
    setPerms(p => ({
      ...p,
      [resource]: { ...p[resource], [action]: !p[resource][action] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/roles/${role.id}`, { permissions: perms });
      await reloadPerms();
      toast.success('Permission disimpan');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {RESOURCES.map(res => (
        <div key={res.key}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{res.label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {res.actions.map(act => {
              const on = perms[res.key]?.[act.key] ?? false;
              return (
                <button
                  key={act.key}
                  type="button"
                  onClick={() => toggle(res.key, act.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all select-none ${
                    on
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-muted/30 border-border text-muted-foreground'
                  }`}
                >
                  {on
                    ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    : <X className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />}
                  {act.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Permission
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function RolesPage() {
  const { data, loading, refetch } = useFetch('/roles');
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', label: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const roles = data?.roles || [];
  // non-admin editable roles for permission matrix tabs
  const editableRoles = roles.filter(r => r.name !== 'admin' && r.name !== 'member');
  const defaultTab = editableRoles[0]?.name || '';

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/roles', form);
      setCreateOpen(false);
      setForm({ name: '', label: '', description: '' });
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (role) => {
    if (!confirm(`Hapus role "${role.label}"?`)) return;
    setDeletingId(role.id);
    try {
      await api.delete(`/roles/${role.id}`);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menghapus'); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Roles & Permissions</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5 ml-auto" size="sm">
          <Plus className="w-4 h-4" />Tambah Role
        </Button>
      </div>

      {/* ── Permission Matrix ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Kelola Permission per Role</CardTitle>
          <p className="text-xs text-muted-foreground">Centang aksi yang diizinkan untuk setiap role. Perubahan langsung berlaku.</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : editableRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada role yang bisa dikonfigurasi</p>
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList className="mb-4">
                {editableRoles.map(r => (
                  <TabsTrigger key={r.name} value={r.name} className="gap-1.5">
                    {r.label}
                    {r.is_system && <Badge variant="outline" className="text-[9px] px-1 py-0">sistem</Badge>}
                  </TabsTrigger>
                ))}
              </TabsList>
              {editableRoles.map(r => (
                <TabsContent key={r.name} value={r.name}>
                  <PermissionMatrix role={r} onSaved={refetch} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* ── Roles Table ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Daftar Role</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.name}</TableCell>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_system ? 'secondary' : 'outline'}>
                        {r.is_system ? 'Sistem' : 'Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!r.is_system && (
                          <Button
                            variant="ghost" size="icon"
                            disabled={deletingId === r.id}
                            onClick={() => handleDelete(r)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === r.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
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

      {/* ── Create Role Dialog ────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Role Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama (slug) *</label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="contoh: supervisor"
                required
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Huruf kecil, tanpa spasi</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label *</label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Tambah Role
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
