import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import {
  Database, Download, Save, Trash2, Loader2, RefreshCw,
  CheckCircle2, AlertTriangle, HardDrive,
} from 'lucide-react';

function formatSize(kb) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function BackupPage() {
  const toast = useToast();
  const { data: tableData, loading: loadingTables } = useFetch('/backup/tables');
  const { data: historyData, loading: loadingHistory, refetch: refetchHistory } = useFetch('/backup/history');
  const [selectedTables, setSelectedTables] = useState([]); // empty = all
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingName, setDeletingName] = useState(null);

  const tables = tableData?.tables || [];
  const files = historyData?.files || [];

  const totalRows = tables.reduce((s, t) => s + Number(t.row_count || 0), 0);
  const totalSizeKb = tables.reduce((s, t) => s + Number(t.size_kb || 0), 0);

  const toggleTable = (name) => {
    setSelectedTables(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };
  const selectAll = () => setSelectedTables([]);
  const isAllSelected = selectedTables.length === 0;

  // Download backup as .sql file
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.post('/backup/export',
        { tables: selectedTables },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `backup_${ts}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup berhasil diunduh');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Export gagal');
    } finally { setExporting(false); }
  };

  // Save backup to server disk
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/backup/save');
      toast.success(`Backup disimpan: ${res.data.filename} (${formatSize(res.data.size_kb)})`);
      refetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Gagal menyimpan backup');
    } finally { setSaving(false); }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Hapus file backup "${name}"?`)) return;
    setDeletingName(name);
    try {
      await api.delete(`/backup/history/${name}`);
      toast.success('File backup dihapus');
      refetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Gagal menghapus');
    } finally { setDeletingName(null); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold">Backup Database</h1>
        <p className="text-sm text-muted-foreground">Export dan simpan data café ke file SQL</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Database className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Tabel</p>
              <p className="text-xl font-bold">{tables.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Ukuran DB</p>
              <p className="text-xl font-bold">{formatSize(totalSizeKb)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-violet-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total Baris</p>
              <p className="text-xl font-bold">{totalRows.toLocaleString('id')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Export Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Table selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Pilih Tabel</p>
              <button onClick={selectAll} className="text-xs text-primary hover:underline">
                {isAllSelected ? '✓ Semua tabel dipilih' : 'Pilih Semua'}
              </button>
            </div>
            {loadingTables ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-52 overflow-y-auto">
                {tables.map(t => {
                  const sel = isAllSelected || selectedTables.includes(t.table_name);
                  return (
                    <button key={t.table_name} type="button"
                      onClick={() => toggleTable(t.table_name)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs text-left transition-all ${
                        sel ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}>
                      <span className="truncate font-mono">{t.table_name}</span>
                      <span className="shrink-0 ml-1 opacity-60">{Number(t.row_count||0).toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {!isAllSelected && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {selectedTables.length} tabel dipilih
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleExport} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download .sql
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan ke Server
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Download</strong> — unduh langsung ke komputer. <strong>Simpan ke Server</strong> — simpan di folder <code className="font-mono bg-muted px-1 rounded">backups/</code> di server.
          </p>
        </CardContent>
      </Card>

      {/* Backup history */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Riwayat Backup di Server</CardTitle>
            <Button size="sm" variant="ghost" onClick={refetchHistory} className="h-7 px-2 gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Belum ada backup tersimpan di server</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div key={f.name} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30">
                  <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(f.created_at)} · {formatSize(f.size_kb)}</p>
                  </div>
                  <Button size="sm" variant="ghost"
                    disabled={deletingName === f.name}
                    onClick={() => handleDelete(f.name)}
                    className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 shrink-0">
                    {deletingName === f.name
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Keamanan Backup</p>
          <p className="mt-0.5 text-amber-600">File backup berisi seluruh data termasuk password yang di-hash. Simpan di tempat yang aman. Jangan expose endpoint ini ke publik.</p>
        </div>
      </div>
    </div>
  );
}
