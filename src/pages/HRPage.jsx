import { useState, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import {
  Users, Clock, CalendarCheck, CreditCard, RefreshCcw, Plus, Pencil, Trash2,
  Loader2, ArrowRightLeft, Check, X, AlertCircle, ChevronRight,
  Building2, UserCheck, UserX, Settings, Download, TrendingUp, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';

const FMT_RP = (v) => `Rp ${Number(v || 0).toLocaleString('id')}`;
const FMT_DATE = (d) => d ? new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—';
const TODAY = new Date().toISOString().slice(0, 10);
const THIS_MONTH = new Date().toISOString().slice(0, 7);

// ─── Main ─────────────────────────────────────────────────────
export default function HRPage({ defaultTab = 'employees' }) {
  const toast = useToast();
  const { data: settingsData, refetch: refetchSettings } = useFetch('/hr/settings');
  const settings = settingsData?.settings || {};
  const isEnabled = settings.hr_enabled === 'true';
  const location = useLocation();

  const handleToggleHR = async () => {
    try {
      await api.put('/hr/settings', { hr_enabled: isEnabled ? 'false' : 'true' });
      refetchSettings();
      toast.success(isEnabled ? 'Modul HR dinonaktifkan' : 'Modul HR diaktifkan!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal');
    }
  };

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
          <Users className="w-10 h-10 text-violet-600" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Modul HR</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-1">
            Kelola karyawan, absensi, tukar shift, dan penggajian. Semua terintegrasi dengan laporan pengeluaran café.
          </p>
          <p className="text-xs text-muted-foreground/70">Modul ini opsional dan dapat diaktifkan/nonaktifkan kapan saja.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm w-full max-w-xs">
          {[
            { icon: UserCheck, label: 'Manajemen Karyawan' },
            { icon: CalendarCheck, label: 'Absensi & Clock-in/out' },
            { icon: ArrowRightLeft, label: 'Tukar Shift' },
            { icon: CreditCard, label: 'Penggajian Otomatis' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border">
              <f.icon className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <span className="text-xs font-medium">{f.label}</span>
            </div>
          ))}
        </div>
        <Button onClick={handleToggleHR} className="bg-violet-600 hover:bg-violet-700 px-8">
          Aktifkan Modul HR
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Modul HR</h1>
            <p className="text-xs text-muted-foreground">Karyawan · Absensi · Shift · KPI · Penggajian</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-violet-100 text-violet-700 border-violet-200">Aktif</Badge>
          <Button size="sm" variant="ghost" onClick={handleToggleHR} className="text-xs text-muted-foreground">
            Nonaktifkan
          </Button>
        </div>
      </div>

      {/* Summary */}
      <HRSummary />

      {/* Tabs */}
      <Tabs value={location.pathname.includes('/hr/kpi') ? 'kpi' : undefined} defaultValue={defaultTab}>
        <TabsList className="h-auto p-1 gap-1">
          {[
            { v: 'employees', label: 'Karyawan', icon: Users },
            { v: 'attendance', label: 'Absensi', icon: CalendarCheck },
            { v: 'schedule', label: 'Jadwal', icon: CalendarDays },
            { v: 'shifts', label: 'Shift Kerja', icon: Clock },
            { v: 'swaps', label: 'Tukar Shift', icon: ArrowRightLeft },
            { v: 'kpi', label: 'KPI', icon: TrendingUp },
            { v: 'kpi-metrics', label: 'Metrik KPI', icon: TrendingUp },
            { v: 'payroll', label: 'Penggajian', icon: CreditCard },
            { v: 'settings', label: 'Pengaturan', icon: Settings },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="flex items-center gap-1.5 text-xs px-3 py-2">
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        <TabsContent value="schedule" className="mt-4"><ScheduleTab /></TabsContent>
        <TabsContent value="shifts" className="mt-4"><WorkShiftsTab /></TabsContent>
        <TabsContent value="swaps" className="mt-4"><ShiftSwapsTab /></TabsContent>
        <TabsContent value="kpi" className="mt-4"><EmployeeKPITab /></TabsContent>
        <TabsContent value="kpi-metrics" className="mt-4"><KPIMetricsTab /></TabsContent>
        <TabsContent value="payroll" className="mt-4"><PayrollTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><HRSettingsTab settings={settings} onSave={refetchSettings} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────
function HRSummary() {
  const { data } = useFetch(`/hr/summary?month=${THIS_MONTH}`);
  const d = data || {};
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard icon={Users} label="Karyawan Aktif" value={d.employees?.active || 0} color="violet" />
      <SummaryCard icon={CalendarCheck} label="Hadir Bulan Ini" value={d.attendance?.present || 0} color="emerald" />
      <SummaryCard icon={CreditCard} label="Total Payroll" value={FMT_RP(d.payroll?.total_payroll)} color="blue" small />
      <SummaryCard icon={ArrowRightLeft} label="Permintaan Tukar" value={d.shift_swaps?.pending || 0} color="amber" badge={d.shift_swaps?.pending > 0 ? 'Perlu persetujuan' : null} />
      <SummaryCard icon={TrendingUp} label="KPI Terisi" value={d.kpi?.filled || 0} color="rose" />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, small, badge }) {
  const colors = { violet: 'bg-violet-50 border-violet-100', emerald: 'bg-emerald-50 border-emerald-100', blue: 'bg-blue-50 border-blue-100', amber: 'bg-amber-50 border-amber-100' };
  const textColors = { violet: 'text-violet-600', emerald: 'text-emerald-600', blue: 'text-blue-600', amber: 'text-amber-600' };
  return (
    <Card className={`border ${colors[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${textColors[color]}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`font-bold ${small ? 'text-base' : 'text-2xl'} ${textColors[color]}`}>{value}</p>
        {badge && <p className="text-[10px] text-amber-600 mt-1">{badge}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Employees Tab ────────────────────────────────────────────
function EmployeesTab() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/hr/employees');
  const employees = data?.employees || [];
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY_FORM = { full_name: '', employee_code: '', nik: '', phone: '', address: '', department: '', position: '', employment_type: 'full-time', join_date: '', base_salary: '', hourly_rate: '', bank_name: '', bank_account: '', bank_account_name: '', status: 'active', create_user_account: false, email: '', password: '', user_role: 'kasir' };
  const [form, setForm] = useState(EMPTY_FORM);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };
  const openEdit = (e) => {
    setForm({ full_name: e.full_name, employee_code: e.employee_code, nik: e.nik || '', phone: e.phone || '', address: e.address || '', department: e.department || '', position: e.position || '', employment_type: e.employment_type || 'full-time', join_date: e.join_date?.slice(0,10) || '', base_salary: e.base_salary || '', hourly_rate: e.hourly_rate || '', bank_name: e.bank_name || '', bank_account: e.bank_account || '', bank_account_name: e.bank_account_name || '', status: e.status, create_user_account: false, email: '', password: '', user_role: 'kasir' });
    setEditId(e.id); setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/hr/employees/${editId}`, form);
      else await api.post('/hr/employees', form);
      toast.success(editId ? 'Data karyawan diperbarui' : 'Karyawan berhasil ditambahkan');
      setOpen(false); refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Nonaktifkan karyawan "${name}"?`)) return;
    try { await api.delete(`/hr/employees/${id}`); toast.success('Karyawan dinonaktifkan'); refetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{employees.length} karyawan terdaftar</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> Tambah Karyawan</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading && <div className="col-span-full flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}
        {employees.map(emp => (
          <Card key={emp.id} className={cn('hover:shadow-md transition-shadow', emp.status === 'inactive' && 'opacity-60')}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <span className="text-violet-700 font-bold text-sm">{emp.full_name.slice(0,2).toUpperCase()}</span>
                </div>
                <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                  {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <p className="font-semibold text-sm leading-tight">{emp.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{emp.employee_code}</p>
              {emp.position && <p className="text-xs text-muted-foreground mt-1">{emp.position}{emp.department ? ` · ${emp.department}` : ''}</p>}
              {emp.user_email ? (
                <p className="text-[10px] text-emerald-600 mt-1">✓ Punya akun · {emp.user_role}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">Belum ada akun login</p>
              )}
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="text-xs font-semibold">{FMT_RP(emp.base_salary)}<span className="text-muted-foreground font-normal">/bln</span></span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(emp.id, emp.full_name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editId ? 'Edit Karyawan' : 'Tambah Karyawan'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Nama Lengkap *</label>
                <Input value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} required className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Kode Karyawan</label>
                <Input value={form.employee_code} onChange={e => setForm(f=>({...f,employee_code:e.target.value}))} placeholder="Auto-generate" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">NIK</label>
                <Input value={form.nik} onChange={e => setForm(f=>({...f,nik:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">No. Telepon</label>
                <Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tanggal Masuk</label>
                <Input type="date" value={form.join_date} onChange={e => setForm(f=>({...f,join_date:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Departemen</label>
                <Input value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} placeholder="Dapur, Bar, Kasir..." className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Jabatan</label>
                <Input value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipe Kerja</label>
                <Select value={form.employment_type} onValueChange={v => setForm(f=>({...f,employment_type:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Kontrak</SelectItem>
                    <SelectItem value="hourly">Per Jam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Gaji Pokok (Rp)</label>
                <Input type="number" value={form.base_salary} onChange={e => setForm(f=>({...f,base_salary:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tarif Per Jam (Rp)</label>
                <Input type="number" value={form.hourly_rate} onChange={e => setForm(f=>({...f,hourly_rate:e.target.value}))} className="mt-1" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Alamat</label>
                <Input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} className="mt-1" />
              </div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Info Bank</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Bank</label>
                    <Input value={form.bank_name} onChange={e => setForm(f=>({...f,bank_name:e.target.value}))} placeholder="BCA, BNI..." className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">No. Rekening</label>
                    <Input value={form.bank_account} onChange={e => setForm(f=>({...f,bank_account:e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Atas Nama</label>
                    <Input value={form.bank_account_name} onChange={e => setForm(f=>({...f,bank_account_name:e.target.value}))} className="mt-1" />
                  </div>
                </div>
              </div>
              {editId && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f=>({...f,status:v}))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Create user account — only when adding new employee */}
              {!editId && (
                <div className="col-span-2 border-t pt-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={form.create_user_account}
                      onChange={e => setForm(f => ({ ...f, create_user_account: e.target.checked }))}
                    />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Buat Akun Login
                    </span>
                  </label>
                  {form.create_user_account && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Email *</label>
                        <Input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required={form.create_user_account} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Password *</label>
                        <Input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required={form.create_user_account} minLength={6} placeholder="Min. 6 karakter" className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Role</label>
                        <Select value={form.user_role} onValueChange={v => setForm(f=>({...f,user_role:v}))}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kasir">Kasir</SelectItem>
                            <SelectItem value="waiter">Waiter</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{editId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────
function AttendanceTab() {
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [empFilter, setEmpFilter] = useState('');
  const { data: empData } = useFetch('/hr/employees?status=active');
  const employees = empData?.employees || [];
  const { data, loading, refetch } = useFetch(
    `/hr/attendance?date_from=${dateFrom}&date_to=${dateTo}${empFilter ? `&employee_id=${empFilter}` : ''}`
  );
  const records = data?.attendance || [];
  const [clockForm, setClockForm] = useState({ employee_id: '', shift_id: '', notes: '' });
  const [clocking, setClocking] = useState(false);
  const { data: shiftsData } = useFetch('/hr/work-shifts');
  const workShifts = shiftsData?.shifts || [];

  const handleClockIn = async () => {
    if (!clockForm.employee_id) return toast.warning('Pilih karyawan');
    setClocking(true);
    try {
      await api.post('/hr/attendance/clock-in', clockForm);
      toast.success('Clock-in berhasil');
      refetch();
      setClockForm(f => ({ ...f, notes: '' }));
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setClocking(false); }
  };

  const handleClockOut = async () => {
    if (!clockForm.employee_id) return toast.warning('Pilih karyawan');
    setClocking(true);
    try {
      await api.post('/hr/attendance/clock-out', { employee_id: clockForm.employee_id });
      toast.success('Clock-out berhasil');
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setClocking(false); }
  };

  const STATUS_BADGE = {
    present: <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Hadir</Badge>,
    absent: <Badge className="bg-red-100 text-red-700 text-[10px]">Absen</Badge>,
    sick: <Badge className="bg-blue-100 text-blue-700 text-[10px]">Sakit</Badge>,
    leave: <Badge className="bg-amber-100 text-amber-700 text-[10px]">Cuti</Badge>,
    late: <Badge className="bg-orange-100 text-orange-700 text-[10px]">Terlambat</Badge>,
    holiday: <Badge className="bg-gray-100 text-gray-600 text-[10px]">Libur</Badge>,
  };

  return (
    <div className="space-y-4">
      {/* Quick clock-in/out */}
      <Card className="border-violet-100 bg-violet-50/30">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-violet-600" /> Clock In / Out</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select value={clockForm.employee_id} onValueChange={v => setClockForm(f=>({...f,employee_id:v}))}>
              <SelectTrigger><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={clockForm.shift_id} onValueChange={v => setClockForm(f=>({...f,shift_id:v}))}>
              <SelectTrigger><SelectValue placeholder="Shift (opsional)" /></SelectTrigger>
              <SelectContent>{workShifts.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.shift_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Catatan..." value={clockForm.notes} onChange={e => setClockForm(f=>({...f,notes:e.target.value}))} />
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={handleClockIn} disabled={clocking}>
                {clocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />} In
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-xs" onClick={handleClockOut} disabled={clocking}>
                {clocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5 mr-1" />} Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Dari</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">s/d</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
        <Select value={empFilter} onValueChange={setEmpFilter}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Semua Karyawan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Karyawan</SelectItem>
            {employees.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={refetch}><RefreshCcw className="w-3.5 h-3.5" /></Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead><TableHead>Tanggal</TableHead><TableHead>Shift</TableHead>
                <TableHead>Masuk</TableHead><TableHead>Keluar</TableHead><TableHead>Jam</TableHead>
                <TableHead>Status</TableHead><TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {!loading && records.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Tidak ada data absensi</TableCell></TableRow>}
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{r.full_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{r.employee_code}</p>
                  </TableCell>
                  <TableCell className="text-sm">{FMT_DATE(r.work_date)}</TableCell>
                  <TableCell className="text-xs">{r.shift_name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{r.clock_in || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{r.clock_out || '—'}</TableCell>
                  <TableCell className="text-sm">{r.total_hours ? `${r.total_hours} jam` : '—'}</TableCell>
                  <TableCell>{STATUS_BADGE[r.status] || r.status}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{r.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────
function ScheduleTab() {
  const toast = useToast();

  // Week navigation
  const getWeekStart = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = start
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  };

  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null); // { employee_id, full_name, work_date }

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const weekEnd = weekDates[6];

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const goToday = () => setWeekStart(getWeekStart());

  const { data: empData } = useFetch('/hr/employees?status=active');
  const { data: schedData, refetch: refetchSched } = useFetch(
    `/hr/schedules?date_from=${weekStart}&date_to=${weekEnd}`
  );
  const { data: shiftData } = useFetch('/hr/work-shifts');

  const employees = empData?.employees || [];
  const schedules = schedData?.schedules || [];
  const workShifts = shiftData?.work_shifts || [];

  // Build lookup: "empId_date" → schedule
  const schedMap = {};
  schedules.forEach(s => { schedMap[`${s.employee_id}_${s.work_date?.slice(0,10)}`] = s; });

  const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const handleRemove = async (schedId) => {
    try {
      await api.delete(`/hr/schedules/${schedId}`);
      refetchSched();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  return (
    <div className="space-y-4">
      {/* Week nav header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={goToday}>Minggu Ini</Button>
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={nextWeek}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-sm font-medium">
          {new Date(weekStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' — '}
          {new Date(weekEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <Button size="sm" className="gap-1.5 ml-auto" onClick={() => setBulkOpen(true)}>
          <Plus className="w-4 h-4" />Jadwal Massal
        </Button>
      </div>

      {/* Roster grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 bg-muted/50 rounded-tl-lg font-medium text-xs w-40">Karyawan</th>
              {weekDates.map((date, i) => {
                const isToday = date === TODAY;
                return (
                  <th key={date} className={`py-2 px-2 text-center text-xs font-medium ${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                    <div>{DAY_LABELS[i]}</div>
                    <div className={`font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {new Date(date).getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-10 text-sm">Belum ada karyawan aktif</td></tr>
            ) : employees.map(emp => (
              <tr key={emp.id} className="border-t hover:bg-muted/20">
                <td className="py-2 px-3">
                  <p className="font-medium text-xs leading-tight truncate max-w-[140px]">{emp.full_name}</p>
                  {emp.department && <p className="text-[10px] text-muted-foreground truncate">{emp.department}</p>}
                </td>
                {weekDates.map(date => {
                  const key = `${emp.id}_${date}`;
                  const sched = schedMap[key];
                  return (
                    <td key={date} className="py-1 px-1 text-center align-middle">
                      {sched ? (
                        <div className="group relative inline-flex flex-col items-center">
                          <span
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg cursor-pointer select-none"
                            style={{
                              background: sched.color ? `${sched.color}22` : '#6366f122',
                              color: sched.color || '#6366f1',
                              border: `1px solid ${sched.color || '#6366f1'}44`,
                            }}
                          >
                            {sched.shift_name || '—'}
                            <br />
                            <span className="font-normal opacity-80">
                              {sched.start_time?.slice(0,5)}–{sched.end_time?.slice(0,5)}
                            </span>
                          </span>
                          <button
                            onClick={() => handleRemove(sched.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full text-[9px] hidden group-hover:flex items-center justify-center"
                          >×</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssignOpen({ employee_id: emp.id, full_name: emp.full_name, work_date: date })}
                          className="w-7 h-7 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center text-base leading-none"
                          title={`Tambah jadwal ${emp.full_name} - ${date}`}
                        >+</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign single shift dialog */}
      {assignOpen && (
        <AssignShiftDialog
          employee={assignOpen}
          workShifts={workShifts}
          onClose={() => setAssignOpen(null)}
          onSaved={() => { setAssignOpen(null); refetchSched(); }}
        />
      )}

      {/* Bulk schedule dialog */}
      {bulkOpen && (
        <BulkScheduleDialog
          employees={employees}
          workShifts={workShifts}
          weekStart={weekStart}
          onClose={() => setBulkOpen(false)}
          onSaved={() => { setBulkOpen(false); refetchSched(); }}
        />
      )}
    </div>
  );
}

function AssignShiftDialog({ employee, workShifts, onClose, onSaved }) {
  const toast = useToast();
  const [shiftId, setShiftId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/hr/schedules', {
        employee_id: employee.employee_id,
        work_date: employee.work_date,
        shift_id: shiftId || null,
        notes: notes || null,
      });
      toast.success('Jadwal disimpan');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const dateLabel = new Date(employee.work_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Atur Jadwal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="font-medium">{employee.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{dateLabel}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Shift *</label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger><SelectValue placeholder="Pilih shift..." /></SelectTrigger>
              <SelectContent>
                {workShifts.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.shift_name} ({s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !shiftId}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkScheduleDialog({ employees, workShifts, weekStart, onClose, onSaved }) {
  const toast = useToast();
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [shiftId, setShiftId] = useState('');
  const [dateFrom, setDateFrom] = useState(weekStart);
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10);
  });
  const [skipDays, setSkipDays] = useState([0]); // skip Sunday by default
  const [saving, setSaving] = useState(false);

  const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const toggleEmp = (id) => setSelectedEmps(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleDay = (d) => setSkipDays(prev =>
    prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
  );
  const toggleAllEmps = () => setSelectedEmps(
    selectedEmps.length === employees.length ? [] : employees.map(e => e.id)
  );

  const handleSave = async () => {
    if (!selectedEmps.length) return toast.warning('Pilih minimal 1 karyawan');
    if (!shiftId) return toast.warning('Pilih shift');
    setSaving(true);
    try {
      const res = await api.post('/hr/schedules/bulk', {
        employee_ids: selectedEmps,
        date_from: dateFrom,
        date_to: dateTo,
        shift_id: parseInt(shiftId),
        skip_days: skipDays,
      });
      toast.success(res.data.message);
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />Jadwal Massal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Dari Tanggal</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Sampai Tanggal</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Shift */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Shift *</label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih shift..." /></SelectTrigger>
              <SelectContent>
                {workShifts.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.shift_name} ({s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Skip days */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Lewati Hari</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    skipDays.includes(i)
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Employee selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted-foreground">Karyawan *</label>
              <button type="button" onClick={toggleAllEmps}
                className="text-[10px] text-primary hover:underline">
                {selectedEmps.length === employees.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <input type="checkbox" checked={selectedEmps.includes(emp.id)}
                    onChange={() => toggleEmp(emp.id)} className="w-3.5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{emp.full_name}</p>
                    {emp.department && <p className="text-[10px] text-muted-foreground">{emp.department}</p>}
                  </div>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{selectedEmps.length} karyawan dipilih</p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !shiftId || !selectedEmps.length}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Buat Jadwal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Work Shifts Tab ──────────────────────────────────────────
function WorkShiftsTab() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/hr/work-shifts');
  const shifts = data?.shifts || [];
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const EMPTY = { shift_name: '', start_time: '08:00', end_time: '16:00', break_minutes: 60, color: '#6366f1' };
  const [form, setForm] = useState(EMPTY);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true); };
  const openEdit = (s) => { setForm({ shift_name: s.shift_name, start_time: s.start_time, end_time: s.end_time, break_minutes: s.break_minutes, color: s.color }); setEditId(s.id); setOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) await api.put(`/hr/work-shifts/${editId}`, form);
      else await api.post('/hr/work-shifts', form);
      toast.success('Shift disimpan'); setOpen(false); refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Nonaktifkan shift ini?')) return;
    try { await api.delete(`/hr/work-shifts/${id}`); toast.success('Shift dinonaktifkan'); refetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const calcHours = (s, e, brk = 0) => {
    const [h1, m1] = s.split(':').map(Number);
    const [h2, m2] = e.split(':').map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1) - (brk || 0);
    if (mins < 0) mins += 24 * 60;
    return `${Math.floor(mins/60)}j ${mins%60}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{shifts.length} shift terdaftar</p>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="w-4 h-4" /> Tambah Shift</Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shifts.map(s => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-10 rounded-full" style={{ backgroundColor: s.color }} />
                <div>
                  <p className="font-semibold">{s.shift_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{s.start_time} – {s.end_time}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{calcHours(s.start_time, s.end_time, s.break_minutes)} efektif</span>
                <span>Istirahat {s.break_minutes} menit</span>
              </div>
              <div className="flex gap-1 mt-3">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Edit Shift' : 'Tambah Shift'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nama Shift *</label>
              <Input value={form.shift_name} onChange={e => setForm(f=>({...f,shift_name:e.target.value}))} required className="mt-1" placeholder="Shift Pagi, Siang, Malam..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mulai</label>
                <Input type="time" value={form.start_time} onChange={e => setForm(f=>({...f,start_time:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Selesai</label>
                <Input type="time" value={form.end_time} onChange={e => setForm(f=>({...f,end_time:e.target.value}))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Istirahat (menit)</label>
                <Input type="number" value={form.break_minutes} onChange={e => setForm(f=>({...f,break_minutes:parseInt(e.target.value)||0}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Warna</label>
                <Input type="color" value={form.color} onChange={e => setForm(f=>({...f,color:e.target.value}))} className="mt-1 h-9 p-1" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Shift Swaps Tab ──────────────────────────────────────────
function ShiftSwapsTab() {
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, loading, refetch } = useFetch(`/hr/shift-swaps${statusFilter ? `?status=${statusFilter}` : ''}`);
  const swaps = data?.swaps || [];
  const { data: empData } = useFetch('/hr/employees?status=active');
  const { data: shiftsData } = useFetch('/hr/work-shifts');
  const employees = empData?.employees || [];
  const workShifts = shiftsData?.shifts || [];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ requester_employee_id: '', target_employee_id: '', from_date: TODAY, to_date: TODAY, from_shift_id: '', to_shift_id: '', reason: '' });

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/hr/shift-swaps', form);
      toast.success('Permintaan tukar shift dikirim'); setOpen(false); refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await api.put(`/hr/shift-swaps/${id}/${action}`);
      toast.success(action === 'approve' ? 'Tukar shift disetujui' : 'Tukar shift ditolak'); refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const STATUS_CONFIG = { pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700' }, approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700' }, rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {[{v:'',l:'Semua'},{v:'pending',l:'Menunggu'},{v:'approved',l:'Disetujui'},{v:'rejected',l:'Ditolak'}].map(f => (
            <button key={f.v} onClick={() => setStatusFilter(f.v)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all', statusFilter === f.v ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
              {f.l}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Ajukan Tukar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengaju</TableHead><TableHead>Target</TableHead><TableHead>Tanggal</TableHead>
                <TableHead>Shift</TableHead><TableHead>Alasan</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {!loading && swaps.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada permintaan tukar shift</TableCell></TableRow>}
              {swaps.map(s => {
                const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.requester_name}</TableCell>
                    <TableCell className="text-sm">{s.target_name}</TableCell>
                    <TableCell className="text-xs">{FMT_DATE(s.from_date)}{s.to_date !== s.from_date && ` – ${FMT_DATE(s.to_date)}`}</TableCell>
                    <TableCell className="text-xs">{s.from_shift_name || '—'} → {s.to_shift_name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{s.reason || '—'}</TableCell>
                    <TableCell><span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', sc.color)}>{sc.label}</span></TableCell>
                    <TableCell>
                      {s.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => handleAction(s.id, 'approve')}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => handleAction(s.id, 'reject')}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ajukan Tukar Shift</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pengaju</label>
                <Select value={form.requester_employee_id} onValueChange={v=>setForm(f=>({...f,requester_employee_id:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>{employees.map(e=><SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Target</label>
                <Select value={form.target_employee_id} onValueChange={v=>setForm(f=>({...f,target_employee_id:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>{employees.map(e=><SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tgl Pengaju</label>
                <Input type="date" value={form.from_date} onChange={e=>setForm(f=>({...f,from_date:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tgl Target</label>
                <Input type="date" value={form.to_date} onChange={e=>setForm(f=>({...f,to_date:e.target.value}))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Shift Pengaju</label>
                <Select value={form.from_shift_id} onValueChange={v=>setForm(f=>({...f,from_shift_id:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Opsional" /></SelectTrigger>
                  <SelectContent>{workShifts.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.shift_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Shift Target</label>
                <Select value={form.to_shift_id} onValueChange={v=>setForm(f=>({...f,to_shift_id:v}))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Opsional" /></SelectTrigger>
                  <SelectContent>{workShifts.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.shift_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Alasan</label>
              <Input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} className="mt-1" placeholder="Keperluan keluarga, dll..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Kirim</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Payroll Tab ──────────────────────────────────────────────
function PayrollTab() {
  const toast = useToast();
  const [month, setMonth] = useState(THIS_MONTH);
  const { data, loading, refetch } = useFetch(`/hr/payroll?month=${month}`);
  const payroll = data?.payroll || [];
  const [generating, setGenerating] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ deductions: 0, bonus: 0, notes: '' });

  const handleGenerate = async () => {
    if (!confirm(`Generate slip gaji untuk ${month}? Karyawan yang sudah ada slip akan di-skip.`)) return;
    setGenerating(true);
    try {
      const res = await api.post('/hr/payroll/generate', { month });
      toast.success(res.data.message);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal generate'); }
    finally { setGenerating(false); }
  };

  const handlePay = async (id, name) => {
    if (!confirm(`Tandai gaji "${name}" sebagai DIBAYAR? Akan otomatis dicatat ke pengeluaran.`)) return;
    try {
      await api.post(`/hr/payroll/${id}/pay`);
      toast.success('Gaji dibayar dan dicatat ke pengeluaran');
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/hr/payroll/${editId}`, editForm);
      toast.success('Slip gaji diperbarui');
      setEditId(null); refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
  };

  const totalNet = payroll.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
  const paid = payroll.filter(p => p.status === 'paid').length;

  const STATUS_CONFIG = { draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' }, approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700' }, paid: { label: 'Dibayar', color: 'bg-emerald-100 text-emerald-700' } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="h-8 text-xs w-36" />
          <div className="text-sm text-muted-foreground">{paid}/{payroll.length} dibayar · Total <span className="font-semibold text-foreground">{FMT_RP(totalNet)}</span></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refetch}><RefreshCcw className="w-3.5 h-3.5" /></Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Generate Payroll
          </Button>
        </div>
      </div>

      {payroll.length === 0 && !loading && (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
          <CreditCard className="w-10 h-10 opacity-30" />
          <p className="text-sm">Belum ada slip gaji untuk {month}</p>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>Generate dari absensi</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead><TableHead>Gaji Pokok</TableHead><TableHead>Lembur</TableHead>
                <TableHead>Bonus</TableHead><TableHead>Potongan</TableHead><TableHead>Bersih</TableHead>
                <TableHead>Hari</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>}
              {payroll.map(p => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{p.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.department} · {p.position}</p>
                    </TableCell>
                    <TableCell className="text-sm">{FMT_RP(p.base_salary)}</TableCell>
                    <TableCell className="text-sm">{p.overtime_hours > 0 ? `${p.overtime_hours}j (${FMT_RP(p.overtime_pay)})` : '—'}</TableCell>
                    <TableCell className="text-sm">{p.bonus > 0 ? FMT_RP(p.bonus) : '—'}</TableCell>
                    <TableCell className="text-sm text-red-600">{p.deductions > 0 ? `- ${FMT_RP(p.deductions)}` : '—'}</TableCell>
                    <TableCell className="font-bold text-sm">{FMT_RP(p.net_salary)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="text-emerald-600">{p.work_days}h</span> / <span className="text-red-500">{p.absent_days}a</span>
                    </TableCell>
                    <TableCell><span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', sc.color)}>{sc.label}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.status !== 'paid' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditId(p.id); setEditForm({ deductions: p.deductions || 0, bonus: p.bonus || 0, notes: p.notes || '' }); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePay(p.id, p.full_name)}>
                              Bayar
                            </Button>
                          </>
                        )}
                        {p.bank_account && <p className="text-[9px] text-muted-foreground hidden">{p.bank_name} {p.bank_account}</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit payroll dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Sesuaikan Slip Gaji</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bonus (Rp)</label>
              <Input type="number" value={editForm.bonus} onChange={e=>setEditForm(f=>({...f,bonus:e.target.value}))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Potongan (Rp)</label>
              <Input type="number" value={editForm.deductions} onChange={e=>setEditForm(f=>({...f,deductions:e.target.value}))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Catatan</label>
              <Input value={editForm.notes} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} className="mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditId(null)}>Batal</Button>
              <Button onClick={handleSaveEdit}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HR Settings Tab ──────────────────────────────────────────
function HRSettingsTab({ settings, onSave }) {
  const toast = useToast();
  const isEnabled = settings.hr_enabled === 'true';
  const [toggling, setToggling] = useState(false);
  const [form, setForm] = useState({
    hr_work_days_per_week: settings.hr_work_days_per_week || '6',
    hr_work_hours_per_day: settings.hr_work_hours_per_day || '8',
    hr_overtime_multiplier: settings.hr_overtime_multiplier || '1.5',
    hr_payroll_day: settings.hr_payroll_day || '25',
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = async (val) => {
    setToggling(true);
    try {
      await api.put('/hr/settings', { hr_enabled: val ? 'true' : 'false' });
      toast.success(val ? 'Modul HR diaktifkan' : 'Modul HR dinonaktifkan');
      window.dispatchEvent(new CustomEvent('settings-updated'));
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setToggling(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/hr/settings', form);
      toast.success('Pengaturan HR disimpan');
      onSave();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-4">
      {/* On/Off toggle */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Modul HR</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aktifkan untuk mengakses karyawan, absensi, jadwal, dan penggajian.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleToggle(false)}
                disabled={toggling}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !isEnabled
                    ? 'bg-destructive text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {toggling && !isEnabled ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                Nonaktif
              </button>
              <button
                onClick={() => handleToggle(true)}
                disabled={toggling}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isEnabled
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {toggling && isEnabled ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                Aktif
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config — only show when enabled */}
      {isEnabled && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Konfigurasi HR</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              Perubahan mungkin memerlukan generate ulang payroll
            </div>
            {[
              { key: 'hr_work_hours_per_day', label: 'Jam kerja per hari', type: 'number' },
              { key: 'hr_overtime_multiplier', label: 'Multiplier lembur (1.5 = 150%)', type: 'number', step: '0.1' },
              { key: 'hr_payroll_day', label: 'Tanggal gajian tiap bulan', type: 'number', max: 31 },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
                <Input
                  type={f.type} value={form[f.key]} step={f.step}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="h-8 max-w-32 text-sm"
                />
              </div>
            ))}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Simpan Konfigurasi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── KPI Metrics Tab ────────────────────────────────────────────
function KPIMetricsTab() {
  const toast = useToast();
  const { data, refetch } = useFetch('/hr/kpi/metrics');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', unit: '', target_type: 'numeric', higher_is_better: true });
  const [saving, setSaving] = useState(false);
  const metrics = data?.metrics || [];

  const resetForm = () => setForm({ name: '', description: '', unit: '', target_type: 'numeric', higher_is_better: true });
  const openCreate = () => { setEdit(null); resetForm(); setOpen(true); };
  const openEdit = (m) => { setEdit(m); setForm({ name: m.name, description: m.description || '', unit: m.unit || '', target_type: m.target_type, higher_is_better: !!m.higher_is_better }); setOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nama metrik wajib diisi');
    setSaving(true);
    try {
      if (edit) {
        await api.put(`/hr/kpi/metrics/${edit.id}`, form);
        toast.success('Metrik KPI diperbarui');
      } else {
        await api.post('/hr/kpi/metrics', form);
        toast.success('Metrik KPI dibuat');
      }
      setOpen(false);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (m) => {
    try {
      await api.put(`/hr/kpi/metrics/${m.id}`, { is_active: m.is_active ? 0 : 1 });
      refetch();
      toast.success(m.is_active ? 'Dinonaktifkan' : 'Diaktifkan');
    } catch (err) { toast.error('Gagal'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{metrics.length} metrik terdefinisi</p>
        <Button size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5 mr-1" /> Metrik Baru</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead>Satuan</TableHead>
            <TableHead>Tipe Target</TableHead>
            <TableHead>Semakin Besar</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{m.description || '—'}</TableCell>
              <TableCell>{m.unit || '—'}</TableCell>
              <TableCell><Badge variant="outline">{m.target_type}</Badge></TableCell>
              <TableCell>{m.higher_is_better ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-red-500" />}</TableCell>
              <TableCell><Badge variant={m.is_active ? 'default' : 'secondary'}>{m.is_active ? 'Aktif' : 'Nonaktif'}</Badge></TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => handleToggle(m)}>
                    {m.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? 'Edit Metrik KPI' : 'Metrik KPI Baru'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nama Metrik *</label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Misal: Kehadiran" />
            </div>
            <div>
              <label className="text-sm font-medium">Deskripsi</label>
              <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm font-medium">Satuan</label>
              <Input value={form.unit} onChange={e => setForm(p => ({...p, unit: e.target.value}))} placeholder="%, menit, rupiah, ..." />
            </div>
            <div>
              <label className="text-sm font-medium">Tipe Target</label>
              <Select value={form.target_type} onValueChange={v => setForm(p => ({...p, target_type: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.higher_is_better} onChange={e => setForm(p => ({...p, higher_is_better: e.target.checked}))} className="rounded border-gray-300" />
              <label className="text-sm">Semakin besar nilainya semakin baik</label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {edit ? 'Simpan Perubahan' : 'Buat Metrik'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Employee KPI Tab ───────────────────────────────────────────
function EmployeeKPITab() {
  const toast = useToast();
  const { data: empData } = useFetch('/hr/employees?status=active');
  const { data: metricsData } = useFetch('/hr/kpi/metrics');
  const employees = empData?.employees || [];
  const metrics = metricsData?.metrics || [];
  const [selectedEmp, setSelectedEmp] = useState('');
  const [month, setMonth] = useState(THIS_MONTH);
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const { data: summaryData, refetch: refetchSummary } = useFetch(`/hr/kpi/summary?month=${month}`);
  const summary = summaryData?.summary || [];

  const loadKPI = useCallback(async () => {
    if (!selectedEmp || !month) return;
    setLoading(true);
    try {
      const res = await api.get(`/hr/kpi?employee_id=${selectedEmp}&month=${month}`);
      const existing = res.data.kpi || [];
      const map = {};
      existing.forEach(k => { map[k.metric_id] = { target_value: k.target_value, actual_value: k.actual_value, notes: k.notes || '', id: k.id }; });
      setKpiData(existing);
      setForm(map);
    } catch { toast.error('Gagal memuat data KPI'); }
    finally { setLoading(false); }
  }, [selectedEmp, month, toast]);

  useEffect(() => { loadKPI(); }, [loadKPI]);

  const handleSaveMetric = async (metric) => {
    const f = form[metric.id] || {};
    if (!f.target_value && !f.actual_value) return;
    setSaving(true);
    try {
      await api.post('/hr/kpi', {
        employee_id: selectedEmp,
        metric_id: metric.id,
        period_month: month,
        target_value: parseFloat(f.target_value) || 0,
        actual_value: parseFloat(f.actual_value) || 0,
        notes: f.notes || '',
      });
      toast.success(`${metric.name} disimpan`);
      loadKPI();
      refetchSummary();
    } catch (err) { toast.error(err.response?.data?.error || 'Gagal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Karyawan</label>
          <Select value={selectedEmp} onValueChange={setSelectedEmp}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={String(e.id)}>{e.full_name} — {e.position || e.department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium mb-1">Periode (Bulan)</label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {summary.map(s => (
            <div key={s.id} className="p-3 rounded-xl border bg-card text-center">
              <p className="text-xs text-muted-foreground truncate">{s.full_name}</p>
              <p className="text-lg font-bold mt-1">{s.avg_score || 0}</p>
              <p className="text-[10px] text-muted-foreground">{s.metric_count} metrik</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI input */}
      {selectedEmp && (
        <Card>
          <CardHeader><CardTitle className="text-base">Input KPI {month}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada metrik KPI. Buat metrik terlebih dahulu di tab Metrik KPI.</p>
            ) : (
              <div className="space-y-3">
                {metrics.map(m => {
                  const f = form[m.id] || {};
                  const existing = kpiData.find(k => k.metric_id === m.id);
                  const score = existing?.score;
                  return (
                    <div key={m.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.description}{m.unit ? ` (${m.unit})` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {score !== undefined && (
                            <div className={`text-lg font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                              {score}
                            </div>
                          )}
                          <Badge variant="outline">{m.target_type}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Target</label>
                          <Input type="number" value={f.target_value ?? ''} onChange={e => setForm(p => ({...p, [m.id]: {...(p[m.id]||{}), target_value: e.target.value}}))} placeholder="Target" />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Aktual</label>
                          <Input type="number" value={f.actual_value ?? ''} onChange={e => setForm(p => ({...p, [m.id]: {...(p[m.id]||{}), actual_value: e.target.value}}))} placeholder="Aktual" />
                        </div>
                        <div className="flex items-end">
                          <Button size="sm" onClick={() => handleSaveMetric(m)} disabled={saving} className="w-full">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Simpan'}
                          </Button>
                        </div>
                      </div>
                      {existing?.notes && <p className="text-xs text-muted-foreground mt-1 italic">{existing.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
