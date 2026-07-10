import { useState } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Save, Loader2, Wifi, Play, CircleCheck, CircleX } from 'lucide-react';
import { useToast } from '../components/ui/toast';

function fmtDt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

export default function WiFiSettingsPage() {
  return (
    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">Pengaturan WiFi</TabsTrigger>
        <TabsTrigger value="credentials">Kredensial Aktif</TabsTrigger>
        <TabsTrigger value="logs">Log</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      <TabsContent value="credentials" className="mt-4"><CredentialsTab /></TabsContent>
      <TabsContent value="logs" className="mt-4"><LogsTab /></TabsContent>
    </Tabs>
  );
}

function SettingsTab() {
  const toast = useToast();
  const { data: settingsData, loading: settingsLoading, refetch: refetchSettings } = useFetch('/settings');
  const { data: integData, loading: integLoading, refetch: refetchInteg } = useFetch('/integrations');

  const [edited, setEdited] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const settings = settingsData?.settings || [];
  const integrations = integData?.integrations || [];


  const mikrotikInt = integrations.find(i => i.provider === 'mikrotik_radius');
  const mikrotikCfg = mikrotikInt
    ? (typeof mikrotikInt.config === 'string' ? JSON.parse(mikrotikInt.config) : mikrotikInt.config || {})
    : {};

  const wifiSettings = settings.filter(s =>
    ['wifi_ssid', 'wifi_credential_duration_hours', 'wifi_password_length'].includes(s.setting_key)
  );

  const handleChange = (key, value) => {
    setEdited(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    if (Object.keys(edited).length === 0) return;
    setSaving(true);
    try {
      const items = Object.entries(edited).map(([key, value]) => ({ key, value }));
      await api.put('/settings', { settings: items });
      setEdited({});
      refetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMikrotik = async () => {
    setSaving(true);
    try {
      if (mikrotikInt) {
        const currentConfig = typeof mikrotikInt.config === 'string'
          ? JSON.parse(mikrotikInt.config) : (mikrotikInt.config || {});
        await api.put(`/integrations/${mikrotikInt.id}`, { config: { ...currentConfig, ...edited } });
      }
      setEdited({});
      refetchInteg();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan konfigurasi MikroTik');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!mikrotikInt) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(`/integrations/${mikrotikInt.id}/test`);
      setTestResult({ success: true, data: res.data.result });
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setTesting(false);
    }
  };

  const getVal = (key) => {
    if (edited[key] !== undefined) return edited[key];
    const s = settings.find(s => s.setting_key === key);
    return s ? s.setting_value : '';
  };

  if (settingsLoading || integLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="w-4 h-4" /> Pengaturan WiFi Hotspot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {wifiSettings.map(s => (
            <div key={s.setting_key} className="space-y-1.5">
              <label className="text-sm font-medium">{s.label}</label>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <Input
                type={s.setting_type === 'number' ? 'number' : 'text'}
                value={getVal(s.setting_key)}
                onChange={e => handleChange(s.setting_key, e.target.value)}
              />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={saving || Object.keys(edited).length === 0}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Simpan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="w-4 h-4" /> Koneksi MikroTik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!mikrotikInt ? (
            <div className="text-sm text-muted-foreground">
              Belum ada konfigurasi MikroTik.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Host/IP MikroTik</label>
                  <Input value={mikrotikCfg.host || ''} onChange={e => handleChange('host', e.target.value)} placeholder="192.168.88.1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipe Koneksi</label>
                  <select
                    value={mikrotikCfg.connection_type || 'rest'}
                    onChange={e => handleChange('connection_type', e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="rest">REST API (v7+)</option>
                    <option value="ssh">SSH</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Username Login</label>
                  <Input value={mikrotikCfg.username || ''} onChange={e => handleChange('username', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Password Login</label>
                  <Input type="password" value={mikrotikCfg.password || ''} onChange={e => handleChange('password', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Port API (REST)</label>
                  <Input type="number" value={mikrotikCfg.api_port || ''} onChange={e => handleChange('api_port', e.target.value)} placeholder="80" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Port SSH</label>
                  <Input type="number" value={mikrotikCfg.ssh_port || ''} onChange={e => handleChange('ssh_port', e.target.value)} placeholder="22" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Profile Hotspot</label>
                  <Input value={mikrotikCfg.profile || 'default'} onChange={e => handleChange('profile', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Gunakan HTTPS</label>
                  <select
                    value={mikrotikCfg.use_ssl ? 'true' : 'false'}
                    onChange={e => handleChange('use_ssl', e.target.value === 'true')}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="false">Tidak</option>
                    <option value="true">Ya</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                    Test Koneksi
                  </Button>
                  {testResult && (
                    <span className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.success ? <CircleCheck className="w-3.5 h-3.5" /> : <CircleX className="w-3.5 h-3.5" />}
                      {testResult.success ? 'Terhubung' : testResult.error}
                    </span>
                  )}
                </div>
                <Button size="sm" onClick={handleSaveMikrotik} disabled={saving || Object.keys(edited).length === 0}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Simpan Konfigurasi
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CredentialsTab() {
  const { data, loading } = useFetch('/integrations/wifi');
  const credentials = data?.credentials || [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>SSID</TableHead>
              <TableHead>Untuk</TableHead>
              <TableHead>Berlaku</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Belum ada kredensial WiFi.
                </TableCell>
              </TableRow>
            )}
            {credentials.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.username}</TableCell>
                <TableCell className="font-mono text-sm">{c.password}</TableCell>
                <TableCell className="text-sm">{c.ssid}</TableCell>
                <TableCell className="text-sm">
                  {c.booking_id ? `Booking #${c.booking_id}` : c.order_id ? `Order #${c.order_id}` : '—'}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {fmtDt(c.valid_from)} — {fmtDt(c.valid_until)}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    c.status === 'active' ? 'default' :
                    c.status === 'expired' ? 'secondary' : 'destructive'
                  }>
                    {c.status === 'active' ? 'Aktif' : c.status === 'expired' ? 'Expired' : 'Revoked'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LogsTab() {
  const { data, loading } = useFetch('/integrations/logs');
  const logs = data?.logs || [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Referensi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pesan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Belum ada log.
                </TableCell>
              </TableRow>
            )}
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-sm whitespace-nowrap">{fmtDt(log.created_at)}</TableCell>
                <TableCell className="text-sm">{log.trigger_event || '—'}</TableCell>
                <TableCell className="text-sm">
                  {log.reference_type ? `${log.reference_type}#${log.reference_id}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                    {log.status === 'success' ? 'OK' : 'Gagal'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                  {log.error_message || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
