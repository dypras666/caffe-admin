import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFetch, useDebounce } from '../hooks/useApi';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { buildReceiptHTML, buildKitchenHTML, smartPrint } from '../lib/printer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { useToast } from '../components/ui/toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Loader2, ChevronDown, Tag, X, Check, Coffee,
  Utensils, Receipt, Layers, User, UserPlus, Phone, Star, Wallet, QrCode, Clock, Building2, Gift, Sparkles, Ticket, TrendingUp, AlertTriangle,
  Maximize, Minimize, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ORDER_TYPES = [
  { value: 'dine-in',  label: 'Dine-in',  icon: Utensils },
  { value: 'takeaway', label: 'Takeaway',  icon: Coffee },
];

const generateDynamicQris = (qris, amount) => {
  if (!qris) return '';
  let amtStr = amount.toString();
  if (amtStr.includes('.')) amtStr = amount.toFixed(0);
  
  let idx = 0;
  const tags = {};
  while (idx < qris.length) {
    const tag = qris.substring(idx, idx + 2);
    const len = parseInt(qris.substring(idx + 2, idx + 4), 10);
    if (isNaN(len)) break;
    const val = qris.substring(idx + 4, idx + 4 + len);
    tags[tag] = val;
    idx += 4 + len;
  }
  
  tags['01'] = '12';
  tags['54'] = amtStr;
  
  let newQris = '';
  for (let i = 0; i < 63; i++) {
    const t = i.toString().padStart(2, '0');
    if (tags[t]) {
      const v = tags[t];
      newQris += t + v.length.toString().padStart(2, '0') + v;
    }
  }
  
  newQris += '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < newQris.length; i++) {
    crc ^= (newQris.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      else crc = (crc << 1) & 0xFFFF;
    }
  }
  
  return newQris + crc.toString(16).toUpperCase().padStart(4, '0');
};

// ─── Main POS ─────────────────────────────────────────────────
export default function POSPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editOrderId = searchParams.get('edit_order_id');
  const posRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Cart & order state
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine-in');
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [editingOrder, setEditingOrder] = useState(null); // original order being edited

  // UI state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);   // open-shift modal
  const [shiftClose, setShiftClose] = useState(false); // close-shift modal
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null); // { id, name, email, phone, balance, is_priority }
  const [pointsPreview, setPointsPreview] = useState(null);   // { points, rule, already_claimed }
  const [claimingPoints, setClaimingPoints] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const { user: currentUser } = useAuth();

  // Data
  const debouncedSearch = useDebounce(search, 350);
  const branchQs = currentUser?.branch_id ? `&branch_id=${currentUser.branch_id}` : '';
  const qs = `/products?limit=200${(activeCategory !== 'all' && activeCategory !== 'promo') ? `&category=${activeCategory}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}${branchQs}`;
  const { data: productsData, loading: loadingProducts } = useFetch(qs);
  const { data: catData }      = useFetch('/categories');
  const { data: payData }      = useFetch('/payments/methods');
  const { data: settingsData } = useFetch('/settings');
  const { data: vouchersData } = useFetch('/vouchers?is_active=true');
  const { data: tablesData, refetch: refetchTables } = useFetch('/tables');
  const { data: branchesData } = useFetch('/branches');
  const { data: currentShiftData, refetch: refetchShift } = useFetch('/shifts/current');
  const currentBranch = currentUser?.branch_id
    ? (branchesData?.branches || []).find(b => b.id === currentUser.branch_id)
    : null;
  const currentShift = currentShiftData?.shift || null;

  const products    = (productsData?.products || []).filter(p => p.is_available && p.status === 'active');
  
  const promoProducts = useMemo(() => {
    const activeVouchers = vouchersData?.vouchers || [];
    const promos = [];
    activeVouchers.filter(v => v.type === 'item_discount' && v.applicable_products?.length).forEach(v => {
      let parsed = [];
      try { parsed = typeof v.applicable_products === 'string' ? JSON.parse(v.applicable_products) : v.applicable_products; } catch(e) {}
      if (Array.isArray(parsed)) {
        parsed.forEach(pid => {
          const p = products.find(prod => prod.id === pid);
          if (p && !promos.some(x => x.id === p.id)) {
            const discValue = parseFloat(v.discount_value || 0);
            const label = v.discount_type === 'percent' 
              ? `${discValue}% OFF`
              : `-Rp ${discValue.toLocaleString('id')}`;
            promos.push({ ...p, promoLabel: label, promoValidTo: v.valid_until });
          }
        });
      }
    });
    return promos;
  }, [vouchersData, products]);

  const popularProducts = useMemo(() => products.filter(p => p.is_popular === 1), [products]);

  // Auto-discount map: product_id -> { discount_type, discount_value, voucher_name, max_qty }
  const itemDiscountMap = useMemo(() => {
    const activeVouchers = vouchersData?.vouchers || [];
    const map = {};
    activeVouchers.filter(v => v.type === 'item_discount' && v.is_active).forEach(v => {
      let parsed = [];
      try { parsed = typeof v.applicable_products === 'string' ? JSON.parse(v.applicable_products) : v.applicable_products; } catch(e) {}
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach(pid => {
          if (!map[pid]) {
            map[pid] = {
              discount_type: v.discount_type || 'fixed',
              discount_value: parseFloat(v.discount_value || 0),
              max_discount: v.max_discount ? parseFloat(v.max_discount) : null,
              voucher_name: v.name,
              max_qty: v.usage_per_member ? parseInt(v.usage_per_member) : null,
            };
          }
        });
      }
    });
    return map;
  }, [vouchersData]);

  const categories  = catData?.categories || [];
  const payMethods  = payData?.methods || [];
  const tables      = tablesData?.tables || [];
  const settings    = (settingsData?.settings || []).reduce((a, s) => ({ ...a, [s.setting_key]: s.setting_value }), {});
  const currency    = settings.currency_symbol || 'Rp';
  const taxRate     = parseFloat(settings.tax_rate || 0);
  const requireTable = settings.pos_require_table === 'true';
  const shiftEnabled = settings.shift_enabled === 'true';

  // Load existing order into cart when edit_order_id is in URL
  useEffect(() => {
    if (!editOrderId || tables.length === 0) return;
    api.get(`/orders/${editOrderId}`).then(res => {
      const order = res.data.order;
      if (!order) return;
      setEditingOrder(order);
      setCustomerName(order.customer_name || '');
      setNotes(order.notes || '');
      setOrderType(order.order_type || 'dine-in');
      setDiscount(order.discount ? String(order.discount) : '');
      if (order.table_id) {
        const tbl = tables.find(t => t.id === order.table_id || t.table_number === order.table_number);
        if (tbl) setSelectedTable(tbl);
      }
      const loadedCart = (order.items || []).map(item => {
        const parseF = (v) => {
          if (!v || v === 'null') return [];
          if (Array.isArray(v)) return v;
          try { return JSON.parse(v); } catch { return []; }
        };
        const variants = parseF(item.variants_selected);
        const addons   = parseF(item.addons_selected);
        const addonsPerUnit = addons.reduce((s, a) => s + (a.unit_price || 0) * (a.qty || 1), 0);
        const varLabel = variants.map(v => v.option_name).join(', ');
        const name = varLabel ? `${item.product_name.replace(/ \(.*\)$/, '')} (${varLabel})` : item.product_name;
        return {
          cartKey: `${item.product_id}_edit_${item.id}`,
          id: item.product_id,
          orderItemId: item.id,
          name,
          price: parseFloat(item.product_price || item.unit_price),
          unitPrice: parseFloat(item.unit_price),
          addonsPerUnit,
          variants,
          addons,
          qty: item.quantity,
          notes: item.notes || '',
        };
      });
      setCart(loadedCart);
    }).catch(() => toast.error('Gagal memuat order'));
  }, [editOrderId, tables.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculations — apply per-item discounts from active vouchers
  const calcDiscountedPrice = (base, disc) => {
    if (!disc) return base;
    if (disc.discount_type === 'percent') {
      let off = base * disc.discount_value / 100;
      if (disc.max_discount && off > disc.max_discount) off = disc.max_discount;
      return Math.max(0, base - off);
    }
    return Math.max(0, base - disc.discount_value);
  };
  const calcItemTotal = (item) => {
    const base = item.unitPrice + (item.addonsPerUnit || 0);
    const disc = itemDiscountMap[item.id];
    if (!disc) return base * item.qty;
    const maxQty = disc.max_qty || item.qty;
    const discQty = Math.min(item.qty, maxQty);
    const fullQty = item.qty - discQty;
    const discUnit = calcDiscountedPrice(base, disc);
    return (discUnit * discQty) + (base * fullQty);
  };
  const subtotal    = cart.reduce((s, i) => s + calcItemTotal(i), 0);
  const discountAmt = parseFloat(discount || 0);
  const taxAmt      = Math.round((subtotal - discountAmt) * taxRate / 100 * 100) / 100;
  const total       = Math.max(0, subtotal - discountAmt + taxAmt);
  const totalItems  = cart.reduce((s, i) => s + i.qty, 0);

  const fmt = (v) => `${currency} ${Number(v || 0).toLocaleString('id')}`;

  // Cart helpers
  const makeKey = (pid, variants, addons) => {
    const v = (variants || []).map(v => `v${v.option_id}`).sort().join('-');
    const a = (addons  || []).map(a => `a${a.addon_id}x${a.qty}`).sort().join('-');
    return `${pid}_${v}_${a}`;
  };

  const addItem = (product, variants = [], addons = []) => {
    const mod         = variants.reduce((s, v) => s + (v.price_modifier || 0), 0);
    const addonsUnit  = addons.reduce((s, a) => s + (a.unit_price || 0) * (a.qty || 1), 0);
    const unitPrice   = parseFloat(product.price) + mod;
    const vLabel      = variants.map(v => v.option_name).join(', ');
    const name        = vLabel ? `${product.name} (${vLabel})` : product.name;
    const key         = makeKey(product.id, variants, addons);
    setCart(c => {
      const ex = c.find(i => i.cartKey === key);
      if (ex) return c.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { cartKey: key, id: product.id, name, price: parseFloat(product.price), unitPrice, addonsPerUnit: addonsUnit, variants, addons, qty: 1, notes: '' }];
    });
  };

  const shiftRequired = shiftEnabled && !currentShift;

  const handleProductClick = (product) => {
    if (shiftRequired) { setShiftOpen(true); return; }
    if (product.has_variants || product.has_addons || product.variant_groups?.length || product.addon_groups?.length) {
      setVariantProduct(product);
    } else {
      addItem(product);
    }
  };

  const renderProductCard = (product, promoLabel, promoValidTo) => {
    const cartQty = cart.filter(i => i.id === product.id).reduce((s, i) => s + i.qty, 0);
    const hasVariants = product.has_variants || product.has_addons || product.variant_groups?.length || product.addon_groups?.length;
    
    let timerText = null;
    if (promoValidTo) {
      const now = new Date();
      const end = new Date(promoValidTo);
      const diffMs = end - now;
      if (diffMs > 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        if (days > 0) timerText = `Sisa ${days} hr ${hours} jm`;
        else timerText = `Sisa ${hours} jam`;
      } else {
        timerText = 'Berakhir';
      }
    }

    return (
      <button
        key={product.id}
        onClick={() => handleProductClick(product)}
        className={cn(
          'group relative flex flex-col text-left rounded-xl border transition-all hover:shadow-md active:scale-95 overflow-hidden bg-card w-full',
          cartQty > 0
            ? 'border-primary shadow-sm ring-1 ring-primary/20'
            : 'border-border hover:border-primary/40'
        )}
      >
        {promoLabel && (
          <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg z-20 shadow-sm whitespace-nowrap">
            {promoLabel}
            {timerText && (
              <div className="absolute top-full left-0 mt-0.5 bg-black/80 text-white text-[9px] px-1.5 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {timerText}
              </div>
            )}
          </div>
        )}
        {/* Cart badge */}
        {cartQty > 0 && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center z-10 shadow-sm ring-2 ring-card pointer-events-none">
            {cartQty}
          </span>
        )}

        {/* Image Area */}
        <div className="w-full aspect-[4/3] bg-secondary flex items-center justify-center relative overflow-hidden border-b">
          {product.image ? (
            <img src={product.image.startsWith('http') ? product.image : `/uploads/${product.image}`} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
          ) : (
            <Coffee className="w-6 h-6 text-muted-foreground/40" />
          )}
          
          {/* Variant indicator overlay on image */}
          {hasVariants && (
            <div className="absolute bottom-1.5 left-1.5 bg-background/90 backdrop-blur-sm p-1 rounded-md shadow-sm border pointer-events-none">
              <Layers className="w-3 h-3 text-primary" />
            </div>
          )}
        </div>

        {/* Text Area */}
        <div className="p-2.5 w-full flex flex-col flex-1 gap-1">
          <p className="text-xs font-semibold leading-snug line-clamp-2">{product.name}</p>
          <div className="mt-auto pt-1 flex items-center justify-between">
            <p className="text-xs font-bold text-primary">{fmt(product.price)}</p>
            {product.stock > 0 && product.stock <= (product.min_stock || 0) && (
              <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded">Sisa {product.stock}</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  const updateQty = (key, delta) => {
    setCart(c => c.map(i => i.cartKey === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  };

  const clearCart = () => {
    setCart([]); setCustomerName(''); setNotes(''); setDiscount('');
    setSelectedTable(null); setSelectedMember(null); setPointsPreview(null); setAppliedVoucher(null);
  };

  const onMemberSelect = (member) => {
    setSelectedMember(member);
    if (member) setCustomerName(member.name);
    else { setCustomerName(''); setPointsPreview(null); }
  };

  const handleClaimPoints = async () => {
    if (!pointsPreview?.orderId) return;
    setClaimingPoints(true);
    try {
      const r = await api.post(`/orders/${pointsPreview.orderId}/claim-points`);
      toast.success(`${r.data.earned_points} poin diklaim untuk ${r.data.member.name}!`);
      setPointsPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal klaim poin');
    } finally { setClaimingPoints(false); }
  };

  const placeOrder = async (printReceipt = false, printKitchen = false) => {
    if (!cart.length) return;
    if (requireTable && orderType === 'dine-in' && !selectedTable) {
      toast.warning('Wajib pilih meja untuk dine-in'); setTablePickerOpen(true); return;
    }
    setPlacing(true);
    try {
      let order;

      if (editingOrder) {
        // ── Edit mode: update existing order items ────────────────
        const items = cart.map(i => ({
          id: i.orderItemId || null,
          product_id: i.id,
          quantity: i.qty,
          notes: i.notes || null,
          variants: (i.variants || []).map(v => ({ group_id: v.group_id, option_id: v.option_id })),
          addons:   (i.addons  || []).map(a => ({ addon_id: a.addon_id, qty: a.qty })),
        }));
        await api.put(`/orders/${editingOrder.id}/items`, { items });
        order = { id: editingOrder.id };
        toast.success('Pesanan berhasil diperbarui!');
      } else {
        // ── Create mode: new order ────────────────────────────────
        const res = await api.post('/orders', {
          customer_name: customerName || 'Umum',
          customer_email: selectedMember?.email || null,
          customer_phone: selectedMember?.phone || null,
          order_type: orderType,
          table_number: selectedTable?.table_number || null,
          table_id: selectedTable?.id || null,
          payment_method: paymentMethod,
          notes: notes || null,
          discount: discountAmt || 0,
          voucher_code: appliedVoucher?.code || null,
          items: cart.map(i => ({
            product_id: i.id, quantity: i.qty, notes: i.notes || null,
            variants: (i.variants || []).map(v => ({ group_id: v.group_id, option_id: v.option_id })),
            addons:   (i.addons  || []).map(a => ({ addon_id: a.addon_id, qty: a.qty })),
          })),
        });
        order = res.data.order;
        setLastOrder(order);
      }

      if (printReceipt || settings.pos_auto_print_receipt === 'true') {
        try {
          const r = await api.get(`/printers/receipt/${order.id}`);
          await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt', r.data.receipt);
        } catch (e) { console.error('Print receipt failed', e); }
      }
      if (printKitchen || settings.pos_auto_print_kitchen === 'true') {
        try {
          const k = await api.get(`/printers/kitchen/${order.id}`);
          await smartPrint(buildKitchenHTML(k.data.ticket, k.data.printer), k.data.printer, 'kitchen', k.data.ticket);
        } catch (e) { console.error('Print kitchen failed', e); }
      }

      setCheckoutOpen(false);
      setMobileCartOpen(false);
      refetchTables();
      refetchShift();

      if (!editingOrder && selectedMember?.email) {
        api.get(`/orders/${order.id}/points-preview`)
          .then(r => { if (r.data.enabled && r.data.points > 0) setPointsPreview({ orderId: order.id, ...r.data }); })
          .catch(() => {});
      }

      clearCart();
      if (editingOrder) {
        setEditingOrder(null);
        navigate('/orders');
        return;
      }
      
      const isPending = paymentMethod === 'pending';
      toast.success(isPending ? 'Order dibuat — menunggu pembayaran' : 'Order berhasil dibuat!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Gagal membuat order');
    } finally { setPlacing(false); }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div ref={posRef} className="flex flex-col lg:flex-row h-full overflow-hidden bg-muted/30">

      {/* ── LEFT: Product area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar: search + categories */}
        <div className="bg-card border-b px-4 py-3 space-y-3 shrink-0">
          {/* Edit mode banner */}
          {editingOrder && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-amber-700 font-medium">Mode Edit — #{editingOrder.order_number}</span>
              <button onClick={() => { setEditingOrder(null); clearCart(); navigate('/orders'); }}
                className="ml-auto text-amber-600 hover:text-destructive font-medium">Batal</button>
            </div>
          )}

          {/* Branch + Shift indicator row */}
          <div className="flex items-center justify-between gap-2">
            {currentBranch && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium text-foreground">{currentBranch.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {currentShift ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span className="font-medium text-amber-700 font-mono">{currentShift.shift_number}</span>
                    <span className="text-amber-600">·</span>
                    <span className="text-amber-700 font-medium">{fmt(currentShift.live_total_revenue)}</span>
                    <span className="text-amber-500 hidden sm:inline">({currentShift.live_total_orders} order)</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1 text-destructive border-red-200 hover:bg-red-50"
                    onClick={() => setShiftClose(true)}>
                    Tutup Shift
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => setShiftOpen(true)}>
                  <Clock className="w-3.5 h-3.5" />Buka Shift
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-1 text-muted-foreground hover:bg-muted" onClick={toggleFullscreen} title="Toggle Fullscreen">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk…"
              className="pl-9 pr-9 h-10 bg-background text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {[{ id: 'all', name: 'Semua' }, { id: 'promo', name: 'Promo' }, ...categories.filter(c => c.is_active)].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(String(cat.id))}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                  activeCategory === String(cat.id)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4 relative bg-muted/30">
          {/* Shift lock overlay */}
          {shiftRequired && (
            <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="bg-card border rounded-2xl shadow-xl p-6 flex flex-col items-center gap-3 max-w-xs text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">Shift Belum Dibuka</p>
                  <p className="text-sm text-muted-foreground mt-1">Buka shift terlebih dahulu untuk mulai transaksi.</p>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-1"
                  onClick={() => setShiftOpen(true)}>
                  <Clock className="w-4 h-4" />Buka Shift Sekarang
                </Button>
              </div>
            </div>
          )}
          {loadingProducts ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm">{debouncedSearch ? `Tidak ada hasil untuk "${debouncedSearch}"` : 'Tidak ada produk tersedia'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Slider Promo Removed in favor of Promo tab */}

              {/* Slider Terlaris */}
              {popularProducts.length > 0 && activeCategory === 'all' && !debouncedSearch && (
                <div>
                  <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-1.5 text-amber-600"><TrendingUp className="w-4 h-4" /> Produk Terlaris</h3>
                  <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                    {popularProducts.map(product => (
                      <div key={product.id} className="w-32 sm:w-36 md:w-40 shrink-0 snap-start">
                        {renderProductCard(product, 'BEST SELLER')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Grid */}
              <div>
                {popularProducts.length > 0 && activeCategory === 'all' && !debouncedSearch && (
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Store className="w-4 h-4 text-primary" /> Semua Produk</h3>
                )}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                  {(activeCategory === 'promo' ? promoProducts : products).map(product => 
                    renderProductCard(product, product.promoLabel, product.promoValidTo)
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart panel (desktop) ──────────────────────── */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-card border-l">
        <CartPanel
          cart={cart} orderType={orderType} setOrderType={setOrderType}
          selectedTable={selectedTable} setSelectedTable={setSelectedTable}
          customerName={customerName} setCustomerName={setCustomerName}
          selectedMember={selectedMember} onMemberSelect={onMemberSelect}
          discount={discount} setDiscount={setDiscount}
          requireTable={requireTable} tables={tables}
          subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} taxRate={taxRate} total={total} totalItems={totalItems}
          fmt={fmt} updateQty={updateQty}
          onRemove={(key) => setCart(c => c.filter(i => i.cartKey !== key))}
          onNoteChange={(key, note) => setCart(c => c.map(i => i.cartKey === key ? { ...i, notes: note } : i))}
          onClear={clearCart}
          onCheckout={() => shiftRequired ? setShiftOpen(true) : setCheckoutOpen(true)}
          onTablePicker={() => setTablePickerOpen(true)}
          lastOrder={lastOrder}
          onClearLastOrder={() => setLastOrder(null)}
          pointsPreview={pointsPreview}
          onClaimPoints={handleClaimPoints}
          claimingPoints={claimingPoints}
          currency={currency}
          appliedVoucher={appliedVoucher}
          onVoucherApplied={v => setAppliedVoucher(v)}
          onVoucherRemove={() => setAppliedVoucher(null)}
          itemDiscountMap={itemDiscountMap}
          calcItemTotal={calcItemTotal}
          calcDiscountedPrice={calcDiscountedPrice}
        />
      </div>

      {/* ── MOBILE: floating cart button + bottom sheet ──────── */}
      <div className="lg:hidden">
        {/* FAB */}
        {cart.length > 0 && (
          <button
            onClick={() => setMobileCartOpen(true)}
            className="fixed bottom-6 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl shadow-xl font-semibold text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{totalItems} item</span>
            <span className="ml-1 opacity-80">·</span>
            <span>{fmt(total)}</span>
          </button>
        )}

        {/* Bottom sheet overlay */}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
            <div className="relative bg-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Keranjang ({totalItems})</span>
                </div>
                <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CartPanel
                  cart={cart} orderType={orderType} setOrderType={setOrderType}
                  selectedTable={selectedTable} setSelectedTable={setSelectedTable}
                  customerName={customerName} setCustomerName={setCustomerName}
                  selectedMember={selectedMember} onMemberSelect={onMemberSelect}
                  discount={discount} setDiscount={setDiscount}
                  requireTable={requireTable} tables={tables}
                  subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} taxRate={taxRate} total={total} totalItems={totalItems}
                  fmt={fmt} updateQty={updateQty}
                  onRemove={(key) => setCart(c => c.filter(i => i.cartKey !== key))}
                  onNoteChange={(key, note) => setCart(c => c.map(i => i.cartKey === key ? { ...i, notes: note } : i))}
                  onClear={clearCart}
                  onCheckout={() => shiftRequired ? setShiftOpen(true) : setCheckoutOpen(true)}
                  onTablePicker={() => { setMobileCartOpen(false); setTablePickerOpen(true); }}
                  lastOrder={lastOrder}
                  onClearLastOrder={() => setLastOrder(null)}
                  pointsPreview={pointsPreview}
                  onClaimPoints={handleClaimPoints}
                  claimingPoints={claimingPoints}
                  currency={currency}
                  appliedVoucher={appliedVoucher}
                  onVoucherApplied={v => setAppliedVoucher(v)}
                  onVoucherRemove={() => setAppliedVoucher(null)}
                  isMobile
                  itemDiscountMap={itemDiscountMap}
                  calcItemTotal={calcItemTotal}
                  calcDiscountedPrice={calcDiscountedPrice}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <TablePickerDialog
        open={tablePickerOpen}
        onClose={() => setTablePickerOpen(false)}
        tables={tables}
        selected={selectedTable}
        onSelect={(t) => { setSelectedTable(t); setTablePickerOpen(false); }}
      />

      {variantProduct && (
        <VariantPickerDialog
          product={variantProduct}
          fmt={fmt}
          onClose={() => setVariantProduct(null)}
          onConfirm={(variants, addons) => { addItem(variantProduct, variants, addons); setVariantProduct(null); }}
        />
      )}

      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart} subtotal={subtotal} discountAmt={discountAmt} taxAmt={taxAmt} total={total}
        paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
        payMethods={payMethods} notes={notes} setNotes={setNotes}
        orderType={orderType} selectedTable={selectedTable} customerName={customerName}
        selectedMember={selectedMember}
        qrisString={settings.qris_string}
        fmt={fmt} onConfirm={placeOrder} placing={placing}
      />

      {/* ── Shift open modal ──── */}
      {shiftOpen && (
        <ShiftOpenModal
          onClose={() => setShiftOpen(false)}
          onOpened={() => { setShiftOpen(false); refetchShift(); }}
        />
      )}

      {/* ── Shift close modal ─── */}
      {shiftClose && currentShift && (
        <ShiftCloseModal
          shift={currentShift}
          fmt={fmt}
          onClose={() => setShiftClose(false)}
          onClosed={() => { setShiftClose(false); refetchShift(); }}
        />
      )}
    </div>
  );
}

// ─── Cart Panel (shared desktop + mobile) ─────────────────────
function CartPanel({
  cart, orderType, setOrderType, selectedTable, setSelectedTable,
  customerName, setCustomerName, selectedMember, onMemberSelect,
  discount, setDiscount,
  requireTable, tables, subtotal, discountAmt, taxAmt, taxRate, total, totalItems,
  fmt, updateQty, onRemove, onNoteChange, onClear, onCheckout, onTablePicker,
  lastOrder, onClearLastOrder,
  pointsPreview, onClaimPoints, claimingPoints,
  currency, isMobile,
  appliedVoucher, onVoucherApplied, onVoucherRemove,
  itemDiscountMap, calcItemTotal, calcDiscountedPrice,
}) {
  // Estimasi poin untuk transaksi berjalan (dari settings global, kasar)
  const estPoints = selectedMember && total > 0 && !lastOrder ? null : null; // handled server-side after order
  return (
    <>
      {/* Order config header */}
      <div className="px-4 py-3 border-b space-y-2.5 shrink-0">
        {/* Type toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {ORDER_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setOrderType(t.value); if (t.value !== 'dine-in') setSelectedTable(null); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                orderType === t.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Table selector */}
        {orderType === 'dine-in' && (
          <button
            onClick={onTablePicker}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all',
              selectedTable
                ? 'border-primary bg-primary/5 text-primary font-semibold'
                : requireTable
                  ? 'border-amber-400 bg-amber-50/80 text-amber-700'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              {selectedTable
                ? `Meja ${selectedTable.name || selectedTable.table_number}`
                : requireTable ? '⚠ Pilih meja (wajib)' : 'Pilih Meja'}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
        )}

        {/* Customer picker */}
        <CustomerPicker
          selected={selectedMember}
          onSelect={onMemberSelect}
          customerName={customerName}
          setCustomerName={setCustomerName}
          fmt={fmt}
        />
      </div>

      {/* Cart items list */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <ShoppingCart className="w-10 h-10 opacity-10" />
            <p className="text-sm font-medium">Keranjang kosong</p>
            <p className="text-xs opacity-60">Pilih produk di sebelah kiri</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-2">
            {cart.map(item => (
              <CartItem
                key={item.cartKey}
                item={item}
                fmt={fmt}
                onQtyChange={(d) => updateQty(item.cartKey, d)}
                onRemove={() => onRemove(item.cartKey)}
                onNoteChange={(note) => onNoteChange(item.cartKey, note)}
                voucherDiscount={itemDiscountMap?.[item.id]}
                calcItemTotal={calcItemTotal}
                calcDiscountedPrice={calcDiscountedPrice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Totals + checkout */}
      {cart.length > 0 && (
        <div className="border-t px-4 py-3 space-y-3 shrink-0">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              type="number"
              placeholder="Diskon (Rp)"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className="h-8 text-sm flex-1"
              min={0}
            />
          </div>

          {/* Voucher */}
          <VoucherInput
            subtotal={subtotal}
            appliedVoucher={appliedVoucher}
            onApplied={onVoucherApplied}
            onRemove={onVoucherRemove}
          />

          {/* Summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{totalItems} item · Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-green-600 text-xs">
                <span>Diskon</span><span>− {fmt(discountAmt)}</span>
              </div>
            )}
            {appliedVoucher?.discount_amount > 0 && (
              <div className="flex justify-between text-green-600 text-xs">
                <span className="flex items-center gap-1"><Ticket className="w-3 h-3" />Voucher {appliedVoucher.code}</span>
                <span>− {fmt(appliedVoucher.discount_amount)}</span>
              </div>
            )}
            {appliedVoucher?.free_item && (
              <div className="flex items-center gap-1 text-orange-600 text-xs">
                <Ticket className="w-3 h-3" />
                <span>Gratis: {appliedVoucher.free_item.product_name} ×{appliedVoucher.free_item.qty}</span>
              </div>
            )}
            {appliedVoucher?.bonus_points_multiplier > 1 && (
              <div className="flex items-center gap-1 text-amber-600 text-xs">
                <Sparkles className="w-3 h-3" />
                <span>Bonus ×{appliedVoucher.bonus_points_multiplier} poin</span>
              </div>
            )}
            {taxAmt > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Pajak ({taxRate}%)</span><span>{fmt(taxAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t">
              <span>Total</span>
              <span className="text-primary">{fmt(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="h-10 px-3"
              title="Kosongkan keranjang"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
            <Button
              size="sm"
              onClick={onCheckout}
              className="flex-1 h-10 gap-2 text-sm font-semibold"
            >
              <CreditCard className="w-4 h-4" />
              Bayar {fmt(total)}
            </Button>
          </div>
        </div>
      )}

      {/* Last order reprint + claim points */}
      {lastOrder && cart.length === 0 && (
        <div className="mx-3 mb-3 mt-1 bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {lastOrder.order_number}
            </p>
            <button onClick={onClearLastOrder} className="text-green-500 hover:text-green-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Claim poin */}
          {pointsPreview && !pointsPreview.already_claimed && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-800 font-medium">
                  +{pointsPreview.points} poin tersedia
                </span>
                {pointsPreview.rule && pointsPreview.rule !== 'Global' && (
                  <span className="text-[9px] text-amber-600 truncate">({pointsPreview.rule})</span>
                )}
              </div>
              <Button
                size="sm"
                disabled={claimingPoints}
                onClick={handleClaimPoints}
                className="h-6 px-2 text-[10px] gap-1 bg-amber-500 hover:bg-amber-600 text-white shrink-0"
              >
                {claimingPoints ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                Klaim
              </Button>
            </div>
          )}
          {pointsPreview?.already_claimed && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" /> Poin sudah diklaim
            </p>
          )}

          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 bg-white"
              onClick={async () => { try { const r = await api.get(`/printers/receipt/${lastOrder.id}`); await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt', r.data.receipt); } catch {} }}>
              <Receipt className="w-3 h-3" /> Struk
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1 bg-white"
              onClick={async () => { try { const r = await api.get(`/printers/kitchen/${lastOrder.id}`); await smartPrint(buildKitchenHTML(r.data.ticket, r.data.printer), r.data.printer, 'kitchen', r.data.ticket); } catch {} }}>
              <Utensils className="w-3 h-3" /> Dapur
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Customer Picker ─────────────────────────────────────────
function CustomerPicker({ selected, onSelect, customerName, setCustomerName, fmt }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '' });
  const [registering, setRegistering] = useState(false);
  const dropdownRef = useRef(null);
  const debouncedQ = useDebounce(query, 300);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    api.get(`/members/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(r => { if (!cancelled) setResults(r.data.members || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQ]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.phone) return;
    setRegistering(true);
    try {
      const res = await api.post('/users/register-quick', regForm);
      onSelect(res.data.user);
      setShowRegister(false);
      setQuery('');
      setShowDropdown(false);
      setRegForm({ name: '', phone: '', email: '' });
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.user) {
        // Phone already exists — use that member
        onSelect(err.response.data.user);
        setShowRegister(false);
        setQuery('');
        setShowDropdown(false);
      } else {
        toast.error(err.response?.data?.error || 'Gagal mendaftarkan member');
      }
    } finally { setRegistering(false); }
  };

  // If member selected, show compact card
  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/30 rounded-xl">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold truncate">{selected.name}</p>
            {selected.is_priority && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2">
            {selected.member_number && (
              <p className="text-[10px] text-muted-foreground font-mono">{selected.member_number}</p>
            )}
            <p className="text-[10px] text-muted-foreground truncate">{selected.phone}</p>
            {parseFloat(selected.balance || 0) > 0 && (
              <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                <Wallet className="w-2.5 h-2.5" />{fmt(selected.balance)}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onSelect(null)}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {!showRegister ? (
          <>
            <div className="flex gap-1.5">
              {/* Search field */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query || customerName}
                  placeholder="Cari member (kosong = Umum)"
                  onChange={e => {
                    const v = e.target.value;
                    setQuery(v);
                    setCustomerName(v);
                    setShowDropdown(true);
                  }}
                  onFocus={() => { if (query.length >= 2) setShowDropdown(true); }}
                  className="w-full pl-8 pr-3 h-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>
              {/* Scan QR button */}
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                title="Scan QR / No. HP Member"
              >
                <QrCode className="w-4 h-4" />
              </button>
              {/* Register button */}
              <button
                type="button"
                onClick={() => { setShowRegister(true); setRegForm({ name: customerName, phone: '', email: '' }); }}
                className="w-9 h-9 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                title="Daftarkan member baru"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Search dropdown */}
            {showDropdown && query.length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card rounded-xl border shadow-lg z-50 overflow-hidden">
                {results.length === 0 && !searching ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                    Tidak ada member ditemukan
                    <button
                      className="block mx-auto mt-1.5 text-primary font-medium hover:underline"
                      onClick={() => { setShowRegister(true); setRegForm({ name: query, phone: '', email: '' }); setShowDropdown(false); }}
                    >
                      + Daftarkan sebagai member baru
                    </button>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
                    {results.map(u => (
                      <button
                        key={u.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                        onClick={() => { onSelect(u); setQuery(''); setShowDropdown(false); }}
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            {u.is_priority && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                            {u.member_number && <span className="font-mono">{u.member_number}</span>}
                            <span><Phone className="inline w-2.5 h-2.5 mr-0.5" />{u.phone || '—'}</span>
                            {parseFloat(u.balance || 0) > 0 && (
                              <span className="text-primary font-medium"><Wallet className="inline w-2.5 h-2.5 mr-0.5" />{fmt(u.balance)}</span>
                            )}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Quick Register Form */
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />Daftarkan Member Baru
              </p>
              <button onClick={() => setShowRegister(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-1.5">
              <input
                required
                placeholder="Nama lengkap *"
                value={regForm.name}
                onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                className="w-full h-8 px-3 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    required
                    placeholder="No. HP *"
                    value={regForm.phone}
                    onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full h-8 pl-6 pr-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (opsional)"
                  value={regForm.email}
                  onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                  className="flex-1 h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Password otomatis = 6 digit terakhir HP</p>
              <div className="flex gap-1.5">
                <Button type="button" variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowRegister(false)}>Batal</Button>
                <Button type="submit" size="sm" className="flex-1 h-7 text-xs gap-1" disabled={registering}>
                  {registering ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  Daftar & Pilih
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      <ScanMemberDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSelect={(member) => { onSelect(member); setScanOpen(false); }}
        fmt={fmt}
      />
    </>
  );
}

// ─── Scan Member Dialog ───────────────────────────────────────
function ScanMemberDialog({ open, onClose, onSelect, fmt }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debouncedInput = useDebounce(input, 300);

  // Autofocus when dialog opens
  useEffect(() => {
    if (open) {
      setInput('');
      setResults([]);
      setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Auto-search trigger conditions
  const shouldSearch = (val) => {
    if (!val) return false;
    if (val.length >= 8) return true;
    if (/^08/.test(val)) return true;
    if (/^MBR-/i.test(val)) return true;
    return false;
  };

  useEffect(() => {
    if (!debouncedInput || !shouldSearch(debouncedInput)) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearched(false);
    api.get(`/members/search?q=${encodeURIComponent(debouncedInput)}`)
      .then(r => { if (!cancelled) { setResults(r.data.members || []); setSearched(true); } })
      .catch(() => { if (!cancelled) setSearched(true); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedInput]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Scan / Cari Member
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Input */}
          <div className="relative">
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Scan QR atau ketik No. HP / No. Member"
              className="w-full pl-10 pr-10 h-10 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            {input && !searching && (
              <button onClick={() => { setInput(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Arahkan scanner QR ke kartu member, atau ketik minimal 8 karakter
          </p>

          {/* Results */}
          {searched && results.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Member tidak ditemukan
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map(member => (
                <div
                  key={member.id}
                  className="border rounded-xl p-3 space-y-2 bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold truncate">{member.name}</p>
                        {member.is_priority && (
                          <Badge className="text-[9px] py-0 px-1.5 bg-amber-100 text-amber-700 border-amber-200">
                            <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-500 text-amber-500" />
                            Priority
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {member.member_number && (
                          <span className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                            {member.member_number}
                          </span>
                        )}
                        {member.phone && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />{member.phone}
                          </span>
                        )}
                        {parseFloat(member.balance || 0) > 0 && (
                          <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                            <Wallet className="w-2.5 h-2.5" />{fmt(member.balance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => onSelect(member)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Pilih Member
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cart Item ────────────────────────────────────────────────
function CartItem({ item, fmt, onQtyChange, onRemove, onNoteChange, voucherDiscount, calcItemTotal, calcDiscountedPrice }) {
  const [showNote, setShowNote] = useState(false);
  
  const baseUnit = item.unitPrice + (item.addonsPerUnit || 0);
  const discountedUnit = voucherDiscount ? calcDiscountedPrice(baseUnit, voucherDiscount) : baseUnit;
  
  const hasVoucher = voucherDiscount && discountedUnit < baseUnit;
  const maxQty = voucherDiscount?.max_qty || item.qty;
  const discQty = hasVoucher ? Math.min(item.qty, maxQty) : 0;
  const fullQty = item.qty - discQty;
  
  const lineTotal = calcItemTotal ? calcItemTotal(item) : baseUnit * item.qty;

  return (
    <div className={cn('bg-background rounded-xl border p-2.5 group', hasVoucher && 'border-red-200 bg-red-50/30')}>
      {hasVoucher && (
        <div className="flex items-center gap-1 mb-1">
          <Tag className="w-3 h-3 text-red-500" />
          <span className="text-[10px] font-bold text-red-600">{voucherDiscount.voucher_name}</span>
          <span className="text-[10px] text-red-400">— {voucherDiscount.discount_type === 'percent' ? `${voucherDiscount.discount_value}%` : fmt(voucherDiscount.discount_value)} OFF {voucherDiscount.max_qty ? `(Max ${voucherDiscount.max_qty})` : ''}</span>
        </div>
      )}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug">{item.name}</p>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {/* Voucher breakdown */}
            {hasVoucher && discQty > 0 && (
               <div className="flex items-center gap-1.5">
                 <span className="text-[10px] text-muted-foreground line-through">{fmt(baseUnit)}</span>
                 <span className="text-xs text-red-600 font-bold">{fmt(Math.max(0, discountedUnit))}</span>
                 {item.qty > 1 && <span className="text-[10px] text-red-500 font-medium">x {discQty}</span>}
               </div>
            )}
            {/* Full price breakdown (for items exceeding voucher limit, or no voucher) */}
            {fullQty > 0 && (
               <div className="flex items-center gap-1.5">
                 <span className={cn("text-xs font-medium", "text-primary")}>
                   {fmt(Math.max(0, baseUnit))}
                 </span>
                 {item.qty > 1 && hasVoucher && <span className="text-[10px] text-muted-foreground font-medium">x {fullQty} (Normal)</span>}
               </div>
            )}
            
            {item.addonsPerUnit > 0 && (
              <span className="text-[10px] text-orange-500 inline-block mt-0.5">Termasuk addons +{fmt(item.addonsPerUnit)}/item</span>
            )}
          </div>
          {item.addons?.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {item.addons.map(a => `${a.addon_name}${a.qty > 1 ? ` ×${a.qty}` : ''}`).join(', ')}
            </p>
          )}
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onQtyChange(-1)}
            className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
          <button
            onClick={() => onQtyChange(1)}
            className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="w-6 h-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive/50 hover:text-destructive transition-colors ml-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <button
          onClick={() => setShowNote(v => !v)}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          {item.notes ? 'Edit Catatan' : 'Catatan'}
        </button>
        <div className="flex flex-col items-end">
          <span className={cn('text-xs font-bold', hasVoucher && 'text-red-600')}>{fmt(lineTotal)}</span>
          {item.notes && !showNote && (
            <div className="text-[10px] text-muted-foreground flex flex-col items-end mt-0.5">
              <span className="truncate max-w-[150px]">"{item.notes}"</span>
            </div>
          )}
        </div>
      </div>

      {showNote && (
        <div className="mt-2 p-2 bg-muted/50 rounded-lg space-y-2 border">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">Catatan Item</label>
            <Input
              placeholder="Cth: Jangan terlalu pedas..."
              value={item.notes}
              onChange={e => onNoteChange(e.target.value)}
              className="h-7 text-xs bg-background"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table Picker ─────────────────────────────────────────────
function TablePickerDialog({ open, onClose, tables, selected, onSelect }) {
  const { data: roomsData } = useFetch('/rooms');
  const [roomFilter, setRoomFilter] = useState('all');
  const rooms = roomsData?.rooms || [];

  const STATUS = {
    available:   { style: 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100', label: 'Tersedia' },
    occupied:    { style: 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed opacity-60', label: 'Terisi' },
    reserved:    { style: 'border-amber-300 bg-amber-50 text-amber-700 cursor-not-allowed opacity-60', label: 'Dipesan' },
    maintenance: { style: 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed opacity-40', label: 'Maintenance' },
  };

  const filtered = tables.filter(t => t.is_active && (roomFilter === 'all' || String(t.room_id) === roomFilter));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pilih Meja</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Room filter */}
          {rooms.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[{ id: 'all', name: 'Semua' }, ...rooms].map(r => (
                <button
                  key={r.id}
                  onClick={() => setRoomFilter(String(r.id))}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full font-medium transition-colors',
                    roomFilter === String(r.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Table grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
            {filtered.map(table => {
              const isSel = selected?.id === table.id;
              const canPick = table.status === 'available' || isSel;
              const s = STATUS[table.status] || STATUS.available;
              return (
                <button
                  key={table.id}
                  disabled={!canPick}
                  onClick={() => canPick && onSelect(isSel ? null : table)}
                  className={cn(
                    'rounded-xl border-2 p-2.5 text-center transition-all',
                    isSel
                      ? 'border-primary bg-primary text-primary-foreground shadow-md'
                      : s.style
                  )}
                >
                  <p className="font-bold text-sm">{table.table_number}</p>
                  {table.name && <p className="text-[9px] truncate opacity-70 mt-0.5">{table.name}</p>}
                  <p className="text-[9px] mt-0.5 opacity-70">{table.capacity} org</p>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-5 text-center text-sm text-muted-foreground py-8">Tidak ada meja</p>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full',
                  k === 'available' ? 'bg-green-500' :
                  k === 'occupied'  ? 'bg-red-500' :
                  k === 'reserved'  ? 'bg-amber-500' : 'bg-gray-400'
                )} />
                {v.label}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Checkout Dialog ──────────────────────────────────────────
function CheckoutDialog({
  open, onClose, cart, subtotal, discountAmt, taxAmt, total,
  paymentMethod, setPaymentMethod, payMethods, notes, setNotes,
  orderType, selectedTable, customerName, selectedMember, qrisString, fmt, onConfirm, placing,
}) {
  const [step, setStep] = useState('form');
  const [kodeUnik, setKodeUnik] = useState(0);
  
  // Fetch unique code when dialog opens
  useEffect(() => {
    if (open) {
      setStep('form');
      import('../lib/api').then(({ default: api }) => {
        api.get('/orders/qris/unique-code')
          .then(res => setKodeUnik(res.data.kode_unik))
          .catch(() => setKodeUnik(Math.floor(Math.random() * 900) + 100)); // Fallback if error
      });
    }
  }, [open]);

  const ICONS = { cash: '💵', digital: '📱', transfer: '🏦', wallet: '👛' };
  const isPendingPay = paymentMethod === 'pending';
  const qrisTotal = total + (paymentMethod === 'qris' ? kodeUnik : 0);
  const dynamicQris = paymentMethod === 'qris' && qrisString ? generateDynamicQris(qrisString, qrisTotal) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{step === 'qris' ? 'Pembayaran QRIS' : 'Konfirmasi Pembayaran'}</DialogTitle></DialogHeader>
        
        {step === 'qris' ? (
          <div className="space-y-4 py-4 flex flex-col items-center">
            {dynamicQris ? (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  Silakan minta pelanggan scan QR Code di bawah ini untuk membayar sejumlah 
                  <br/>
                  <strong className="text-xl text-primary">{fmt(qrisTotal)}</strong>
                </p>
                {kodeUnik > 0 && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                    Termasuk kode unik: {kodeUnik}
                  </p>
                )}
                <div className="bg-white p-4 rounded-2xl shadow-sm border mt-4">
                  <QRCodeSVG value={dynamicQris} size={200} level="M" />
                </div>
              </>
            ) : (
              <div className="text-center space-y-2 p-4">
                <p className="text-amber-600 font-semibold">String QRIS Belum Dikonfigurasi!</p>
                <p className="text-sm text-muted-foreground">Harap upload ulang gambar QRIS Anda di menu <strong>Settings &gt; Payments</strong> agar QR Code dinamis dapat muncul di sini.</p>
                <p className="text-sm text-muted-foreground mt-4">Jika Anda menggunakan EDC atau QRIS statis terpisah, silakan lanjutkan jika pelanggan sudah membayar.</p>
              </div>
            )}
            <div className="flex w-full gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep('form')} disabled={placing}>Kembali</Button>
              {dynamicQris && (
                <Button variant="outline" className="flex-1" disabled={placing} onClick={async () => {
                  try {
                    const { smartPrint } = await import('../lib/printer');
                    // Mock receipt data just for the QR code bill
                    const receipt = { qrisOnly: true, amount: qrisTotal, qris: dynamicQris };
                    // Dummy html
                    const html = `<div style="text-align:center"><h3>TAGIHAN</h3><p>Total: ${fmt(qrisTotal)}</p></div>`;
                    
                    // We need to fetch printer info from the backend or just rely on default
                    const { default: api } = await import('../lib/api');
                    const { data } = await api.get('/printers').catch(() => ({ data: { printers: [] } }));
                    const printer = data?.printers?.find(p => p.type === 'receipt' && p.is_active === 1) || null;
                    
                    await smartPrint(html, printer, 'receipt', receipt);
                  } catch (e) {
                    console.error('Print QRIS failed', e);
                  }
                }}>
                  <Receipt className="w-4 h-4 mr-2" /> Print QRIS
                </Button>
              )}
              <Button className="flex-1" onClick={() => onConfirm(true, true)} disabled={placing}>
                {placing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Utensils className="w-4 h-4 mr-2" />}
                Sudah Dibayar
              </Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Order summary */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tipe</span><span className="font-medium capitalize">{orderType}</span></div>
            {selectedTable && <div className="flex justify-between"><span className="text-muted-foreground">Meja</span><span className="font-medium">{selectedTable.name || selectedTable.table_number}</span></div>}
            {customerName && <div className="flex justify-between"><span className="text-muted-foreground">Pelanggan</span><span className="font-medium">{customerName}</span></div>}
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{cart.reduce((s, i) => s + i.qty, 0)} item · Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {discountAmt > 0 && <div className="flex justify-between text-green-600 text-xs"><span>Diskon</span><span>− {fmt(discountAmt)}</span></div>}
            {taxAmt > 0 && <div className="flex justify-between text-muted-foreground text-xs"><span>Pajak</span><span>{fmt(taxAmt)}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span>
              <span className="text-primary">{fmt(total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {payMethods.map(m => {
                const isBalance = m.code === 'balance';
                const noMember = isBalance && !selectedMember;
                return (
                  <button
                    type="button"
                    key={m.code}
                    onClick={() => !noMember && setPaymentMethod(m.code)}
                    disabled={noMember}
                    title={noMember ? 'Pilih member terlebih dulu' : undefined}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                      paymentMethod === m.code
                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                        : noMember
                          ? 'border-border/40 opacity-40 cursor-not-allowed'
                          : 'border-border hover:border-primary/40'
                    )}
                  >
                    {m.icon?.startsWith('http') || m.icon?.startsWith('/') ? (
                      <img src={m.icon.startsWith('http') ? m.icon : `/uploads/${m.icon.replace(/^\/uploads\//, '')}`} alt={m.name} className="h-6 w-auto object-contain" />
                    ) : (
                      <span className="text-xl">{m.icon || ICONS[m.type] || '💳'}</span>
                    )}
                    <span className="text-[10px] text-center leading-tight">{m.name}</span>
                    {isBalance && selectedMember && (
                      <span className="text-[9px] text-emerald-600 font-bold">
                        {fmt(selectedMember.balance || 0)}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Bayar Nanti */}
              <button
                onClick={() => setPaymentMethod('pending')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all',
                  isPendingPay
                    ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm'
                    : 'border-border hover:border-amber-300 text-muted-foreground hover:text-amber-700'
                )}
              >
                <Clock className="w-5 h-5" />
                <span className="text-[10px] text-center leading-tight">Bayar Nanti</span>
              </button>
            </div>

            {isPendingPay && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                Order akan dibuat dengan status <strong>belum bayar</strong>. Bayar bisa dilakukan nanti di halaman Pesanan.
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Catatan</p>
            <Input placeholder="Catatan pesanan…" value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={placing} className="h-11">Batal</Button>
            <Button variant="outline" onClick={() => onConfirm(false, true)} disabled={placing} className="h-11 gap-1 text-xs">
              {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Utensils className="w-3.5 h-3.5" />}
              Dapur
            </Button>
            <Button
              onClick={() => {
                if (paymentMethod === 'qris') {
                  setStep('qris');
                } else {
                  onConfirm(!isPendingPay, true);
                }
              }}
              disabled={placing}
              className={cn('h-11 gap-1 text-xs font-semibold', isPendingPay && 'bg-amber-500 hover:bg-amber-600')}
            >
              {placing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPendingPay ? <Clock className="w-3.5 h-3.5" /> : <Receipt className="w-3.5 h-3.5" />}
              {paymentMethod === 'qris' ? 'Lanjut QRIS' : (isPendingPay ? 'Simpan Order' : 'Bayar')}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Voucher Input ────────────────────────────────────────────
function VoucherInput({ subtotal, appliedVoucher, onApplied, onRemove }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const r = await api.post('/vouchers/validate', { code: code.trim().toUpperCase(), subtotal });
      onApplied(r.data);
      setCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Voucher tidak valid');
    } finally { setChecking(false); }
  };

  if (appliedVoucher) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <Ticket className="w-3.5 h-3.5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-green-700 truncate">{appliedVoucher.code}</p>
          <p className="text-[10px] text-green-600 truncate">{appliedVoucher.name}</p>
        </div>
        <button onClick={onRemove} className="text-green-500 hover:text-destructive transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Ticket className="w-4 h-4 text-muted-foreground shrink-0" />
      <Input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && handleCheck()}
        placeholder="Kode voucher..."
        className="h-8 text-sm flex-1 font-mono"
      />
      <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs shrink-0"
        onClick={handleCheck} disabled={checking || !code.trim()}>
        {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pakai'}
      </Button>
    </div>
  );
}

// ─── Variant/Addon Picker ─────────────────────────────────────
function VariantPickerDialog({ product, onClose, onConfirm, fmt }) {
  const toast = useToast();
  const { data, loading } = useFetch(`/variants/${product.id}`);
  const [selVariants, setSelVariants] = useState({});
  const [selAddons, setSelAddons] = useState({});

  const variantGroups = data?.variant_groups || [];
  const addonGroups   = data?.addon_groups   || [];

  // Auto-select defaults
  useState(() => {
    if (data?.variant_groups) {
      const defaults = {};
      data.variant_groups.forEach(g => {
        const def = g.options?.find(o => o.is_default);
        if (def) defaults[g.id] = def;
      });
      setSelVariants(defaults);
    }
  }, [data]);

  const variantMod  = Object.values(selVariants).reduce((s, o) => s + (o?.price_modifier || 0), 0);
  const addonsTotal = Object.entries(selAddons).reduce((s, [id, qty]) => {
    const addon = addonGroups.flatMap(g => g.addons || []).find(a => String(a.id) === id);
    return s + (addon ? addon.price * qty : 0);
  }, 0);
  const preview = parseFloat(product.price) + variantMod + addonsTotal;

  const handleConfirm = () => {
    for (const g of variantGroups) {
      if (g.is_required && !selVariants[g.id]) { toast.warning(`Pilih ${g.name} terlebih dulu`); return; }
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[88vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Layers className="w-4 h-4 text-violet-500" />
            <DialogTitle className="text-base">{product.name}</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">Harga dasar: {fmt(product.price)}</p>
        </div>

        {/* Scrollable options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {variantGroups.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <p className="text-sm font-semibold">{group.name}</p>
                    {group.is_required && <Badge variant="destructive" className="text-[9px] py-0 px-1.5">Wajib</Badge>}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      pilih {group.max_select === 1 ? '1' : `1–${group.max_select}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(group.options || []).map(opt => {
                      const sel = selVariants[group.id]?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelVariants(v => ({ ...v, [group.id]: sel ? null : opt }))}
                          className={cn(
                            'p-3 rounded-xl border-2 text-left transition-all',
                            sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{opt.name}</span>
                            {sel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className={cn('text-xs mt-0.5',
                            opt.price_modifier > 0 ? 'text-green-600' :
                            opt.price_modifier < 0 ? 'text-red-500' : 'text-muted-foreground'
                          )}>
                            {opt.price_modifier === 0 ? 'Sama' :
                             opt.price_modifier > 0 ? `+ ${fmt(opt.price_modifier)}` :
                             `− ${fmt(Math.abs(opt.price_modifier))}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {addonGroups.map(group => (
                <div key={group.id}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <p className="text-sm font-semibold">{group.name}</p>
                    {group.is_required && <Badge variant="destructive" className="text-[9px] py-0 px-1.5">Wajib</Badge>}
                    <span className="text-[10px] text-muted-foreground ml-auto">max {group.max_qty} item</span>
                  </div>
                  <div className="space-y-2">
                    {(group.addons || []).map(addon => {
                      const qty = selAddons[addon.id] || 0;
                      return (
                        <div
                          key={addon.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-xl border transition-all',
                            qty > 0 ? 'border-orange-300 bg-orange-50' : 'border-border'
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{addon.name}</p>
                            <p className="text-xs text-green-600">+ {fmt(addon.price)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={qty === 0}
                              onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.max(0, (a[addon.id] || 0) - 1) }))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                            <button
                              disabled={qty >= addon.max_qty}
                              onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.min(addon.max_qty, (a[addon.id] || 0) + 1) }))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
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

        {/* Footer: price preview + confirm */}
        <div className="px-5 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Per item</p>
            <p className="text-xl font-bold text-primary">{fmt(preview)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-10">Batal</Button>
            <Button onClick={handleConfirm} className="h-10 gap-1.5 px-5">
              <Plus className="w-4 h-4" />Tambah
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift Open Modal (embedded in POS) ──────────────────────
function ShiftOpenModal({ onClose, onOpened }) {
  const toast = useToast();
  const [openingCash, setOpeningCash] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = async () => {
    setSaving(true);
    try {
      await api.post('/shifts/open', { opening_cash: Number(openingCash) || 0, notes: notes || undefined });
      toast.success('Shift berhasil dibuka');
      onOpened();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal membuka shift');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-emerald-600" />Buka Shift Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Modal Kas Awal (Rp)</label>
            <Input type="number" placeholder="0" value={openingCash} onChange={e => setOpeningCash(e.target.value)} autoFocus className="text-lg font-bold h-11" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button onClick={handleOpen} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}Buka Shift
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shift Close Modal (embedded in POS) ─────────────────────
function ShiftCloseModal({ shift, fmt, onClose, onClosed }) {
  const toast = useToast();
  const [closingCash, setClosingCash] = useState('');
  const [handoverCash, setHandoverCash] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const expectedCash = parseFloat(shift.live_expected_cash || shift.opening_cash || 0);
  const closingNum   = Number(closingCash) || 0;
  const diff         = closingCash !== '' ? closingNum - expectedCash : null;

  const handleClose = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/shifts/${shift.id}/close`, {
        closing_cash: closingNum,
        notes: notes || undefined,
        handover_cash: handoverCash !== '' ? Number(handoverCash) : undefined,
      });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menutup shift');
    } finally { setSaving(false); }
  };

  const summary = result?.summary;

  return (
    <Dialog open onOpenChange={v => { if (!v && result) onClosed(); else if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-destructive" />{result ? 'Shift Ditutup' : `Tutup Shift — ${shift.shift_number}`}
          </DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[['Orders', String(summary.total_orders)], ['Revenue', fmt(summary.total_revenue)],
                ['Kas Awal', fmt(summary.opening_cash)], ['Kas Aktual', fmt(summary.closing_cash)],
                ['Kas Diharapkan', fmt(summary.expected_cash)]].map(([label, value]) => (
                <div key={label} className="border rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="font-bold text-sm mt-0.5">{value}</p>
                </div>
              ))}
              <div className={`border rounded-lg p-2.5 text-center ${Number(summary.cash_difference) >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                <p className="text-[10px] text-muted-foreground">Selisih</p>
                <p className={`font-bold text-sm mt-0.5 ${Number(summary.cash_difference) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Number(summary.cash_difference) > 0 ? '+' : ''}{fmt(summary.cash_difference)}
                </p>
              </div>
            </div>
            {summary.payment_breakdown?.map(p => (
              <div key={p.payment_method} className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">{p.payment_method} ({p.count}x)</span>
                <span className="font-medium">{fmt(p.total)}</span>
              </div>
            ))}
            <Button className="w-full" onClick={onClosed}>Selesai</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><p className="text-muted-foreground">Orders</p><p className="font-bold text-base">{shift.live_total_orders ?? '—'}</p></div>
              <div><p className="text-muted-foreground">Revenue</p><p className="font-bold text-sm">{fmt(shift.live_total_revenue)}</p></div>
              <div><p className="text-muted-foreground">Kas Exp.</p><p className="font-bold text-sm">{fmt(expectedCash)}</p></div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Kas Aktual di Laci (Rp) *</label>
              <Input type="number" placeholder="0" value={closingCash} onChange={e => setClosingCash(e.target.value)} autoFocus className="text-lg font-bold h-11" />
              {diff !== null && (
                <p className={`text-xs mt-1 font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {diff === 0 ? 'Kas pas ✓' : `Selisih: ${diff > 0 ? '+' : ''}${fmt(diff)}`}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Serahkan ke shift berikutnya (Rp) <span className="font-normal opacity-70">opsional</span></label>
              <Input type="number" placeholder="0" value={handoverCash} onChange={e => setHandoverCash(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
              <Button variant="destructive" onClick={handleClose} disabled={saving || closingCash === ''} className="flex-1 gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}Tutup Shift
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
