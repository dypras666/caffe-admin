import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, GripVertical, ExternalLink, Eye, EyeOff,
  Loader2, Save, X, Link as LinkIcon, Type, ArrowUpDown, Globe,
} from 'lucide-react';
import api from '../lib/api';

const ICON_OPTIONS = [
  'Home', 'UtensilsCrossed', 'FileText', 'Eye', 'Coffee',
  'CalendarCheck', 'Image', 'Phone', 'ShoppingBag', 'MapPin',
  'Star', 'Heart', 'Info', 'Globe', 'Mail', 'MessageSquare',
  'Users', 'Clock', 'Gift', 'Ticket', 'Music', 'Video',
];

const emptyForm = { label: '', url: '', icon: 'Globe', target: '_self', is_active: true };

export default function NavigationPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [dragId, setDragId] = useState(null);

  const fetchMenus = useCallback(async () => {
    try {
      const { data } = await api.get('/navigation/all');
      setMenus(data.menus || []);
    } catch (e) {
      console.error('Fetch navigation error:', e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/navigation/${editId}`, form);
      } else {
        await api.post('/navigation', form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...emptyForm });
      fetchMenus();
    } catch (e) {
      alert(e?.response?.data?.error || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setForm({
      label: item.label,
      url: item.url,
      icon: item.icon || 'Globe',
      target: item.target || '_self',
      is_active: !!item.is_active,
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus menu ini?')) return;
    try {
      await api.delete(`/navigation/${id}`);
      fetchMenus();
    } catch (e) {
      alert('Gagal menghapus');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.put(`/navigation/${item.id}`, {
        ...item,
        is_active: !item.is_active,
      });
      fetchMenus();
    } catch (e) {
      alert('Gagal mengubah status');
    }
  };

  // Drag & drop reorder
  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (targetId) => {
    if (dragId === targetId) return;
    const items = [...menus];
    const dragIdx = items.findIndex(i => i.id === dragId);
    const targetIdx = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(dragIdx, 1);
    items.splice(targetIdx, 0, moved);

    const reordered = items.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setMenus(reordered);
    setDragId(null);

    try {
      await api.patch('/navigation/reorder', {
        items: reordered.map(i => ({ id: i.id, sort_order: i.sort_order })),
      });
    } catch (e) {
      console.error('Reorder error:', e);
      fetchMenus();
    }
  };

  const moveItem = async (id, direction) => {
    const items = [...menus];
    const idx = items.findIndex(i => i.id === id);
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === items.length - 1)) return;
    [items[idx], items[idx + direction]] = [items[idx + direction], items[idx]];
    const reordered = items.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setMenus(reordered);
    try {
      await api.patch('/navigation/reorder', {
        items: reordered.map(i => ({ id: i.id, sort_order: i.sort_order })),
      });
    } catch { fetchMenus(); }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3E2723', margin: 0 }}>
            Navigasi Menu
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#8D6E63', margin: '4px 0 0' }}>
            Kelola menu navigasi yang tampil di halaman depan
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setEditId(null); setShowForm(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#6F4E37', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Plus size={16} /> Tambah Menu
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1px solid #F5E6D3', borderRadius: 14,
          padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(111,78,55,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3E2723', margin: 0 }}>
              {editId ? 'Edit Menu' : 'Tambah Menu Baru'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8D6E63', display: 'block', marginBottom: 4 }}>
                <Type size={12} style={{ marginRight: 4 }} /> Label
              </label>
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="contoh: Home"
                required
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #F5E6D3', fontSize: '0.85rem', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8D6E63', display: 'block', marginBottom: 4 }}>
                <LinkIcon size={12} style={{ marginRight: 4 }} /> URL
              </label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="contoh: /blog atau /#menu"
                required
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #F5E6D3', fontSize: '0.85rem', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8D6E63', display: 'block', marginBottom: 4 }}>
                Icon
              </label>
              <select
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #F5E6D3', fontSize: '0.85rem', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box', background: '#fff',
                }}
              >
                {ICON_OPTIONS.map(ic => (
                  <option key={ic} value={ic}>{ic}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8D6E63', display: 'block', marginBottom: 4 }}>
                <ExternalLink size={12} style={{ marginRight: 4 }} /> Target
              </label>
              <select
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #F5E6D3', fontSize: '0.85rem', fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box', background: '#fff',
                }}
              >
                <option value="_self">Same Tab</option>
                <option value="_blank">New Tab</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#6F4E37' }}
                />
                Aktif
              </label>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1.5px solid #F5E6D3',
                  background: '#fff', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !form.label.trim() || !form.url.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#6F4E37', color: '#fff', fontSize: '0.85rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editId ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#8D6E63' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '1rem' }}>Memuat menu...</p>
        </div>
      ) : menus.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem', background: '#fff',
          borderRadius: 14, border: '1px solid #F5E6D3',
        }}>
          <Globe size={48} style={{ color: '#D7CCC8', marginBottom: '1rem' }} />
          <p style={{ color: '#8D6E63' }}>Belum ada menu navigasi</p>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #F5E6D3',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(111,78,55,0.06)',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '40px 1fr 1.5fr 80px 70px 120px',
            padding: '12px 16px', background: '#FAFAF6', borderBottom: '1px solid #F5E6D3',
            fontSize: '0.72rem', fontWeight: 700, color: '#8D6E63', textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            <span></span>
            <span>Label</span>
            <span>URL</span>
            <span>Target</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Aksi</span>
          </div>

          {/* Menu Items */}
          {menus.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(item.id)}
              style={{
                display: 'grid', gridTemplateColumns: '40px 1fr 1.5fr 80px 70px 120px',
                padding: '12px 16px', alignItems: 'center',
                borderBottom: idx < menus.length - 1 ? '1px solid #F5E6D3' : 'none',
                background: dragId === item.id ? 'rgba(111,78,55,0.04)' : 'transparent',
                opacity: item.is_active ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <GripVertical size={16} style={{ color: '#D7CCC8', cursor: 'grab' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <button onClick={() => moveItem(item.id, -1)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: '#8D6E63', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => moveItem(item.id, 1)} disabled={idx === menus.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: '#8D6E63', opacity: idx === menus.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>
              </div>

              {/* Label */}
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3E2723' }}>
                {item.label}
              </div>

              {/* URL */}
              <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontFamily: 'monospace' }}>
                {item.url}
              </div>

              {/* Target */}
              <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>
                {item.target === '_blank' ? '↗ New Tab' : '→ Same'}
              </div>

              {/* Status */}
              <div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: item.is_active ? 'rgba(76,175,80,0.12)' : 'rgba(0,0,0,0.06)',
                  color: item.is_active ? '#2E7D32' : '#999',
                }}>
                  {item.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button onClick={() => handleToggleActive(item)}
                  title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  style={{
                    background: 'none', border: '1px solid #F5E6D3', borderRadius: 8,
                    padding: 6, cursor: 'pointer', display: 'flex', color: '#8D6E63',
                  }}>
                  {item.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => handleEdit(item)}
                  style={{
                    background: 'none', border: '1px solid #F5E6D3', borderRadius: 8,
                    padding: 6, cursor: 'pointer', display: 'flex', color: '#6F4E37',
                  }}>
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none', border: '1px solid #FFCDD2', borderRadius: 8,
                    padding: 6, cursor: 'pointer', display: 'flex', color: '#C62828',
                  }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem 1.25rem', borderRadius: 10,
        background: 'rgba(111,78,55,0.04)', border: '1px solid rgba(111,78,55,0.1)',
        fontSize: '0.8rem', color: '#8D6E63', lineHeight: 1.6,
      }}>
        <strong>💡 Petunjuk:</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
          <li>URL dengan <code>/#section</code> akan scroll ke bagian tertentu di halaman utama (Home, Menu, dll)</li>
          <li>URL dengan <code>/path</code> akan mengarahkan ke halaman terpisah (Blog, dll)</li>
          <li>URL dengan <code>https://...</code> akan mengarahkan ke situs lain</li>
          <li>Drag & drop atau gunakan panah ▲▼ untuk mengubah urutan menu</li>
        </ul>
      </div>
    </div>
  );
}
