import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Plus, Loader2, Trash2, Pencil, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const formatRp = (v) => 'Rp ' + Number(v || 0).toLocaleString('id');

const CATEGORY_TYPE_COLOR = {
  operational: 'bg-blue-100 text-blue-700',
  cogs: 'bg-red-100 text-red-700',
  capex: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const PAYMENT_METHODS = ['cash', 'transfer', 'debit', 'credit', 'other'];

const EMPTY_EXPENSE = {
  category_id: '', title: '', amount: '', expense_date: new Date().toISOString().slice(0, 10),
  payment_method: 'cash', reference: '', description: '',
};

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <Card>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SUMMARY TAB ────────────────────────────────────────────────────────────
function SummaryTab({ categories }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, loading } = useFetch(`/expenses/summary?year=${year}&month=${month}`);

  const summary = data || {};
  const byCat = summary.by_category || [];
  const chartData = byCat.map(c => ({ name: c.category, total: Number(c.total || 0) }));

  const netMarginPct = summary.revenue > 0 ? ((summary.net_profit / summary.revenue) * 100).toFixed(1) : '0.0';
  const grossPct = summary.revenue > 0 ? ((summary.gross_profit / summary.revenue) * 100).toFixed(1) : '0.0';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return (
    <div className="space-y-5">
      {/* Month/Year selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Revenue" value={formatRp(summary.revenue)} icon={TrendingUp} color="bg-emerald-600" />
            <StatCard label="HPP / COGS" value={formatRp(summary.cogs)} icon={BarChart3} color="bg-amber-500" />
            <StatCard label="Laba Kotor" value={formatRp(summary.gross_profit)} icon={DollarSign} color="bg-blue-600" sub={`Margin ${grossPct}%`} />
            <StatCard
              label="Laba Bersih"
              value={formatRp(summary.net_profit)}
              icon={TrendingDown}
              color={Number(summary.net_profit) >= 0 ? 'bg-primary' : 'bg-red-500'}
              sub={`Margin ${netMarginPct}%`}
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pengeluaran per Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val) => [formatRp(val), 'Total']} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* P&L Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Laporan Laba Rugi</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    { label: 'Revenue / Pendapatan', value: summary.revenue, cls: 'font-bold' },
                    { label: 'HPP / COGS', value: -Math.abs(summary.cogs || 0), cls: 'text-muted-foreground' },
                    { label: 'Laba Kotor', value: summary.gross_profit, cls: 'font-semibold border-t' },
                    { label: 'Total Pengeluaran', value: -Math.abs(summary.total_expenses || 0), cls: 'text-muted-foreground' },
                    { label: 'Laba Bersih', value: summary.net_profit, cls: `font-bold border-t text-lg ${Number(summary.net_profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}` },
                  ].map((row, i) => (
                    <tr key={i} className={`px-4 ${row.cls?.includes('border-t') ? 'border-t' : ''}`}>
                      <td className={`px-4 py-2.5 ${row.cls}`}>{row.label}</td>
                      <td className={`px-4 py-2.5 text-right ${row.cls}`}>{formatRp(Math.abs(row.value || 0))}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                        {summary.revenue > 0 ? `${((Math.abs(row.value || 0) / summary.revenue) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── EXPENSES LIST TAB ──────────────────────────────────────────────────────
function ExpensesListTab({ categories }) {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const qs = new URLSearchParams({
    page, limit: 20,
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
    ...(categoryId && { category_id: categoryId }),
    ...(search && { search }),
  }).toString();

  const { data, loading, refetch } = useFetch(`/expenses?${qs}`);

  const expenses = data?.expenses || [];
  const totalAmount = data?.total_amount || 0;
  const pagination = data?.pagination || {};

  const handleDelete = async (id) => {
    if (!confirm('Hapus pengeluaran ini?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      refetch();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menghapus'); }
  };

  const resetFilters = () => { setDateFrom(''); setDateTo(''); setCategoryId(''); setSearch(''); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-36 text-sm" />
        <span className="text-muted-foreground text-sm">—</span>
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-36 text-sm" />
        <Select value={categoryId || '_all'} onValueChange={v => { setCategoryId(v === '_all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Semua Kategori</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cari judul..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-44"
        />
        {(dateFrom || dateTo || categoryId || search) && (
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={resetFilters}>Reset</Button>
        )}
        <Button onClick={() => { setEditItem(null); setFormOpen(true); }} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />Tambah Pengeluaran
        </Button>
      </div>

      {/* Total */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Total:</span>
        <span className="font-bold text-lg">{formatRp(totalAmount)}</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Pembayaran</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">Belum ada pengeluaran</TableCell>
                  </TableRow>
                ) : expenses.map(exp => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-mono text-xs">{exp.expense_number || `#${exp.id}`}</TableCell>
                    <TableCell className="text-sm">{new Date(exp.expense_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</TableCell>
                    <TableCell className="font-medium text-sm">{exp.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{exp.category_name || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{formatRp(exp.amount)}</TableCell>
                    <TableCell className="text-sm capitalize">{exp.payment_method || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{exp.reference || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditItem(exp); setFormOpen(true); }}>Edit</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">Hal {page} / {pagination.total_pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <ExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={() => { setFormOpen(false); refetch(); }}
        editItem={editItem}
        categories={categories}
      />
    </div>
  );
}

// ─── CATEGORIES TAB ─────────────────────────────────────────────────────────
const EMPTY_CATEGORY = { name: '', code: '', type: 'operational' };

function CategoriesTab({ categories, refetchCategories }) {
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [editCat, setEditCat] = useState(null); // null = add mode, object = edit mode
  const [saving, setSaving] = useState(false);

  const startEdit = (c) => {
    setEditCat(c);
    setForm({ name: c.name, code: c.code || '', type: c.type || 'operational' });
  };

  const cancelEdit = () => {
    setEditCat(null);
    setForm(EMPTY_CATEGORY);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editCat) {
        await api.put(`/expenses/categories/${editCat.id}`, { name: form.name, type: form.type, is_active: true });
        setEditCat(null);
      } else {
        await api.post('/expenses/categories', form);
      }
      setForm(EMPTY_CATEGORY);
      refetchCategories();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan kategori'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      await api.delete(`/expenses/categories/${c.id}`);
      refetchCategories();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menghapus kategori'); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Add / Edit form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{editCat ? `Edit Kategori: ${editCat.name}` : 'Tambah Kategori'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Gaji Karyawan" required />
            </div>
            {!editCat && (
              <div className="w-28">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kode</label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="GAJ" />
              </div>
            )}
            <div className="w-36">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operasional</SelectItem>
                  <SelectItem value="cogs">COGS</SelectItem>
                  <SelectItem value="capex">Capex</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editCat ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editCat ? 'Simpan' : 'Tambah'}
              </Button>
              {editCat && (
                <Button type="button" variant="outline" onClick={cancelEdit}>Batal</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Category list */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada kategori</TableCell>
                </TableRow>
              ) : categories.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.code || '—'}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_TYPE_COLOR[c.type] || CATEGORY_TYPE_COLOR.other}`}>
                      {c.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── EXPENSE FORM DIALOG ────────────────────────────────────────────────────
function ExpenseFormDialog({ open, onClose, onDone, editItem, categories }) {
  const isEdit = !!editItem;
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  const syncKey = editItem?.id ?? 'new';
  useEffect(() => {
    if (editItem) {
      setForm({
        category_id: editItem.category_id ? String(editItem.category_id) : '',
        title: editItem.title || '',
        amount: editItem.amount || '',
        expense_date: editItem.expense_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        payment_method: editItem.payment_method || 'cash',
        reference: editItem.reference || '',
        description: editItem.description || '',
      });
    } else {
      setForm(EMPTY_EXPENSE);
    }
  }, [syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        amount: parseFloat(form.amount),
      };
      if (isEdit) await api.put(`/expenses/${editItem.id}`, payload);
      else await api.post('/expenses', payload);
      onDone();
    } catch (err) { alert(err.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
            <Select value={form.category_id || '_none'} onValueChange={v => set('category_id', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Tanpa kategori</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul *</label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Beli bahan baku" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Jumlah (Rp) *</label>
              <Input type="number" min="0" step="1" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tanggal *</label>
              <Input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Metode Bayar</label>
              <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Referensi</label>
              <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="No. invoice" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Keterangan</label>
            <Input value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { data: catData, refetch: refetchCategories } = useFetch('/expenses/categories');
  const categories = catData?.categories || [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Pengeluaran</h1>
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="list">Daftar Pengeluaran</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="mt-4">
          <SummaryTab categories={categories} />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <ExpensesListTab categories={categories} />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab categories={categories} refetchCategories={refetchCategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
