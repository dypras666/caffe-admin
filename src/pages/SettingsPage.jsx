import { useState, useEffect } from 'react';
import { useFetch } from '../hooks/useApi';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Save, Loader2 } from 'lucide-react';

const GROUPS = ['general', 'contact', 'social', 'appearance', 'payment', 'notification', 'booking', 'table', 'pos', 'member', 'storage', 'other'];
const GROUP_LABEL = {
  general: 'Umum', contact: 'Kontak', social: 'Sosial Media', appearance: 'Tampilan',
  payment: 'Pembayaran', notification: 'Notifikasi', booking: 'Booking',
  table: 'Pengaturan Meja', pos: 'POS Kasir', member: 'Member', storage: 'Storage & File', other: 'Lainnya',
};
const TYPES = ['text', 'number', 'boolean', 'json', 'password', 'select', 'image', 'color'];

const EMPTY_NEW = { setting_key: '', setting_value: '', setting_type: 'text', setting_group: 'general', label: '', is_public: false };

export default function SettingsPage() {
  const { data, loading, refetch } = useFetch('/settings');
  const [edited, setEdited] = useState({});
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSetting, setNewSetting] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [activeGroup, setActiveGroup] = useState('general');

  const settings = data?.settings || [];

  const grouped = settings.reduce((acc, s) => {
    const g = s.setting_group || 'other';
    if (!acc[g]) acc[g] = [];
    acc[g].push(s);
    return acc;
  }, {});

  const groups = Object.keys(grouped);

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
      // Notify sidebar to reload feature flags
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/settings', newSetting);
      setAddOpen(false);
      setNewSetting(EMPTY_NEW);
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah setting');
    } finally {
      setCreating(false);
    }
  };

  const renderInput = (setting) => {
    const val = edited[setting.setting_key] !== undefined ? edited[setting.setting_key] : setting.setting_value;
    const onChange = (v) => handleChange(setting.setting_key, v);

    if (setting.setting_type === 'boolean') {
      const isOn = val === true || val === 'true' || val === 1 || val === '1';
      return (
        <div className="flex gap-2">
          <button type="button" onClick={() => onChange('true')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              isOn ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-muted text-muted-foreground border-border hover:border-emerald-400'
            }`}>
            Aktif
          </button>
          <button type="button" onClick={() => onChange('false')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
              !isOn ? 'bg-destructive text-white border-destructive shadow-sm' : 'bg-muted text-muted-foreground border-border hover:border-destructive/50'
            }`}>
            Nonaktif
          </button>
        </div>
      );
    }
    if (setting.setting_type === 'color') {
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={val || '#6F4E37'} onChange={e => onChange(e.target.value)} className="h-9 w-16 rounded cursor-pointer border" />
          <Input value={val || ''} onChange={e => onChange(e.target.value)} className="flex-1" />
        </div>
      );
    }
    if (setting.setting_type === 'json') {
      return (
        <textarea
          value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm font-mono resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      );
    }
    if (setting.setting_type === 'password') {
      return (
        <Input
          type="password"
          value={val || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
        />
      );
    }
    if (setting.setting_type === 'select') {
      let options = [];
      try { options = JSON.parse(setting.setting_value || '[]'); } catch { options = []; }
      return (
        <select
          value={val || ''}
          onChange={e => onChange(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          {options.map((opt, i) => (
            <option key={i} value={opt.value !== undefined ? opt.value : opt}>
              {opt.label !== undefined ? opt.label : opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <Input
        type={setting.setting_type === 'number' ? 'number' : 'text'}
        value={val || ''}
        onChange={e => onChange(e.target.value)}
      />
    );
  };

  const activeGroupSettings = grouped[activeGroup] || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                activeGroup === g
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {GROUP_LABEL[g] || g}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Tambah Setting
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || Object.keys(edited).length === 0}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Perubahan
            {Object.keys(edited).length > 0 && (
              <span className="ml-1 bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {Object.keys(edited).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {activeGroupSettings.map(setting => (
            <Card key={setting.setting_key} className={edited[setting.setting_key] !== undefined ? 'ring-1 ring-primary' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div>
                    <p className="text-sm font-medium">{setting.label || setting.setting_key}</p>
                    <p className="text-xs font-mono text-muted-foreground">{setting.setting_key}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{setting.setting_type}</Badge>
                    {setting.is_public ? <Badge variant="success" className="text-[10px]">Public</Badge> : null}
                  </div>
                </div>
                {renderInput(setting)}
              </CardContent>
            </Card>
          ))}
          {activeGroupSettings.length === 0 && (
            <div className="md:col-span-2 text-center text-muted-foreground py-12">
              Tidak ada setting di grup ini
            </div>
          )}
        </div>
      )}

      {/* Add new setting dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Setting Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Setting Key *</label>
              <Input placeholder="misal: cafe_tagline" value={newSetting.setting_key} onChange={e => setNewSetting(s => ({ ...s, setting_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label *</label>
              <Input placeholder="misal: Tagline Cafe" value={newSetting.label} onChange={e => setNewSetting(s => ({ ...s, label: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe</label>
                <Select value={newSetting.setting_type} onValueChange={v => setNewSetting(s => ({ ...s, setting_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grup</label>
                <Select value={newSetting.setting_group} onValueChange={v => setNewSetting(s => ({ ...s, setting_group: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nilai Awal</label>
              <Input value={newSetting.setting_value} onChange={e => setNewSetting(s => ({ ...s, setting_value: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_public_new" checked={newSetting.is_public} onChange={e => setNewSetting(s => ({ ...s, is_public: e.target.checked }))} />
              <label htmlFor="is_public_new" className="text-sm">Publik (dapat diakses tanpa login)</label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Tambah
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
