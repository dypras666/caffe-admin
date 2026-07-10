import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { useShiftGuard } from '../hooks/useShiftGuard';
import api from '../lib/api';
import { buildReceiptHTML, buildKitchenHTML, smartPrint } from '../lib/printer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ServerSelect } from '../components/ui/server-select';
import { Loader2, RefreshCw, ChevronLeft, ChevronRight, ShoppingBag, TrendingUp, Clock, XCircle, Printer, X, Plus, Minus, Trash2, AlertCircle, Scissors, FileSpreadsheet, FileText } from 'lucide-react';
import { exportOrdersPDF, exportOrdersExcel } from '../lib/export';

const STATUS_OPTIONS = ['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'];
const NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'completed' };
const STATUS_CLS = {
  pending: 'badge-status-pending', preparing: 'badge-status-preparing',
  ready: 'badge-status-ready', completed: 'badge-status-completed', cancelled: 'badge-status-cancelled',
};
const STATUS_LABEL = {
  pending: 'Pending', preparing: 'Diproses', ready: 'Siap',
  completed: 'Selesai', cancelled: 'Dibatalkan',
};

function formatRp(v) { return `Rp ${Number(v || 0).toLocaleString('id')}`; }
function formatDate(d) { return new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }); }

function buildSplitReceiptHTML(order, items, label) {
  const subtotal = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const ratio = Number(order.total) > 0 ? subtotal / Number(order.subtotal) : 1;
  const tax = Math.round(Number(order.tax || 0) * ratio);
  const discount = Math.round(Number(order.discount || 0) * ratio);
  const total = subtotal + tax - discount;
  const rows = items.map(i => `<div style="display:flex;justify-content:space-between;margin:3px 0"><span>${i.product_name} x${i.quantity}</span><span>Rp ${Number(i.subtotal||0).toLocaleString('id')}</span></div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm}.title{text-align:center;font-weight:bold;font-size:14px;margin-bottom:4px}.divider{border-top:1px dashed #000;margin:4px 0}.row{display:flex;justify-content:space-between;margin:2px 0}.bold{font-weight:bold}@media print{@page{margin:0;size:80mm auto}body{width:100%}}</style></head><body><div class="title">Split Bill — ${label}</div><div class="title" style="font-size:11px;font-weight:normal">${order.order_number}</div><div class="divider"></div>${rows}<div class="divider"></div><div class="row"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id')}</span></div>${tax > 0 ? `<div class="row"><span>Pajak</span><span>Rp ${tax.toLocaleString('id')}</span></div>` : ''}${discount > 0 ? `<div class="row"><span>Diskon</span><span>- Rp ${discount.toLocaleString('id')}</span></div>` : ''}<div class="divider"></div><div class="row bold"><span>TOTAL ${label}</span><span>Rp ${total.toLocaleString('id')}</span></div></body></html>`;
}

function SplitBillDialog({ order, onClose }) {
  const items = order.items || [];
  // group A = true, group B = false; default all in A
  const [groupA, setGroupA] = useState(() => new Set(items.map(i => i.id)));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = (id) => {
    setResult(null);
    setGroupA(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const itemsA = items.filter(i => groupA.has(i.id));
  const itemsB = items.filter(i => !groupA.has(i.id));
  const totalA = itemsA.reduce((s, i) => s + Number(i.subtotal || 0), 0);
  const totalB = itemsB.reduce((s, i) => s + Number(i.subtotal || 0), 0);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/orders/${order.id}/split`, {
        group_a: itemsA.map(i => i.id),
        group_b: itemsB.map(i => i.id),
      });
      setResult(r.data);
    } catch {
      // API might not exist yet; just show local result
      setResult({ local: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4" /> Split Bill — {order.order_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Centang item untuk Tagihan A. Item yang tidak dicentang masuk Tagihan B.</p>
          <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
            {items.map(item => (
              <label key={item.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm">
                <input type="checkbox" checked={groupA.has(item.id)} onChange={() => toggle(item.id)} className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.product_name} ×{item.quantity}</span>
                <span className="text-muted-foreground shrink-0">{formatRp(item.subtotal)}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="font-semibold text-xs mb-1">Tagihan A ({itemsA.length} item)</p>
              <p className="font-bold">{formatRp(totalA)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="font-semibold text-xs mb-1">Tagihan B ({itemsB.length} item)</p>
              <p className="font-bold">{formatRp(totalB)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleCalculate} disabled={loading || itemsA.length === 0 || itemsB.length === 0}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Hitung
            </Button>
          </div>
          {(result) && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                onClick={async () => await smartPrint(buildSplitReceiptHTML(order, itemsA, 'A'), null)}>
                <Printer className="w-3.5 h-3.5" /> Print Split A
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                onClick={async () => await smartPrint(buildSplitReceiptHTML(order, itemsB, 'B'), null)}>
                <Printer className="w-3.5 h-3.5" /> Print Split B
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelRequestsPanel({ onClose, onUpdated }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/orders/cancel-requests');
      setRequests(r.data.requests || r.data || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handle = async (id, action) => {
    setActionId(id);
    try {
      await api.put(`/orders/cancel-requests/${id}`, { action });
      onUpdated();
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal');
    } finally { setActionId(null); }
  };

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-80 xl:w-96 bg-card border-l shadow-xl z-40 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-sm">Permintaan Pembatalan</span>
          <button onClick={onClose} className="ml-2 shrink-0 rounded-md p-1 hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Tidak ada permintaan pembatalan</p>
          ) : requests.map(req => (
            <div key={req.id} className="border rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-primary text-xs">{req.order_number}</span>
                <span className={STATUS_CLS[req.order_status] || ''}>{STATUS_LABEL[req.order_status] || req.order_status}</span>
              </div>
              {req.reason && <p className="text-muted-foreground text-xs">Alasan: {req.reason}</p>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="destructive" className="flex-1 text-xs h-7"
                  disabled={!!actionId}
                  onClick={() => handle(req.id, 'approve')}>
                  {actionId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Setujui'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7"
                  disabled={!!actionId}
                  onClick={() => handle(req.id, 'reject')}>
                  Tolak
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function OrderDetailPanel({ orderId, onClose, onStatusUpdated }) {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const canUpdateStatus = can('update_status', 'orders');
  const canCancel = can('cancel', 'orders');
  const canUpdateOrder = can('update_status', 'orders'); // edit items = part of order update
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addQty, setAddQty] = useState(1);
  const [variantProduct, setVariantProduct] = useState(null); // product needing variant selection
  // Cancel request dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelRequestSent, setCancelRequestSent] = useState(false);
  // Split bill
  const [splitOpen, setSplitOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    setLoadingDetail(true);
    try {
      const r = await api.get(`/orders/${orderId}`);
      setDetail(r.data.order);
    } catch { setDetail(null); }
    finally { setLoadingDetail(false); }
  }, [orderId]);

  useEffect(() => {
    setDetail(null);
    setEditMode(false);
    setCancelRequestSent(false);
    setSplitOpen(false);
    loadDetail();
  }, [orderId, loadDetail]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      await loadDetail();
      onStatusUpdated();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async () => {
    const status = detail?.order_status;
    if (status === 'pending') {
      if (!confirm('Batalkan pesanan ini?')) return;
      setUpdatingId(orderId);
      try {
        await api.put(`/orders/${orderId}/status`, { status: 'cancelled' });
        await loadDetail();
        onStatusUpdated();
      } catch (err) {
        alert(err.response?.data?.error || 'Gagal membatalkan');
      } finally { setUpdatingId(null); }
    } else {
      // preparing / ready → open dialog
      setCancelReason('');
      setCancelDialogOpen(true);
    }
  };

  const handleCancelRequest = async () => {
    setUpdatingId(orderId);
    try {
      await api.post(`/orders/${orderId}/cancel-request`, { reason: cancelReason });
      setCancelDialogOpen(false);
      setCancelRequestSent(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengirim permintaan');
    } finally { setUpdatingId(null); }
  };

  const startEdit = () => {
    setEditItems((detail.items || []).map(i => ({ ...i, _qty: i.quantity })));
    setEditMode(true);
    setAddingItem(false);
    setSelectedProduct(null);
    setAddQty(1);
  };

  const changeQty = (idx, delta) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(1, item._qty + delta);
      return { ...item, _qty: newQty };
    }));
  };

  const removeItem = (idx) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddItemToEdit = () => {
    if (!selectedProduct) return;
    setEditItems(prev => {
      const existing = prev.findIndex(i => i.product_id === selectedProduct.id);
      if (existing >= 0) {
        return prev.map((item, i) => i === existing ? { ...item, _qty: item._qty + addQty } : item);
      }
      return [...prev, {
        id: null,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        unit_price: selectedProduct.price || selectedProduct.selling_price || 0,
        subtotal: (selectedProduct.price || selectedProduct.selling_price || 0) * addQty,
        quantity: addQty,
        _qty: addQty,
        addons_selected: null,
        notes: '',
      }];
    });
    setSelectedProduct(null);
    setAddQty(1);
    setAddingItem(false);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const items = editItems.map(i => ({
        id: i.id,
        product_id: i.product_id,
        quantity: i._qty,
        ...(i._variants?.length ? { variants: i._variants.map(v => ({ group_id: v.group_id, option_id: v.option_id })) } : {}),
        ...(i._addons?.length ? { addons: i._addons.map(a => ({ addon_id: a.addon_id, qty: a.qty })) } : {}),
      }));
      await api.put(`/orders/${orderId}/items`, { items });
      await loadDetail();
      onStatusUpdated();
      setEditMode(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan');
    } finally { setSavingEdit(false); }
  };

  const handleAddItemPreparing = async () => {
    if (!selectedProduct) return;
    setUpdatingId(orderId);
    try {
      await api.post(`/orders/${orderId}/add-item`, {
        product_id: selectedProduct.id,
        quantity: addQty,
      });
      await loadDetail();
      onStatusUpdated();
      setAddingItem(false);
      setSelectedProduct(null);
      setAddQty(1);
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menambah item');
    } finally { setUpdatingId(null); }
  };

  const parseJSON = (str) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  };

  const cancelBtnLabel = detail && ['preparing', 'ready'].includes(detail.order_status) ? 'Minta Batalkan' : 'Batalkan';

  const handleVariantConfirm = (variants, addons) => {
    if (!variantProduct) return;
    const mod = variants.reduce((s, v) => s + (v.price_modifier || 0), 0);
    const addonsUnit = addons.reduce((s, a) => s + (a.unit_price || 0) * (a.qty || 1), 0);
    const unitPrice = parseFloat(variantProduct.price) + mod;
    const varLabel = variants.map(v => v.option_name).join(', ');
    const name = varLabel ? `${variantProduct.name} (${varLabel})` : variantProduct.name;
    const product = { ...variantProduct, name, price: unitPrice };

    // Directly add to editItems (don't go through selectedProduct state)
    setEditItems(prev => {
      const existing = prev.findIndex(i => i.product_id === product.id && i.product_name === name);
      if (existing >= 0) {
        return prev.map((item, i) => i === existing ? { ...item, _qty: item._qty + addQty } : item);
      }
      return [...prev, {
        id: null,
        product_id: product.id,
        product_name: name,
        unit_price: unitPrice,
        subtotal: unitPrice * addQty,
        quantity: addQty,
        _qty: addQty,
        _variants: variants,
        _addons: addons,
        variants_selected: variants.length ? JSON.stringify(variants) : null,
        addons_selected: addons.length ? JSON.stringify(addons) : null,
        notes: '',
      }];
    });
    setVariantProduct(null);
    setAddingItem(false);
    setAddQty(1);
  };

  return (
    <>
      {splitOpen && detail && <SplitBillDialog order={detail} onClose={() => setSplitOpen(false)} />}

      {variantProduct && (
        <OrderVariantPicker
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
          onConfirm={handleVariantConfirm}
        />
      )}

      {/* Cancel request dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Minta Pembatalan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Masukkan alasan pembatalan pesanan ini. Permintaan akan dikirim ke owner untuk disetujui.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Alasan pembatalan..."
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCancelDialogOpen(false)}>Batal</Button>
              <Button size="sm" variant="destructive" disabled={!!updatingId || !cancelReason.trim()} onClick={handleCancelRequest}>
                {updatingId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Kirim Permintaan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-80 xl:w-96 bg-card border-l shadow-xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          {detail ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-sm font-semibold text-primary truncate">{detail.order_number}</span>
              <span className={`${STATUS_CLS[detail.order_status]} shrink-0`}>{STATUS_LABEL[detail.order_status]}</span>
            </div>
          ) : (
            <span className="text-sm font-semibold">Detail Pesanan</span>
          )}
          <button onClick={onClose} className="ml-2 shrink-0 rounded-md p-1 hover:bg-muted transition-colors" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loadingDetail ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !detail ? (
            <div className="flex justify-center items-center h-40 text-sm text-muted-foreground">Gagal memuat detail</div>
          ) : (
            <div className="px-4 py-3 space-y-4">
              {/* Cancel request sent notice */}
              {cancelRequestSent && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Permintaan pembatalan dikirim ke owner
                </div>
              )}

              {/* Customer info */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span className="font-medium">{detail.customer_name || 'Walk-in'}</span>
                </div>
                {detail.branch_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cabang</span>
                    <span>{detail.branch_name}</span>
                  </div>
                )}
                {detail.table_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meja</span>
                    <span>{detail.table_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipe</span>
                  <span className="capitalize">{detail.order_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu</span>
                  <span>{formatDate(detail.created_at)}</span>
                </div>
              </div>

              {/* Items — Edit Mode */}
              {editMode ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edit Item</p>
                  </div>
                  <div className="space-y-2">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1.5">
                        <span className="flex-1 text-xs leading-tight">{item.product_name}</span>
                        <button type="button" onClick={() => changeQty(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item._qty}</span>
                        <button type="button" onClick={() => changeQty(idx, 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => removeItem(idx)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add item to edit */}
                  {addingItem ? (
                    <div className="mt-2 space-y-2">
                      <ServerSelect
                        endpoint="/products"
                        value={selectedProduct?.id?.toString() || ''}
                        displayValue={selectedProduct?.name || ''}
                        onChange={p => {
                          if (p.has_variants || p.has_addons || p.variant_groups?.length || p.addon_groups?.length) {
                            setVariantProduct(p);
                          } else {
                            setSelectedProduct(p);
                          }
                        }}
                        onClear={() => setSelectedProduct(null)}
                        placeholder="Cari produk..."
                        extraParams="&status=active"
                        className="w-full"
                      />
                      {selectedProduct && (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-muted">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{addQty}</span>
                          <button type="button" onClick={() => setAddQty(q => q + 1)} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-muted">
                            <Plus className="w-3 h-3" />
                          </button>
                          <Button size="sm" className="flex-1 text-xs h-7 ml-1" onClick={handleAddItemToEdit}>
                            Tambah
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => { setAddingItem(false); setSelectedProduct(null); }}>
                            Batal
                          </Button>
                        </div>
                      )}
                      {!selectedProduct && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setAddingItem(false)}>Batal</Button>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs gap-1.5" onClick={() => setAddingItem(true)}>
                      <Plus className="w-3 h-3" /> Tambah Item
                    </Button>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 text-xs" disabled={savingEdit} onClick={handleSaveEdit}>
                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Simpan
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditMode(false)}>Batal Edit</Button>
                  </div>
                </div>
              ) : (
                /* Items — View Mode */
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Pesanan</p>
                    {detail.order_status === 'pending' && canUpdateOrder && (
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2 gap-1"
                        onClick={() => navigate(`/pos?edit_order_id=${orderId}`)}>
                        Edit Pesanan
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(detail.items || []).map((item) => {
                      const parseField = (v) => {
                        if (!v || v === 'null') return null;
                        if (Array.isArray(v)) return v;
                        if (typeof v === 'object') return v;
                        try { return JSON.parse(v); } catch { return null; }
                      };
                      const variantList = (() => { const v = parseField(item.variants_selected); return Array.isArray(v) ? v : []; })();
                      const addonRaw = parseField(item.addons_selected);
                      const addonList = Array.isArray(addonRaw)
                        ? addonRaw
                        : addonRaw && typeof addonRaw === 'object'
                          ? Object.values(addonRaw).flat()
                          : [];
                      // Base product name (strip variant suffix if already embedded)
                      const baseName = item.product_name;
                      return (
                        <div key={item.id} className="text-sm">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium leading-tight">{baseName}</span>
                            <span className="shrink-0 text-muted-foreground whitespace-nowrap">
                              {item.quantity} × {formatRp(item.unit_price)}
                            </span>
                          </div>
                          {variantList.length > 0 && (
                            <p className="text-xs text-violet-600 mt-0.5">
                              {variantList.map(v => `${v.group_name || ''}: ${v.option_name}`).join(' · ')}
                            </p>
                          )}
                          {addonList.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              + {addonList.map(a => {
                                if (typeof a === 'string') return a;
                                const name = a.addon_name || a.name || '';
                                const qty = a.qty > 1 ? ` ×${a.qty}` : '';
                                const price = a.unit_price > 0 ? ` (+${formatRp(a.unit_price * (a.qty||1))})` : '';
                                return `${name}${qty}${price}`;
                              }).join(', ')}
                            </p>
                          )}
                          {item.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{item.notes}"</p>}
                          <div className="flex justify-end mt-0.5">
                            <span className="font-semibold">{formatRp(item.subtotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tambah Item for preparing status */}
                  {detail.order_status === 'preparing' && (
                    <div className="mt-2">
                      {addingItem ? (
                        <div className="space-y-2">
                          <ServerSelect
                            endpoint="/products"
                            value={selectedProduct?.id?.toString() || ''}
                            displayValue={selectedProduct?.name || ''}
                            onChange={p => setSelectedProduct(p)}
                            onClear={() => setSelectedProduct(null)}
                            placeholder="Cari produk..."
                            extraParams="&status=active"
                            className="w-full"
                          />
                          {selectedProduct && (
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-muted">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-sm font-bold">{addQty}</span>
                              <button type="button" onClick={() => setAddQty(q => q + 1)} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-muted">
                                <Plus className="w-3 h-3" />
                              </button>
                              <Button size="sm" className="flex-1 text-xs h-7 ml-1" disabled={!!updatingId} onClick={handleAddItemPreparing}>
                                {updatingId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tambah'}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => { setAddingItem(false); setSelectedProduct(null); }}>Batal</Button>
                            </div>
                          )}
                          {!selectedProduct && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 w-full" onClick={() => setAddingItem(false)}>Batal</Button>
                          )}
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => { setAddingItem(true); setSelectedProduct(null); setAddQty(1); }}>
                          <Plus className="w-3 h-3" /> Tambah Item
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRp(detail.subtotal)}</span>
                </div>
                {Number(detail.tax) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pajak</span>
                    <span>{formatRp(detail.tax)}</span>
                  </div>
                )}
                {Number(detail.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diskon</span>
                    <span className="text-red-500">- {formatRp(detail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                  <span>Total</span>
                  <span>{formatRp(detail.total)}</span>
                </div>
              </div>

              {/* Print buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                  onClick={async () => { try { const r = await api.get(`/printers/receipt/${detail.id}`); await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt'); } catch {} }}>
                  <Printer className="w-3.5 h-3.5" /> Print Struk
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
                  onClick={async () => { try { const r = await api.get(`/printers/kitchen/${detail.id}`); await smartPrint(buildKitchenHTML(r.data.order, r.data.printer), r.data.printer, 'kitchen'); } catch {} }}>
                  <Printer className="w-3.5 h-3.5" /> Print Dapur
                </Button>
              </div>

              {/* Split Bill button */}
              {['ready', 'completed'].includes(detail.order_status) && (
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
                  onClick={() => setSplitOpen(true)}>
                  <Scissors className="w-3.5 h-3.5" /> Split Bill
                </Button>
              )}

              {/* Status action buttons */}
              {(NEXT_STATUS[detail.order_status] || ['pending', 'preparing', 'ready'].includes(detail.order_status)) && !editMode && (canUpdateStatus || canCancel) && (
                <div className="flex gap-2 border-t pt-3">
                  {canUpdateStatus && NEXT_STATUS[detail.order_status] && (
                    <Button size="sm" className="flex-1 text-xs" disabled={!!updatingId}
                      onClick={() => handleStatusUpdate(NEXT_STATUS[detail.order_status])}>
                      {updatingId ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${STATUS_LABEL[NEXT_STATUS[detail.order_status]]}`}
                    </Button>
                  )}
                  {canCancel && ['pending', 'preparing', 'ready'].includes(detail.order_status) && !cancelRequestSent && (
                    <Button size="sm" variant="ghost" disabled={!!updatingId} onClick={handleCancel}
                      className="text-xs text-destructive hover:bg-destructive/10">
                      {cancelBtnLabel}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { shiftRequired } = useShiftGuard();
  const isAdmin = user?.role === 'admin';
  const canUpdateStatus = can('update_status', 'orders');
  const canCancel = can('cancel', 'orders');
  const canDelete = can('delete', 'orders');

  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [servedBy, setServedBy] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancelPanelOpen, setCancelPanelOpen] = useState(false);
  const [cancelRequestCount, setCancelRequestCount] = useState(0);

  const qs = [
    `page=${page}`, 'limit=10',
    status !== 'all' ? `status=${status}` : '',
    servedBy !== 'all' ? `served_by=${servedBy}` : '',
    branchFilter !== 'all' ? `branch_id=${branchFilter}` : '',
  ].filter(Boolean).join('&');
  const { data, loading, refetch } = useFetch(`/orders?${qs}`);
  const { data: usersData } = useFetch(isAdmin ? '/users?role=kasir&limit=50' : null);
  const { data: branchData } = useFetch('/branches');

  // Load cancel request count — admin only
  useEffect(() => {
    if (!isAdmin) return;
    api.get('/orders/cancel-requests')
      .then(r => { const list = r.data.requests || r.data || []; setCancelRequestCount(Array.isArray(list) ? list.length : 0); })
      .catch(() => {});
  }, [isAdmin]);

  const orders = data?.orders || [];
  const pagination = data?.pagination || {};

  // Revenue from server (accurate across filter), counts from current page
  const totalRevenue = data?.total_revenue ?? 0;         // completed orders
  const totalRevenuePaid = data?.total_revenue_paid ?? 0; // payment_status=paid
  const pendingCount = orders.filter(o => o.order_status === 'pending').length;
  const cancelledCount = orders.filter(o => o.order_status === 'cancelled').length;

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Batalkan pesanan ini?')) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'cancelled' });
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal membatalkan');
    } finally {
      setUpdatingId(null);
    }
  };

  if (shiftRequired) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="bg-card border rounded-2xl shadow p-8 flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-7 h-7 text-amber-600" />
          </div>
          <p className="font-semibold text-base">Shift Belum Dibuka</p>
          <p className="text-sm text-muted-foreground">Buka shift di halaman POS untuk mengakses data pesanan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pesanan</p>
              <p className="text-xl font-bold">{pagination.total || orders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue (selesai)</p>
              <p className="text-xl font-bold text-emerald-600">Rp {totalRevenue.toLocaleString('id')}</p>
              {totalRevenuePaid > 0 && totalRevenuePaid !== totalRevenue && (
                <p className="text-[10px] text-muted-foreground">Lunas: Rp {totalRevenuePaid.toLocaleString('id')}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Menunggu</p>
              <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dibatalkan</p>
              <p className="text-xl font-bold text-red-500">{cancelledCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={status} onValueChange={v => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'Semua Status' : STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter kasir */}
        <Select value={servedBy} onValueChange={v => { setServedBy(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Semua Kasir" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kasir</SelectItem>
            {(usersData?.users || []).map(u => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter cabang */}
        {(branchData?.branches || []).length > 1 && (
          <Select value={branchFilter} onValueChange={v => { setBranchFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {(branchData?.branches || []).map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>

        {/* Export buttons */}
        {orders.length > 0 && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => exportOrdersExcel(orders)}>
              <FileSpreadsheet className="w-3.5 h-3.5" />Excel
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
              onClick={() => exportOrdersPDF(orders)}>
              <FileText className="w-3.5 h-3.5" />PDF
            </Button>
          </>
        )}

        {cancelRequestCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setCancelPanelOpen(true)}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Batalkan ({cancelRequestCount})
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          Total: {pagination.total || 0} pesanan
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tipe / Meja</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Bayar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Print</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-12">
                      Tidak ada pesanan
                    </TableCell>
                  </TableRow>
                ) : orders.map((order, idx) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono w-8">
                      {((pagination.page || 1) - 1) * 10 + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-semibold text-primary">{order.order_number}</p>
                        <p className="text-[10px] text-muted-foreground">ID #{order.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.customer_name || 'Walk-in'}</TableCell>
                    <TableCell>
                      <p className="capitalize text-sm">{order.order_type}</p>
                      {order.table_number && <p className="text-xs text-muted-foreground">{order.table_number}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{order.branch_name || '—'}</TableCell>
                    <TableCell className="font-semibold">{formatRp(order.total)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        order.payment_status === 'partial' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {order.payment_status === 'paid' ? 'Lunas' : order.payment_status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={STATUS_CLS[order.order_status]}>{STATUS_LABEL[order.order_status]}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{order.served_by_name || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(order.created_at)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Struk"
                          onClick={async () => { try { const r = await api.get(`/printers/receipt/${order.id}`); await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt'); } catch {} }}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {canUpdateStatus && NEXT_STATUS[order.order_status] && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingId === order.id}
                            onClick={() => updateStatus(order.id, NEXT_STATUS[order.order_status])}
                            className="text-xs h-7 px-2"
                          >
                            {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : STATUS_LABEL[NEXT_STATUS[order.order_status]]}
                          </Button>
                        )}
                        {canCancel && ['pending', 'preparing', 'ready'].includes(order.order_status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updatingId === order.id}
                            onClick={() => cancelOrder(order.id)}
                            className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                          >
                            Batal
                          </Button>
                        )}
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {pagination.page} dari {pagination.total_pages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.total_pages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Order detail panel */}
      {selectedOrderId && (
        <OrderDetailPanel
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusUpdated={refetch}
        />
      )}

      {/* Cancel requests panel */}
      {cancelPanelOpen && (
        <CancelRequestsPanel
          onClose={() => setCancelPanelOpen(false)}
          onUpdated={() => {
            refetch();
            api.get('/orders/cancel-requests')
              .then(r => { const list = r.data.requests || r.data || []; setCancelRequestCount(Array.isArray(list) ? list.length : 0); })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}

// ─── Variant Picker for order edit ───────────────────────────
function OrderVariantPicker({ product, onClose, onConfirm }) {
  const { data, loading } = useFetch(`/variants/${product.id}`);
  const [selVariants, setSelVariants] = useState({});
  const [selAddons, setSelAddons] = useState({});

  const variantGroups = data?.variant_groups || [];
  const addonGroups   = data?.addon_groups || [];
  const fmt = (v) => `Rp ${Number(v || 0).toLocaleString('id')}`;

  const variantMod  = Object.values(selVariants).reduce((s, o) => s + (o?.price_modifier || 0), 0);
  const addonsTotal = Object.entries(selAddons).reduce((s, [id, qty]) => {
    const addon = addonGroups.flatMap(g => g.addons || []).find(a => String(a.id) === id);
    return s + (addon ? addon.price * qty : 0);
  }, 0);
  const preview = parseFloat(product.price) + variantMod + addonsTotal;

  const handleConfirm = () => {
    for (const g of variantGroups) {
      if (g.is_required && !selVariants[g.id]) { alert(`Pilih ${g.name} terlebih dulu`); return; }
    }
    const variants = Object.entries(selVariants).filter(([, o]) => o).map(([gid, opt]) => ({
      group_id: parseInt(gid), option_id: opt.id, option_name: opt.name, price_modifier: opt.price_modifier,
    }));
    const addons = Object.entries(selAddons).filter(([, qty]) => qty > 0).map(([id, qty]) => {
      const addon = addonGroups.flatMap(g => g.addons || []).find(a => String(a.id) === id);
      return { addon_id: parseInt(id), addon_name: addon?.name, qty, unit_price: addon?.price || 0 };
    });
    onConfirm(variants, addons);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col overflow-hidden p-0">
        <div className="px-4 pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">{product.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">Harga dasar: {fmt(product.price)}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {variantGroups.map(group => (
                <div key={group.id}>
                  <p className="text-xs font-semibold mb-1.5">{group.name}{group.is_required && <span className="text-destructive ml-1">*</span>}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(group.options || []).map(opt => {
                      const sel = selVariants[group.id]?.id === opt.id;
                      return (
                        <button key={opt.id} type="button"
                          onClick={() => setSelVariants(v => ({ ...v, [group.id]: sel ? null : opt }))}
                          className={`p-2 rounded-lg border text-left text-xs transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                          <span className="font-medium">{opt.name}</span>
                          {opt.price_modifier !== 0 && (
                            <span className={`ml-1 ${opt.price_modifier > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {opt.price_modifier > 0 ? '+' : ''}{fmt(opt.price_modifier)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {addonGroups.map(group => (
                <div key={group.id}>
                  <p className="text-xs font-semibold mb-1.5">{group.name}</p>
                  <div className="space-y-1">
                    {(group.addons || []).map(addon => {
                      const qty = selAddons[addon.id] || 0;
                      return (
                        <div key={addon.id} className="flex items-center justify-between text-xs">
                          <span>{addon.name} <span className="text-green-600">+{fmt(addon.price)}</span></span>
                          <div className="flex items-center gap-1.5">
                            <button disabled={qty === 0} onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.max(0, (a[addon.id]||0)-1) }))}
                              className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-4 text-center">{qty}</span>
                            <button disabled={qty >= addon.max_qty} onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.min(addon.max_qty,(a[addon.id]||0)+1) }))}
                              className="w-6 h-6 rounded border flex items-center justify-center disabled:opacity-30 hover:bg-muted">
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-[10px] text-muted-foreground">Per item</p>
            <p className="text-base font-bold text-primary">{fmt(preview)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button size="sm" onClick={handleConfirm}>Pilih</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
