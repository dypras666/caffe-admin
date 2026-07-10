import { useState, useEffect, useCallback, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Plus, Pencil, Trash2, Loader2, Search, RefreshCw, Eye, EyeOff,
  FileText, Video, Globe, HelpCircle, TrendingUp, Clock, Upload, X, Image
} from 'lucide-react';

const POST_TYPES = [
  { value: 'all', label: 'Semua Tipe' },
  { value: 'article', label: 'Artikel' },
  { value: 'video', label: 'Video' },
  { value: 'page', label: 'Halaman' },
  { value: 'news', label: 'Berita' },
  { value: 'faq', label: 'FAQ' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'published', label: 'Terbit' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Arsip' },
];

const TYPE_ICONS = { article: FileText, video: Video, page: Globe, news: TrendingUp, faq: HelpCircle };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function TagInput({ value = [], onChange, placeholder = 'Tambah tag...' }) {
  const [input, setInput] = useState('');
  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput('');
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5 mb-1">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-xs shadow-sm"
        />
        <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2" onClick={addTag}>Tambah</Button>
      </div>
    </div>
  );
}

function CategoryManager({ onClose }) {
  const { data, loading, refetch } = useFetch('/posts/categories');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6F4E37');
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/posts/categories/${editId}`, { name, color });
      } else {
        await api.post('/posts/categories', { name, color });
      }
      setName('');
      setColor('#6F4E37');
      setEditId(null);
      refetch();
    } catch { alert('Gagal simpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus kategori ini?')) return;
    try { await api.delete(`/posts/categories/${id}`); refetch(); } catch { alert('Gagal hapus'); }
  };

  const cats = data?.categories || [];
  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Nama Kategori</label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Nama kategori..." className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Warna</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-9 rounded-lg border cursor-pointer" />
        </div>
        <Button size="sm" disabled={saving || !name.trim()} onClick={handleSave} className="mb-0.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : editId ? 'Update' : 'Tambah'}
        </Button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {cats.map(c => (
          <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#6F4E37' }} />
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">({c.post_count || 0})</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditId(c.id); setName(c.name); setColor(c.color || '#6F4E37'); }}>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </button>
              <button onClick={() => handleDelete(c.id)}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagManager({ onClose }) {
  const { data, loading, refetch } = useFetch('/posts/tags');
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    try { await api.post('/posts/tags', { name }); setName(''); refetch(); } catch { alert('Gagal'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus tag ini?')) return;
    try { await api.delete(`/posts/tags/${id}`); refetch(); } catch { alert('Gagal'); }
  };

  const tags = data?.tags || [];
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nama tag..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <Button size="sm" disabled={!name.trim()} onClick={handleAdd}>Tambah</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t.id} className="inline-flex items-center gap-1.5 bg-muted text-sm px-2.5 py-1 rounded-full">
            {t.name}
            <span className="text-xs text-muted-foreground">({t.post_count || 0})</span>
            <button onClick={() => handleDelete(t.id)} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-xs text-muted-foreground">Belum ada tag</p>}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: '', content: '', excerpt: '', post_type: 'article', cover_image: '',
  status: 'draft', seo_title: '', seo_description: '', seo_keywords: '',
  allow_comments: true, category_ids: [], tag_names: [], gallery: [],
};

export default function PostsPage() {
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const qs = `?page=${page}&limit=10${type !== 'all' ? `&type=${type}` : ''}${status !== 'all' ? `&status=${status}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`;
  const { data, loading, refetch } = useFetch(`/posts${qs}`);
  const { data: catData } = useFetch('/posts/categories');

  const posts = data?.posts || [];
  const pagination = data?.pagination || {};
  const categories = catData?.categories || [];

  const totalPosts = pagination.total || 0;
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const viewCount = posts.reduce((s, p) => s + (p.views || 0), 0);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setOpen(true); };

  const openEdit = (p) => {
    setForm({
      title: p.title, content: p.content || '', excerpt: p.excerpt || '',
      post_type: p.post_type || 'article', cover_image: p.cover_image || '',
      status: p.status || 'draft',
      seo_title: p.seo_title || '', seo_description: p.seo_description || '', seo_keywords: p.seo_keywords || '',
      allow_comments: !!p.allow_comments,
      category_ids: (p.categories || []).map(c => c.id),
      tag_names: (p.tags || []).map(t => t.name),
      gallery: (p.gallery || []).map(g => g.image_url),
    });
    setEditId(p.id);
    setOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        content: form.content || null,
        excerpt: form.excerpt || null,
        cover_image: form.cover_image || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
      };
      if (editId) await api.put(`/posts/${editId}`, payload);
      else await api.post('/posts', payload);
      setOpen(false);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus post ini?')) return;
    try { await api.delete(`/posts/${id}`); refetch(); } catch { alert('Gagal hapus'); }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try { await api.put(`/posts/${id}`, { ...form, status: newStatus }); refetch(); }
    catch { alert('Gagal update status'); }
  };

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data.file.url || res.data.file.file_path;
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setForm(prev => ({ ...prev, cover_image: url }));
    } catch { alert('Gagal upload cover'); }
    e.target.value = '';
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f)));
      setForm(prev => ({ ...prev, gallery: [...prev.gallery, ...urls] }));
    } catch { alert('Gagal upload gallery'); }
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total Post</p><p className="text-xl font-bold">{totalPosts}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Eye className="w-4 h-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Terbit</p><p className="text-xl font-bold text-emerald-600">{publishedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Draft</p><p className="text-xl font-bold text-amber-600">{draftCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Dilihat</p><p className="text-xl font-bold text-blue-600">{viewCount.toLocaleString('id')}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={type} onValueChange={v => { setType(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{POST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari judul atau excerpt..."
            className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setCatManagerOpen(true); setTagManagerOpen(false); }} className="gap-1.5">
          Kategori
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setTagManagerOpen(true); setCatManagerOpen(false); }} className="gap-1.5">
          Tag
        </Button>
        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
        <Button onClick={openCreate} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" />Tambah Post
        </Button>
      </div>

      {/* Category Manager Dialog */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Kategori Post</DialogTitle></DialogHeader><CategoryManager onClose={() => setCatManagerOpen(false)} /></DialogContent>
      </Dialog>

      {/* Tag Manager Dialog */}
      <Dialog open={tagManagerOpen} onOpenChange={setTagManagerOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Tag Post</DialogTitle></DialogHeader><TagManager onClose={() => setTagManagerOpen(false)} /></DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dilihat</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Belum ada post</TableCell></TableRow>
                ) : posts.map((p, i) => {
                  const TypeIcon = TYPE_ICONS[p.post_type] || FileText;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {p.cover_image && (
                            <img src={p.cover_image.startsWith('http') ? p.cover_image : `http://localhost:3002${p.cover_image}`}
                              alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm leading-tight">{p.title}</p>
                            {p.excerpt && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.excerpt}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          <TypeIcon className="w-3 h-3" />
                          {p.post_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(p.categories || []).slice(0, 2).map(c => (
                            <span key={c.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (c.color || '#6F4E37') + '20', color: c.color || '#6F4E37' }}>
                              {c.name}
                            </span>
                          ))}
                          {(p.categories || []).length > 2 && <span className="text-xs text-muted-foreground">+{p.categories.length - 2}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{p.status}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.views || 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p>{formatDate(p.created_at)}</p>
                        {p.created_by_name && <p className="text-[10px]">oleh {p.created_by_name}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={p.status === 'published' ? 'Arsipkan' : 'Terbitkan'}
                            onClick={() => handleStatusToggle(p.id, p.status)}>
                            {p.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Hapus" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Halaman {pagination.page} dari {pagination.total_pages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages}>Next</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Post' : 'Tambah Post Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Judul *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
                <Select value={form.post_type} onValueChange={v => setForm(f => ({ ...f, post_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.filter(t => t.value !== 'all').map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Terbit</SelectItem>
                    <SelectItem value="archived">Arsip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori</label>
                <Select value="" onValueChange={v => {
                  const id = parseInt(v);
                  if (id && !form.category_ids.includes(id)) {
                    setForm(f => ({ ...f, category_ids: [...f.category_ids, id] }));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Tambah kategori..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => !form.category_ids.includes(c.id)).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {form.category_ids.map(id => {
                    const cat = categories.find(c => c.id === id);
                    return cat ? (
                      <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (cat.color || '#6F4E37') + '20', color: cat.color || '#6F4E37' }}>
                        {cat.name}
                        <button type="button" onClick={() => setForm(f => ({ ...f, category_ids: f.category_ids.filter(c => c !== id) }))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tag</label>
                <TagInput value={form.tag_names} onChange={v => setForm(f => ({ ...f, tag_names: v }))} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Excerpt (Ringkasan)</label>
                <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Konten</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={10} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-y" />
              </div>
              {/* Cover Image */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cover Image</label>
                <div className="flex items-center gap-3">
                  {form.cover_image && (
                    <img src={form.cover_image.startsWith('http') ? form.cover_image : `http://localhost:3002${form.cover_image}`}
                      alt="cover" className="w-20 h-14 rounded-lg object-cover border" />
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground">
                    <Upload className="w-4 h-4" />{form.cover_image ? 'Ganti' : 'Upload Cover'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                  </label>
                  {form.cover_image && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, cover_image: '' }))} className="text-destructive text-xs">Hapus</button>
                  )}
                </div>
              </div>
              {/* Gallery */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gallery Gambar</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.gallery.map((url, i) => (
                    <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={url.startsWith('http') ? url : `http://localhost:3002${url}`} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, gallery: f.gallery.filter((_, j) => j !== i) }))}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                  </label>
                </div>
              </div>
              {/* SEO */}
              <div className="col-span-2 border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SEO</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta Title</label>
                <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta Description</label>
                <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))}
                  rows={2} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Meta Keywords</label>
                <input value={form.seo_keywords} onChange={e => setForm(f => ({ ...f, seo_keywords: e.target.value }))}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="allow_comments" checked={form.allow_comments}
                  onChange={e => setForm(f => ({ ...f, allow_comments: e.target.checked }))} />
                <label htmlFor="allow_comments" className="text-sm">Izinkan komentar</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end border-t pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" size="sm" disabled={saving || !form.title.trim()}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {editId ? 'Simpan Perubahan' : 'Buat Post'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
