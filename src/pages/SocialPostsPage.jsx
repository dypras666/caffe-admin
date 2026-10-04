import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Search,
  Trash2,
  RefreshCw,
  Eye,
  Archive,
  Ban,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '../components/ui/toast';

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

export default function SocialPostsPage() {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  
  const debouncedSearch = useDebounce(search, 500);

  const qs = `?page=${page}&limit=${limit}${status !== 'all' ? `&status=${status}` : ''}${debouncedSearch ? `&search=${debouncedSearch}` : ''}`;
  const { data, loading, refetch } = useFetch(`/posts${qs}`);
  
  const posts = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const [previewPost, setPreviewPost] = useState(null);

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`Ubah status postingan menjadi ${newStatus}?`)) return;
    try {
      await api.put(`/posts/${id}/status`, { status: newStatus });
      addToast('Status diperbarui!', 'success');
      refetch();
    } catch (err) {
      addToast('Gagal memperbarui status', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus postingan ini permanen? Data tidak bisa dikembalikan.')) return;
    try {
      await api.delete(`/posts/${id}`);
      addToast('Postingan dihapus', 'success');
      refetch();
    } catch (err) {
      addToast('Gagal menghapus postingan', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600">
            Moderasi Feed
          </h1>
          <p className="text-slate-500 mt-1">Kelola, moderasi, dan arsip postingan pengguna.</p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading} className="gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100/50 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <Input
                placeholder="Cari caption / lokasi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <div className="w-48">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Status Postingan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Active (Publik)</SelectItem>
                  <SelectItem value="archived">Archived (Diarsipkan)</SelectItem>
                  <SelectItem value="suspended">Suspended (Ditangguhkan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border shadow-sm">
            Total: {total} post
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-[100px]">Media</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Caption & Hashtag</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat Pada</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Tidak ada postingan.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map(p => {
                  const mediaUrl = p.media_url ? p.media_url.split(',')[0] : '';
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        {mediaUrl ? (
                          <div 
                            className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 cursor-pointer border shadow-sm group relative"
                            onClick={() => setPreviewPost(p)}
                          >
                            <img 
                              src={mediaUrl.startsWith('http') ? mediaUrl : `https://meter.caffe.id/uploads/${mediaUrl}`} 
                              alt="media" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Eye size={16} className="text-white opacity-0 group-hover:opacity-100" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-slate-100 border flex items-center justify-center text-slate-400 text-xs text-center p-1">No Media</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{p.user?.username || '—'}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{p.user?.email || '—'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="line-clamp-2 text-sm text-slate-700">{p.caption || '-'}</div>
                        {p.hashtags && p.hashtags !== 'null' && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {(() => {
                              try {
                                const h = JSON.parse(p.hashtags);
                                return h.map((t, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium border border-blue-100">
                                    {t}
                                  </span>
                                ));
                              } catch(e) { return null; }
                            })()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium line-clamp-1">{p.location_name || '-'}</div>
                        {p.is_location_verified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">Verified</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                          ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                            p.status === 'archived' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                            p.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200/60' :
                            'bg-slate-50 text-slate-600 border-slate-200'}`}
                        >
                          {p.status === 'active' && <CheckCircle size={12} />}
                          {p.status === 'archived' && <Archive size={12} />}
                          {p.status === 'suspended' && <Ban size={12} />}
                          {p.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(p.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Preview"
                            onClick={() => setPreviewPost(p)}
                          >
                            <Eye size={16} />
                          </Button>
                          
                          {p.status !== 'active' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                              title="Aktifkan"
                              onClick={() => handleStatusChange(p.id, 'active')}
                            >
                              <CheckCircle size={16} />
                            </Button>
                          )}
                          
                          {p.status !== 'archived' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Arsipkan"
                              onClick={() => handleStatusChange(p.id, 'archived')}
                            >
                              <Archive size={16} />
                            </Button>
                          )}

                          {p.status !== 'suspended' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Suspend (Tangguhkan)"
                              onClick={() => handleStatusChange(p.id, 'suspended')}
                            >
                              <Ban size={16} />
                            </Button>
                          )}

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Hapus Permanen"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Halaman {page} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="bg-white"
              >
                Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewPost} onOpenChange={(v) => !v && setPreviewPost(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Preview Postingan</DialogTitle>
          </DialogHeader>
          {previewPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                   <img 
                      src={previewPost.user?.profile_image ? (previewPost.user.profile_image.startsWith('http') ? previewPost.user.profile_image : `https://meter.caffe.id/uploads/${previewPost.user.profile_image}`) : `https://ui-avatars.com/api/?name=${previewPost.user?.username}`} 
                      alt="avatar" 
                      className="w-full h-full object-cover" 
                   />
                </div>
                <div>
                  <div className="font-semibold">{previewPost.user?.username}</div>
                  <div className="text-xs text-slate-500">{formatDate(previewPost.created_at)}</div>
                </div>
              </div>
              <p className="text-sm">{previewPost.caption}</p>
              
              {previewPost.media_url && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {previewPost.media_url.split(',').map((url, i) => {
                     const mUrl = url.startsWith('http') ? url : `https://meter.caffe.id/uploads/${url}`;
                     // if video
                     if (url.endsWith('.mp4') || url.endsWith('.mov')) {
                       return <video key={i} src={mUrl} controls className="w-full aspect-[3/4] object-cover rounded-lg border" />
                     }
                     return <img key={i} src={mUrl} alt="media" className="w-full aspect-[3/4] object-cover rounded-lg border" />
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
