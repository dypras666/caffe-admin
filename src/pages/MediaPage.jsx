import { useState, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { cn } from "../lib/utils";
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Upload, Trash2, Loader2, Image, Copy, Check, Eye, ExternalLink, QrCode, FileText } from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

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
  const [previewFile, setPreviewFile] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const fileRef = useRef();

  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const getShareUrl = (f) => {
    if (!f) return '';
    return `${window.location.origin}/m/${f.file_path || f.original_name}`;
  };

  const files = data?.files || data?.media || [];

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
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload File
          </Button>
        </div>
      </div>

      {/* Drag & drop area */}
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-6",
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <Image className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Klik atau drop file di sini</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Image, PDF, Word, PPT hingga 20MB</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map(f => (
            <Card key={f.id} className="overflow-hidden group">
              <div className="aspect-square bg-secondary relative">
                {f.url && f.mime_type?.startsWith('image/') ? (
                  <img src={f.url} alt={f.file_name} className="w-full h-full object-cover" loading="lazy" />
                ) : f.url ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                    <FileText className="w-8 h-8 text-muted-foreground/60 mb-1" />
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">{f.file_type || 'DOC'}</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewFile(f)}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 text-white"
                    title="Preview Gambar"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyUrl(getShareUrl(f))}
                    className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 text-white"
                    title="Copy Link Share"
                  >
                    {copiedId === getShareUrl(f) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => {
        if (!open) { setPreviewFile(null); setShowQr(false); }
      }}>
        <DialogContent className="max-w-3xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(26,26,27,1)] p-0 overflow-hidden bg-white/95 backdrop-blur">
          <DialogHeader className="p-4 border-b-2 border-black bg-white pr-10">
            <DialogTitle className="font-mono text-sm uppercase flex items-center justify-between gap-4">
              <span className="truncate">{previewFile?.file_name || previewFile?.original_name}</span>
              <div className="flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setShowQr(!showQr)} 
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-black text-white rounded hover:bg-black/80"
                >
                  <QrCode className="w-3 h-3" /> {showQr ? 'Tutup QR' : 'Generate QR'}
                </button>
                {previewFile && (
                  <a href={getShareUrl(previewFile)} target="_blank" rel="noopener noreferrer" className="text-bauhaus-blue hover:underline flex items-center gap-1 text-xs font-bold">
                    <ExternalLink className="w-3 h-3" /> Buka Tab Baru
                  </a>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[50vh] relative">
            {showQr && previewFile ? (
              <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(26,26,27,1)]">
                <QRCodeSVG value={getShareUrl(previewFile)} size={200} />
                <p className="mt-4 text-xs font-mono break-all max-w-[250px] text-center text-muted-foreground">
                  {getShareUrl(previewFile)}
                </p>
                <button 
                  onClick={() => copyUrl(getShareUrl(previewFile))}
                  className="mt-4 flex items-center gap-2 text-xs bg-black text-white px-4 py-2 rounded font-bold hover:bg-black/80"
                >
                  {copiedId === getShareUrl(previewFile) ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  Copy Link Share
                </button>
              </div>
            ) : previewFile?.url && previewFile?.mime_type?.startsWith('image/') ? (
              <img 
                src={previewFile.url} 
                alt={previewFile.file_name} 
                className="max-w-full max-h-[70vh] object-contain shadow-md"
              />
            ) : previewFile?.url ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-black max-w-sm w-full">
                <FileText className="w-24 h-24 text-muted-foreground/30 mb-6" />
                <p className="text-sm font-mono text-center font-bold">{previewFile.file_name || previewFile.original_name}</p>
                <a href={getShareUrl(previewFile)} target="_blank" rel="noopener noreferrer" className="mt-4 px-4 py-2 bg-black text-white rounded text-xs hover:bg-black/80 inline-flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Buka Dokumen
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <Image className="w-12 h-12 mb-2 opacity-50" />
                <p>Gambar tidak tersedia</p>
              </div>
            )}
            
            {/* File Info */}
            {!showQr && (
              <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur border border-black text-xs font-mono p-2 shadow-sm rounded-md pointer-events-none">
                <p>Type: {previewFile?.mime_type || previewFile?.file_type}</p>
                <p>Size: {formatSize(previewFile?.file_size || previewFile?.size)}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
