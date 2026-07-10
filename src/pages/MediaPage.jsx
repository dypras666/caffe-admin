import { useState, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Upload, Trash2, Loader2, Image, Copy, Check } from 'lucide-react';
import { useToast } from '../components/ui/toast';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const toast = useToast();
  const { data, loading, refetch } = useFetch('/media');
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef();

  const files = data?.media || [];

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    try {
      for (const file of selected) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload gagal');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus file ini?')) return;
    try {
      await api.delete(`/media/${id}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(url);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{files.length} file</span>
        <div className="ml-auto">
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Mengupload...' : 'Upload Gambar'}
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleUpload({ target: fileRef.current }); }}
      >
        <Image className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Klik atau drop gambar di sini</p>
        <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP, GIF hingga 5MB</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map(f => (
            <Card key={f.id} className="overflow-hidden group">
              <div className="aspect-square bg-secondary relative">
                {f.url ? (
                  <img src={f.url} alt={f.file_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => copyUrl(f.url)}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 text-white"
                    title="Copy URL"
                  >
                    {copiedId === f.url ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1.5 bg-red-500/70 rounded-lg hover:bg-red-600 text-white"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{f.file_name || f.original_name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(f.file_size)}</p>
              </CardContent>
            </Card>
          ))}
          {files.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground text-sm py-8">
              Belum ada file yang diupload
            </div>
          )}
        </div>
      )}
    </div>
  );
}
