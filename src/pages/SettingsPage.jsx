import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Plus, Save, Loader2, UserCheck, Users, Mail, Phone, ShieldCheck, Activity, Info, Building2, Server, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import jsQR from 'jsqr';

// ─── CONSTANTS ────────────────────────────────────────────────
const TABS = [
  { key: 'settings', label: 'Pengaturan', icon: Info },
  { key: 'audit', label: 'Aktivitas', icon: Activity },
  { key: 'system', label: 'Sistem', icon: ShieldCheck },
  { key: 'queue', label: 'Queue Sync', icon: Server },
];

const GROUPS = ['general', 'contact', 'social', 'appearance', 'payment', 'notification', 'booking', 'table', 'pos', 'member', 'modules', 'other'];
const GROUP_LABEL = {
  general: 'Umum',
  contact: 'Kontak & Alamat',
  social: 'Sosial Media',
  appearance: 'Tampilan',
  payment: 'Pembayaran',
  notification: 'Notifikasi',
  booking: 'Reservasi',
  table: 'Meja & QR',
  pos: 'Kasir & POS',
  member: 'Membership',
  modules: 'Modul Tambahan',
  storage: 'Storage & File',
  other: 'Lainnya',
};
const TYPES = ['text', 'number', 'boolean', 'json', 'password', 'select', 'image', 'color'];
const EMPTY_NEW = { setting_key: '', setting_value: '', setting_type: 'text', setting_group: 'general', label: '', is_public: false };

// ─── SETTINGS TAB ─────────────────────────────────────────────
function SettingsTab() {
  const { data, loading, refetch } = useFetch('/settings');
  const { data: paymentData } = useFetch('/payments/methods');
  const [edited, setEdited] = useState({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSetting, setNewSetting] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [activeGroup, setActiveGroup] = useState('general');

  const settings = data?.settings || [];
  const grouped = settings.reduce((acc, s) => {
    const g = s.setting_group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});
  const groups = Object.keys(grouped);
  const activeGroupSettings = grouped[activeGroup] || [];

  const handleChange = (key, value) => setEdited(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (Object.keys(edited).length === 0) return;

    // Validasi: topup_enabled = true → wajib ada minimal 1 payment method aktif
    const topupVal = edited['topup_enabled'] !== undefined
      ? edited['topup_enabled']
      : settings.find(s => s.setting_key === 'topup_enabled')?.setting_value;
    const topupOn = topupVal === 'true' || topupVal === true || topupVal === 1;
    if (topupOn) {
      const activeMethods = (paymentData?.methods || []).filter(m => m.is_active);
      if (activeMethods.length === 0) {
        alert('Fitur Top Up Saldo tidak bisa diaktifkan.\n\nWajib mengaktifkan minimal 1 metode pembayaran terlebih dahulu di halaman Pembayaran (/payments).');
        return;
      }
    }

    setSaving(true);
    try {
      await api.put('/settings', { settings: Object.entries(edited).map(([key, value]) => ({ key, value })) });
      setEdited({});
      refetch();
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/settings', newSetting);
      setAddOpen(false);
      setNewSetting(EMPTY_NEW);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah setting');
    } finally { setCreating(false); }
  };

  const renderInput = (setting) => {
    const val = edited[setting.setting_key] !== undefined ? edited[setting.setting_key] : setting.setting_value;
    const onChange = (v) => handleChange(setting.setting_key, v);

    if (setting.setting_type === 'boolean') {
      const isOn = val === true || val === 'true' || val === 1 || val === '1';
      return (
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange('true')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${isOn ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-muted text-muted-foreground border-border hover:border-emerald-400'}`}>
            Aktif
          </button>
          <button type="button" onClick={() => onChange('false')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${!isOn ? 'bg-destructive text-white border-destructive shadow-sm' : 'bg-muted text-muted-foreground border-border hover:border-destructive/50'}`}>
            Nonaktif
          </button>
        </div>
      );
    }
    if (setting.setting_type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={val || '#6F4E37'} onChange={e => onChange(e.target.value)} className="h-9 w-16 rounded cursor-pointer border" />
          <Input value={val || ''} onChange={e => onChange(e.target.value)} className="flex-1" />
        </div>
      );
    }
    if (setting.setting_type === 'json') {
      return (
        <textarea value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val}
          onChange={e => onChange(e.target.value)} rows={3}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      );
    }
    if (setting.setting_type === 'password') {
      return <Input type="password" value={val || ''} onChange={e => onChange(e.target.value)} placeholder="********" />;
    }
    if (setting.setting_type === 'select') {
      let options = [];
      try { options = JSON.parse(setting.setting_value || '[]'); } catch { options = []; }
      return (
        <select value={val || ''} onChange={e => onChange(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm">
          {options.map((opt, i) => (
            <option key={i} value={opt.value !== undefined ? opt.value : opt}>
              {opt.label !== undefined ? opt.label : opt}
            </option>
          ))}
        </select>
      );
    }
    if (setting.setting_type === 'image') {
      return (
        <div className="flex flex-col gap-2 items-start">
          {val && (
            <img 
              src={val.startsWith('http') ? val : `/uploads/${val}`} 
              alt="Preview" 
              className="h-16 max-w-full object-contain rounded border bg-muted/30 p-1" 
            />
          )}
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <span className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md transition-colors border">
                Pilih Gambar
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('file', file);
                  try {
                    const res = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    const imageUrl = res.data.file?.url || res.data.file?.file_path || res.data.url || res.data.file_path;
                    onChange(imageUrl);
                    
                    // Auto-decode QRIS if this is qris_image
                    if (setting.setting_key === 'qris_image') {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = img.width;
                          canvas.height = img.height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(img, 0, 0, img.width, img.height);
                          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                          const code = jsQR(imageData.data, imageData.width, imageData.height);
                          if (code && code.data) {
                            handleChange('qris_string', code.data);
                            alert('QRIS berhasil di-decode dan disave ke qris_string!');
                          } else {
                            alert('Gagal membaca QR Code dari gambar yang diupload. Pastikan gambar jelas.');
                          }
                        };
                        img.src = event.target.result;
                      };
                      reader.readAsDataURL(file);
                    }
                  } catch (err) {
                    alert('Gagal upload gambar');
                  }
                  e.target.value = '';
                }}
              />
            </label>
            {val && (
              <button type="button" className="text-xs text-destructive hover:underline" onClick={() => onChange('')}>
                Hapus
              </button>
            )}
          </div>
        </div>
      );
    }
    return <Input type={setting.setting_type === 'number' ? 'number' : 'text'} value={val || ''} onChange={e => onChange(e.target.value)} />;
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="flex gap-1 flex-wrap">
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${activeGroup === g ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {GROUP_LABEL[g] || g}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Tambah Setting
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || Object.keys(edited).length === 0} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Perubahan
            {Object.keys(edited).length > 0 && (
              <span className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{Object.keys(edited).length}</span>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {activeGroupSettings.map(setting => (
            <Card key={setting.setting_key} className={edited[setting.setting_key] !== undefined ? 'ring-1 ring-primary' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">{setting.label || setting.setting_key}</p>
                    <p className="text-xs font-mono text-muted-foreground">{setting.setting_key}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{setting.setting_type}</Badge>
                    {setting.is_public ? <Badge variant="success" className="text-[10px]">Public</Badge> : null}
                  </div>
                </div>
                {renderInput(setting)}
              </CardContent>
            </Card>
          ))}
          {activeGroupSettings.length === 0 && (
            <div className="md:col-span-2 text-center text-muted-foreground py-12">Tidak ada setting di grup ini</div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Setting Baru</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Setting Key *</label>
              <Input placeholder="misal: cafe_tagline" value={newSetting.setting_key}
                onChange={e => setNewSetting(s => ({ ...s, setting_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label *</label>
              <Input placeholder="misal: Tagline Cafe" value={newSetting.label} onChange={e => setNewSetting(s => ({ ...s, label: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
                <Select value={newSetting.setting_type} onValueChange={v => setNewSetting(s => ({ ...s, setting_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grup</label>
                <Select value={newSetting.setting_group} onValueChange={v => setNewSetting(s => ({ ...s, setting_group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nilai Awal</label>
              <Input value={newSetting.setting_value} onChange={e => setNewSetting(s => ({ ...s, setting_value: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_public_new" checked={newSetting.is_public}
                onChange={e => setNewSetting(s => ({ ...s, is_public: e.target.checked }))} />
              <label htmlFor="is_public_new" className="text-sm">Publik (dapat diakses tanpa login)</label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Tambah
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── AUDIT TAB ─────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 30;

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/audit?page=${p}&limit=${perPage}`);
      setLogs(res.data?.logs || res.data || []);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch { setLogs([]); }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(1); }, []);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Aktivitas Sistem</h3>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(1)} disabled={loading}>
          <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} mr-1`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">Belum ada aktivitas</div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card text-sm">
                <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${log.severity === 'critical' ? 'bg-red-500' : log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{log.action}</p>
                  {log.description && <p className="text-xs text-muted-foreground truncate">{log.description}</p>}
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{log.user_name || 'System'}</span>
                    <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">{log.module || '-'}</Badge>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Halaman {page} dari {totalPages} (total {total})</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SYSTEM TAB ────────────────────────────────────────────────
function SystemTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/system/info').then(r => {
      setData(r.data || r);
    }).catch(() => {
      setData(null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return <div className="text-center text-muted-foreground py-16">Gagal memuat info sistem</div>;

  const { tenant, stats } = data;

  const statCards = [
    { label: 'Total User', value: stats.total_users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aktif', value: stats.active_users, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nonaktif', value: stats.inactive_users, icon: UserCheck, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Admin', value: stats.admin_count, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Kasir', value: stats.kasir_count, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Waiter', value: stats.waiter_count, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Member', value: stats.member_count, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Punya Email', value: stats.with_email, icon: Mail, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Punya No HP', value: stats.with_phone, icon: Phone, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Cabang', value: stats.branches, icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Tenant Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informasi Tenant</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-muted-foreground text-xs">Nama Cafe</dt><dd className="font-medium">{tenant.name}</dd></div>
            <div><dt className="text-muted-foreground text-xs">Subdomain</dt><dd className="font-medium">{tenant.slug}.caffe.id</dd></div>
            <div><dt className="text-muted-foreground text-xs">Langganan</dt><dd><Badge>{tenant.tier}</Badge></dd></div>
            <div><dt className="text-muted-foreground text-xs">Sejak</dt><dd className="font-medium">{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('id-ID') : '-'}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* User Stats */}
      <Card>
        <CardHeader><CardTitle className="text-base">Statistik Pengguna</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {statCards.map(s => (
              <div key={s.label} className={`${s.bg} rounded-lg p-4 border`}>
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// ─── QUEUE TAB ─────────────────────────────────────────────────
function QueueTab() {
  const { data, loading, refetch } = useFetch('/mobile/sync/items?device_id=all');
  const items = data?.items || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Antrean Sinkronisasi (Seluruh Perangkat)</CardTitle>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && items.length === 0 ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>ID Lokal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pesan Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada antrean sinkronisasi.</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-xs font-mono">{item.device_id}</TableCell>
                    <TableCell className="text-xs uppercase">{item.entity_type}</TableCell>
                    <TableCell className="text-xs font-mono">{item.local_id}</TableCell>
                    <TableCell>
                      {item.status === 'done' ? <Badge variant="success" className="text-[10px]">Sukses</Badge> :
                       item.status === 'failed' ? <Badge variant="destructive" className="text-[10px]">Gagal ({item.attempts}x)</Badge> :
                       item.status === 'processing' ? <Badge variant="warning" className="text-[10px]">Proses</Badge> :
                       <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={item.error_msg}>{item.error_msg || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState('settings');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'audit' && <AuditTab />}
      {tab === 'system' && <SystemTab />}
      {tab === 'queue' && <QueueTab />}
    </div>
  );
}