import { useState, useEffect } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Users2, Star, Wallet, Clock, Loader2, Search, CheckCircle2,
  XCircle, RefreshCw, SlidersHorizontal, Save, Info,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─── Summary Card ─────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, iconClass }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-semibold leading-tight truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Adjust Balance Dialog ─────────────────────────────────────
function AdjustBalanceDialog({ member, open, onClose, onDone }) {
  const [form, setForm] = useState({ amount: '', type: 'topup', note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ amount: '', type: 'topup', note: '' });
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Masukkan jumlah yang valid');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/members/${member.id}/balance`, {
        amount: Number(form.amount),
        type: form.type,
        note: form.note || undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah saldo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sesuaikan Saldo — {member?.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Saldo saat ini: <span className="font-semibold text-foreground">{fmt(member?.balance)}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah (Rp) *</label>
            <Input
              type="number"
              min="1"
              step="1000"
              placeholder="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe *</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="topup">Top Up (tambah)</SelectItem>
                <SelectItem value="deduct">Potong (kurang)</SelectItem>
                <SelectItem value="adjustment">Koreksi Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input
              placeholder="Alasan perubahan saldo..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Ya', confirmVariant = 'default', loading }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground -mt-1">{description}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            variant={confirmVariant}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 1: Daftar Member ──────────────────────────────────────
function MemberListTab() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage]               = useState(1);
  const debouncedSearch               = useDebounce(search, 400);

  const { data: branchData } = useFetch('/branches');
  const branches = branchData?.branches || [];

  const params = new URLSearchParams();
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (statusFilter)    params.set('status', statusFilter);
  if (branchFilter)    params.set('branch_id', branchFilter);
  params.set('page', page);

  const { data, loading, refetch } = useFetch(`/members?${params.toString()}`);

  const members = data?.members || [];
  const pagination = data?.pagination || {};
  const summary = data?.summary || {};

  // Balance adjust dialog
  const [adjustTarget, setAdjustTarget] = useState(null);

  // Per-row action state
  const [actionId, setActionId] = useState(null);

  const handlePriority = async (member) => {
    setActionId(`priority-${member.id}`);
    try {
      await api.put(`/members/${member.id}/priority`, { is_priority: !member.is_priority });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengubah status priority');
    } finally {
      setActionId(null);
    }
  };

  const handleCheckPriority = async (member) => {
    setActionId(`check-${member.id}`);
    try {
      await api.post('/members/check-priority', { user_id: member.id });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal cek priority');
    } finally {
      setActionId(null);
    }
  };

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, branchFilter]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={Users2}
          label="Total Member"
          value={summary.total_members ?? (loading ? '…' : members.length)}
          iconClass="bg-blue-100 text-blue-600"
        />
        <SummaryCard
          icon={Star}
          label="Priority Member"
          value={summary.priority_members ?? '—'}
          iconClass="bg-amber-100 text-amber-600"
        />
        <SummaryCard
          icon={Wallet}
          label="Total Saldo"
          value={summary.total_balance != null ? fmt(summary.total_balance) : '—'}
          iconClass="bg-green-100 text-green-700"
        />
        <SummaryCard
          icon={Clock}
          label="Pending Topup"
          value={summary.pending_topup ?? '—'}
          iconClass="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari nama, email, no. member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            <SelectItem value="priority">Priority Only</SelectItem>
            <SelectItem value="regular">Regular Only</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>

        {/* Branch filter — hanya tampil jika ada >1 cabang */}
        {branches.length > 1 && (
          <Select value={branchFilter || '_all'} onValueChange={v => setBranchFilter(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Semua Cabang</SelectItem>
              <SelectItem value="none">Tanpa Cabang</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="icon" onClick={refetch} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground text-sm">
              Tidak ada member ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No.</TableHead>
                    <TableHead>No. Member</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Pesanan</TableHead>
                    <TableHead className="text-right">Total Belanja</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="min-w-[220px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m, idx) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {(page - 1) * (pagination.per_page || 20) + idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                          {m.member_number || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.phone || '—'}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmt(m.balance)}</TableCell>
                      <TableCell className="text-right text-sm">{m.total_orders ?? 0}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(m.total_spent)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.branch_name || '—'}</TableCell>
                      <TableCell>
                        {m.is_priority ? (
                          <Badge variant="warning" className="gap-1">
                            <Star className="w-3 h-3" />Priority
                          </Badge>
                        ) : (
                          <Badge variant="outline">Regular</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'success' : 'secondary'}>
                          {m.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(m.member_since)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant={m.is_priority ? 'outline' : 'secondary'}
                            className="text-xs h-7 px-2"
                            disabled={actionId === `priority-${m.id}`}
                            onClick={() => handlePriority(m)}
                            title={m.is_priority ? 'Unset Priority' : 'Set Priority'}
                          >
                            {actionId === `priority-${m.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Star className="w-3 h-3 mr-1" />
                            )}
                            {m.is_priority ? 'Unset' : 'Set'} Priority
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => setAdjustTarget(m)}
                          >
                            <Wallet className="w-3 h-3 mr-1" />Saldo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2"
                            disabled={actionId === `check-${m.id}`}
                            onClick={() => handleCheckPriority(m)}
                            title="Cek kualifikasi priority otomatis"
                          >
                            {actionId === `check-${m.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 mr-1" />
                            )}
                            Cek
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Hal. {pagination.current_page} / {pagination.total_pages}
            {pagination.total && ` · ${pagination.total} member`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Adjust Balance Dialog */}
      {adjustTarget && (
        <AdjustBalanceDialog
          member={adjustTarget}
          open={!!adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onDone={refetch}
        />
      )}
    </div>
  );
}

// ─── Tab 2: Topup Requests ─────────────────────────────────────
function TopupRequestsTab({ onPendingCount }) {
  const { data, loading, refetch } = useFetch('/members/topup-requests/pending');
  const requests = data?.requests || [];

  const [confirm, setConfirm] = useState(null); // { req, action: 'approved'|'rejected', note }
  const [noteInput, setNoteInput] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    onPendingCount(requests.length);
  }, [requests.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const openConfirm = (req, action) => {
    setNoteInput('');
    setConfirm({ req, action });
  };

  const handleProcess = async () => {
    if (!confirm) return;
    setProcessing(true);
    try {
      await api.put(`/members/topup-requests/${confirm.req.id}`, {
        status: confirm.action,
        note: noteInput || undefined,
      });
      setConfirm(null);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal memproses request');
    } finally {
      setProcessing(false);
    }
  };

  const PM_LABEL = {
    transfer: 'Transfer Bank',
    qris: 'QRIS',
    cash: 'Tunai',
    ewallet: 'E-Wallet',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Memuat…' : `${requests.length} permintaan menunggu persetujuan`}
        </p>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground text-sm">
            Tidak ada permintaan topup yang pending
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{req.user_name}</p>
                    <p className="text-xs text-muted-foreground">{req.user_phone || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-base text-green-700">{fmt(req.amount)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(req.created_at)}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {PM_LABEL[req.payment_method] || req.payment_method}
                  </span>
                  {req.reference && (
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
                      Ref: {req.reference}
                    </span>
                  )}
                </div>

                {req.note && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 italic">
                    "{req.note}"
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openConfirm(req, 'approved')}
                  >
                    <CheckCircle2 className="w-4 h-4" />Setujui
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => openConfirm(req, 'rejected')}
                  >
                    <XCircle className="w-4 h-4" />Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(v) => { if (!v) setConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === 'approved' ? 'Setujui Topup' : 'Tolak Topup'}
            </DialogTitle>
          </DialogHeader>
          {confirm && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {confirm.action === 'approved'
                  ? `Setujui topup ${fmt(confirm.req.amount)} untuk ${confirm.req.user_name}?`
                  : `Tolak permintaan topup ${fmt(confirm.req.amount)} dari ${confirm.req.user_name}?`}
              </p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Catatan {confirm.action === 'rejected' ? '(alasan penolakan)' : '(opsional)'}
                </label>
                <Input
                  placeholder={confirm.action === 'rejected' ? 'Alasan penolakan...' : 'Catatan opsional...'}
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setConfirm(null)} disabled={processing}>
                  Batal
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={processing || (confirm.action === 'rejected' && !noteInput.trim())}
                  className={confirm.action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}
                >
                  {processing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  {confirm.action === 'approved' ? 'Setujui' : 'Tolak'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Pengaturan Member ──────────────────────────────────
const MEMBER_SETTING_KEYS = [
  { key: 'priority_auto_enable',  label: 'Auto Priority Upgrade', type: 'boolean', desc: 'Aktifkan upgrade priority otomatis berdasarkan riwayat transaksi' },
  { key: 'priority_min_orders',   label: 'Minimum Pesanan (Priority)', type: 'number', desc: 'Jumlah pesanan minimum untuk kualifikasi priority' },
  { key: 'priority_min_spent',    label: 'Minimum Total Belanja (Priority)', type: 'number', desc: 'Total belanja minimum (Rp) untuk kualifikasi priority' },
  { key: 'topup_enabled',         label: 'Topup Saldo Aktif', type: 'boolean', desc: 'Izinkan member melakukan permintaan topup saldo' },
  { key: 'topup_min_amount',      label: 'Minimum Topup (Rp)', type: 'number', desc: 'Jumlah minimum per transaksi topup' },
  { key: 'member_qr_base_url',    label: 'Base URL QR Member', type: 'text', desc: 'URL dasar untuk generate QR code member' },
];

function MemberSettingsTab() {
  const { data, loading, refetch } = useFetch('/settings?group=member');
  const [edited, setEdited] = useState({});
  const [saving, setSaving] = useState(false);

  const allSettings = data?.settings || [];

  // Build a lookup map key → setting
  const settingMap = allSettings.reduce((acc, s) => {
    acc[s.setting_key] = s;
    return acc;
  }, {});

  const getValue = (key) => {
    if (edited[key] !== undefined) return edited[key];
    return settingMap[key]?.setting_value ?? '';
  };

  const handleChange = (key, value) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(edited).length === 0) return;
    setSaving(true);
    try {
      const settings = Object.entries(edited).map(([key, value]) => ({ key, value }));
      await api.put('/settings', { settings });
      setEdited({});
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (sk) => {
    const val = getValue(sk.key);
    if (sk.type === 'boolean') {
      const checked = val === true || val === 'true' || val === 1 || val === '1';
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`ms-${sk.key}`}
            checked={checked}
            onChange={e => handleChange(sk.key, e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor={`ms-${sk.key}`} className="text-sm text-muted-foreground cursor-pointer">
            {checked ? 'Aktif' : 'Nonaktif'}
          </label>
        </div>
      );
    }
    return (
      <Input
        type={sk.type === 'number' ? 'number' : 'text'}
        value={val}
        onChange={e => handleChange(sk.key, e.target.value)}
        placeholder={sk.type === 'number' ? '0' : ''}
      />
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Info box */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-blue-800">
          <p className="font-semibold">Logika Auto-Upgrade Priority</p>
          <p className="text-blue-700 text-xs leading-relaxed">
            Saat <strong>Auto Priority Upgrade</strong> diaktifkan, sistem akan memeriksa riwayat member secara berkala
            maupun saat tombol <em>Cek</em> ditekan di tabel member. Jika total pesanan member &ge; <strong>Minimum Pesanan</strong>
            {' '}dan total belanja &ge; <strong>Minimum Total Belanja</strong>, member otomatis dinaikkan ke status Priority.
            Anda juga bisa mengatur priority secara manual per-member.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {MEMBER_SETTING_KEYS.map(sk => (
            <Card key={sk.key} className={edited[sk.key] !== undefined ? 'ring-1 ring-primary' : ''}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{sk.label}</p>
                    <p className="text-xs text-muted-foreground">{sk.desc}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{sk.key}</p>
                  </div>
                  <div className="md:w-56 shrink-0">
                    {renderInput(sk)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || Object.keys(edited).length === 0}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Pengaturan
          {Object.keys(edited).length > 0 && (
            <span className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {Object.keys(edited).length}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── MembersPage (main) ────────────────────────────────────────
export default function MembersPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <div className="space-y-5">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-1">
          <TabsTrigger value="members" className="gap-1.5">
            <Users2 className="w-4 h-4" />
            Daftar Member
          </TabsTrigger>
          <TabsTrigger value="topup" className="gap-1.5">
            <Wallet className="w-4 h-4" />
            Topup Requests
            {pendingCount > 0 && (
              <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <SlidersHorizontal className="w-4 h-4" />
            Pengaturan Member
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <MemberListTab />
        </TabsContent>

        <TabsContent value="topup" className="mt-4">
          <TopupRequestsTab onPendingCount={setPendingCount} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <MemberSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
