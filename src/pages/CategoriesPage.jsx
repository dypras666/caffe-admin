import { showToast } from '../components/ui/toast';
import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { 
  Plus, Pencil, Trash2, Loader2, ChevronDown, Check,
  Coffee, Utensils, Beer, IceCream, Pizza, Cake, Sandwich, Carrot, Flame, 
  Leaf, CupSoda, Croissant, Martini, Wine, Soup, Grape, Citrus, Apple,
  Fish, Candy, Bean, Donut, GlassWater, Beef
} from 'lucide-react';
import { cn } from '../lib/utils';

const COMMON_ICONS = [
  { name: 'Coffee', icon: Coffee, slug: 'coffee' },
  { name: 'Utensils', icon: Utensils, slug: 'utensils' },
  { name: 'Beer', icon: Beer, slug: 'beer' },
  { name: 'Ice Cream', icon: IceCream, slug: 'ice-cream' },
  { name: 'Pizza', icon: Pizza, slug: 'pizza' },
  { name: 'Cake', icon: Cake, slug: 'cake' },
  { name: 'Sandwich', icon: Sandwich, slug: 'sandwich' },
  { name: 'Carrot', icon: Carrot, slug: 'carrot' },
  { name: 'Flame', icon: Flame, slug: 'flame' },
  { name: 'Leaf', icon: Leaf, slug: 'leaf' },
  { name: 'Soda', icon: CupSoda, slug: 'cup-soda' },
  { name: 'Croissant', icon: Croissant, slug: 'croissant' },
  { name: 'Martini', icon: Martini, slug: 'martini' },
  { name: 'Wine', icon: Wine, slug: 'wine' },
  { name: 'Soup', icon: Soup, slug: 'soup' },
  { name: 'Grape', icon: Grape, slug: 'grape' },
  { name: 'Citrus', icon: Citrus, slug: 'citrus' },
  { name: 'Water', icon: GlassWater, slug: 'glass-water' }
];

const EMPTY_FORM = { name: '', description: '', icon: '', sort_order: 0, is_active: true };

export default function CategoriesPage() {
  const { data, loading, refetch } = useFetch('/categories');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const categories = data?.categories || [];

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };
  const openEdit = (c) => {
    setForm({ name: c.name, description: c.description || '', icon: c.icon || '', sort_order: c.sort_order, is_active: !!c.is_active });
    setEditId(c.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.put(`/categories/${editId}`, form);
      else await api.post('/categories', form);
      setOpen(false);
      refetch();
    } catch (err) {
      showToast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus kategori ini? Pastikan tidak ada produk di kategori ini.')) return;
    try {
      await api.delete(`/categories/${id}`);
      refetch();
    } catch (err) {
      showToast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground">{categories.length} kategori</span>
        <Button onClick={openCreate} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />
          Tambah Kategori
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
                  <TableHead>Ikon</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Urutan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Belum ada kategori</TableCell></TableRow>
                ) : categories.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {(() => {
                          const found = COMMON_ICONS.find(i => i.slug === c.icon);
                          if (found) {
                            const IconCmp = found.icon;
                            return <IconCmp className="w-4 h-4" />;
                          }
                          return c.icon || c.name?.charAt(0);
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description || '—'}</TableCell>
                    <TableCell>{c.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'success' : 'outline'}>
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Kategori *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ikon Kategori</label>
              <Input 
                placeholder="misal: coffee, food, dessert atau pilih di bawah" 
                value={form.icon} 
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} 
                className="mb-2"
              />
              <div className="grid grid-cols-6 gap-1 p-2 bg-secondary/30 border border-border rounded-md h-32 overflow-y-auto">
                {COMMON_ICONS.map((ico) => {
                  const IconComponent = ico.icon;
                  const isSelected = form.icon === ico.slug;
                  return (
                    <button
                      type="button"
                      key={ico.slug}
                      onClick={() => setForm(f => ({ ...f, icon: ico.slug }))}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-1 px-0.5 rounded-md hover:bg-secondary border border-transparent transition-colors",
                        isSelected && "bg-secondary border-primary/50 text-primary"
                      )}
                      title={ico.name}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Deskripsi</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Urutan Tampil</label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_cat" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="is_active_cat" className="text-sm">Aktif</label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                {editId ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
