import { useState, useRef, useEffect } from 'react';
import { useFetch, useDebounce } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  Loader2, ChevronDown, X, Check, Coffee,
  Utensils, Layers, User, UserPlus, Phone, Star, Wallet,
  CheckCircle2, Building2,
} from 'lucide-react';

export default function WaiterPage() {
  const { user: currentUser } = useAuth();
  const [cart, setCart] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const debouncedSearch = useDebounce(search, 350);
  const branchQs = currentUser?.branch_id ? `&branch_id=${currentUser.branch_id}` : '';
  const qs = `/products?limit=200${activeCategory !== 'all' ? `&category=${activeCategory}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}${branchQs}`;
  const { data: productsData, loading: loadingProducts } = useFetch(qs);
  const { data: catData }      = useFetch('/categories');
  const { data: settingsData } = useFetch('/settings');
  const { data: tablesData, refetch: refetchTables } = useFetch('/tables');
  const { data: branchesData } = useFetch('/branches');
  const currentBranch = currentUser?.branch_id
    ? (branchesData?.branches || []).find(b => b.id === currentUser.branch_id)
    : null;

  const products   = (productsData?.products || []).filter(p => p.is_available && p.status === 'active');
  const categories = catData?.categories || [];
  const tables     = tablesData?.tables || [];
  const settings   = (settingsData?.settings || []).reduce((a, s) => ({ ...a, [s.setting_key]: s.setting_value }), {});
  const currency   = settings.currency_symbol || 'Rp';
  const taxRate    = parseFloat(settings.tax_rate || 0);

  const subtotal   = cart.reduce((s, i) => s + (i.unitPrice + (i.addonsPerUnit || 0)) * i.qty, 0);
  const taxAmt     = Math.round(subtotal * taxRate / 100 * 100) / 100;
  const total      = subtotal + taxAmt;
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const fmt = (v) => `${currency} ${Number(v || 0).toLocaleString('id')}`;

  const makeKey = (pid, variants, addons) => {
    const v = (variants || []).map(x => `v${x.option_id}`).sort().join('-');
    const a = (addons   || []).map(x => `a${x.addon_id}x${x.qty}`).sort().join('-');
    return `${pid}_${v}_${a}`;
  };

  const addItem = (product, variants = [], addons = []) => {
    const mod        = variants.reduce((s, v) => s + (v.price_modifier || 0), 0);
    const addonsUnit = addons.reduce((s, a) => s + (a.unit_price || 0) * (a.qty || 1), 0);
    const unitPrice  = parseFloat(product.price) + mod;
    const vLabel     = variants.map(v => v.option_name).join(', ');
    const name       = vLabel ? `${product.name} (${vLabel})` : product.name;
    const key        = makeKey(product.id, variants, addons);
    setCart(c => {
      const ex = c.find(i => i.cartKey === key);
      if (ex) return c.map(i => i.cartKey === key ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { cartKey: key, id: product.id, name, price: parseFloat(product.price), unitPrice, addonsPerUnit: addonsUnit, variants, addons, qty: 1, notes: '' }];
    });
  };

  const handleProductClick = (product) => {
    if (!selectedTable) { setTablePickerOpen(true); return; }
    if (product.has_variants || product.has_addons || product.variant_groups?.length || product.addon_groups?.length) setVariantProduct(product);
    else addItem(product);
  };

  const updateQty  = (key, delta) => setCart(c =>
    c.map(i => i.cartKey === key ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)
  );
  const clearCart  = () => { setCart([]); setCustomerName(''); setNotes(''); setSelectedMember(null); };
  const onMemberSelect = (member) => { setSelectedMember(member); setCustomerName(member ? member.name : ''); };

  const placeOrder = async () => {
    if (!cart.length || !selectedTable) return;
    setPlacing(true);
    try {
      const res = await api.post('/orders', {
        customer_name:  customerName || 'Umum',
        customer_email: selectedMember?.email || null,
        customer_phone: selectedMember?.phone || null,
        order_type:     'dine-in',
        table_number:   selectedTable.table_number,
        table_id:       selectedTable.id,
        payment_method: 'cash',
        notes:          notes || null,
        discount:       0,
        items: cart.map(i => ({
          product_id: i.id, quantity: i.qty, notes: i.notes || null,
          variants: (i.variants || []).map(v => ({ group_id: v.group_id, option_id: v.option_id })),
          addons:   (i.addons   || []).map(a => ({ addon_id: a.addon_id, qty: a.qty })),
        })),
      });
      setSuccessOrder(res.data.order);
      refetchTables();
      clearCart();
      setSelectedTable(null);
      setTimeout(() => setSuccessOrder(null), 4000);
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Gagal membuat order');
    } finally { setPlacing(false); }
  };

  const cartProps = {
    cart, selectedTable, customerName, setCustomerName, selectedMember, onMemberSelect,
    notes, setNotes, subtotal, taxAmt, taxRate, total, totalItems, fmt, updateQty,
    onRemove:     (key)       => setCart(c => c.filter(i => i.cartKey !== key)),
    onNoteChange: (key, note) => setCart(c => c.map(i => i.cartKey === key ? { ...i, notes: note } : i)),
    onClear: clearCart, onPlaceOrder: placeOrder, placing,
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-muted/30">

      {/* ── Success overlay ──────────────────────────────────── */}
      {successOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-10 flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">Pesanan Masuk!</p>
            <p className="text-5xl font-black tracking-wider text-foreground">{successOrder.order_number}</p>
            <p className="text-sm text-muted-foreground">Menutup otomatis…</p>
          </div>
        </div>
      )}

      {/* ── LEFT: Product area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Table selector — prominent banner */}
        <div className={cn(
          'px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0',
          selectedTable ? 'bg-primary/5 border-primary/30' : 'bg-amber-50 border-amber-300'
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              selectedTable ? 'bg-primary text-primary-foreground' : 'bg-amber-400 text-white'
            )}>
              <Utensils className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              {selectedTable ? (
                <>
                  <p className="text-xs text-muted-foreground leading-tight">Meja Terpilih</p>
                  <p className="font-bold text-base text-primary leading-tight truncate">
                    {selectedTable.name || `Meja ${selectedTable.table_number}`}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-800 text-base leading-tight">Pilih Meja</p>
                  <p className="text-xs text-amber-600 leading-tight">Wajib pilih meja sebelum memesan</p>
                </>
              )}
            </div>
          </div>
          <Button
            onClick={() => setTablePickerOpen(true)}
            size="sm"
            variant={selectedTable ? 'outline' : 'default'}
            className={cn('shrink-0', !selectedTable && 'bg-amber-500 hover:bg-amber-600 text-white border-0')}
          >
            {selectedTable ? 'Ganti' : 'Pilih Meja'}
          </Button>
        </div>

        {/* Search + categories */}
        <div className="bg-card border-b px-4 py-3 space-y-3 shrink-0">
          {currentBranch && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">{currentBranch.name}</span>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk…" className="pl-9 pr-9 h-10 bg-background text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {[{ id: 'all', name: 'Semua' }, ...categories.filter(c => c.is_active)].map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(String(cat.id))}
                className={cn('shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                  activeCategory === String(cat.id) ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}>{cat.name}</button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm">{debouncedSearch ? `Tidak ada hasil untuk "${debouncedSearch}"` : 'Tidak ada produk tersedia'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {products.map(product => {
                const cartQty   = cart.filter(i => i.id === product.id).reduce((s, i) => s + i.qty, 0);
                const hasVars   = product.has_variants || product.has_addons || product.variant_groups?.length || product.addon_groups?.length;
                return (
                  <button key={product.id} onClick={() => handleProductClick(product)}
                    className={cn('relative flex flex-col items-center text-center rounded-2xl border-2 p-3 transition-all hover:shadow-md active:scale-95 gap-1.5',
                      cartQty > 0 ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:border-primary/40'
                    )}>
                    {cartQty > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center z-10 shadow">{cartQty}</span>}
                    {hasVars && <span className="absolute top-1.5 left-1.5"><Layers className="w-3 h-3 text-violet-400" /></span>}
                    <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center"><Coffee className="w-5 h-5 text-muted-foreground/60" /></div>
                    <p className="text-xs font-medium leading-tight line-clamp-2 w-full">{product.name}</p>
                    <p className="text-sm font-bold text-primary">{fmt(product.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart panel (desktop) ──────────────────────── */}
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-card border-l">
        <WaiterCart {...cartProps} />
      </div>

      {/* ── MOBILE: FAB + bottom sheet ───────────────────────── */}
      <div className="lg:hidden">
        {cart.length > 0 && (
          <button onClick={() => setMobileCartOpen(true)}
            className="fixed bottom-6 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3.5 rounded-2xl shadow-xl font-semibold text-sm">
            <ShoppingCart className="w-4 h-4" />
            <span>{totalItems} item</span>
            <span className="ml-1 opacity-80">·</span>
            <span>{fmt(total)}</span>
          </button>
        )}
        {mobileCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
            <div className="relative bg-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b shrink-0">
                <div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-muted-foreground" /><span className="font-semibold text-sm">Keranjang ({totalItems})</span></div>
                <button onClick={() => setMobileCartOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary"><ChevronDown className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto"><WaiterCart {...cartProps} isMobile /></div>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────── */}
      <TablePickerDialog open={tablePickerOpen} onClose={() => setTablePickerOpen(false)}
        tables={tables} selected={selectedTable}
        onSelect={(t) => { setSelectedTable(t); setTablePickerOpen(false); }} />

      {variantProduct && (
        <VariantPickerDialog product={variantProduct} fmt={fmt}
          onClose={() => setVariantProduct(null)}
          onConfirm={(variants, addons) => { addItem(variantProduct, variants, addons); setVariantProduct(null); }} />
      )}
    </div>
  );
}

// ─── Waiter Cart Panel ────────────────────────────────────────
function WaiterCart({ cart, selectedTable, customerName, setCustomerName, selectedMember, onMemberSelect,
  notes, setNotes, subtotal, taxAmt, taxRate, total, totalItems, fmt, updateQty,
  onRemove, onNoteChange, onClear, onPlaceOrder, placing }) {
  return (
    <>
      {/* Header: table info + customer */}
      <div className="px-4 py-3 border-b space-y-2.5 shrink-0">
        {selectedTable ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 border border-primary/30 rounded-xl">
            <Utensils className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-primary flex-1 truncate">
              {selectedTable.name || `Meja ${selectedTable.table_number}`}
            </span>
            <span className="text-[10px] text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full font-medium">Dine-in</span>
          </div>
        ) : (
          <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-center font-medium">
            Belum ada meja dipilih
          </div>
        )}
        <CustomerPicker selected={selectedMember} onSelect={onMemberSelect}
          customerName={customerName} setCustomerName={setCustomerName} fmt={fmt} />
      </div>

      {/* Cart items */}
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
              <CartItem key={item.cartKey} item={item} fmt={fmt}
                onQtyChange={(d) => updateQty(item.cartKey, d)}
                onRemove={() => onRemove(item.cartKey)}
                onNoteChange={(note) => onNoteChange(item.cartKey, note)} />
            ))}
          </div>
        )}
      </div>

      {/* Summary + actions */}
      {cart.length > 0 && (
        <div className="border-t px-4 py-3 space-y-3 shrink-0">
          <Input placeholder="Catatan pesanan…" value={notes} onChange={e => setNotes(e.target.value)} className="h-8 text-sm" />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{totalItems} item · Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {taxAmt > 0 && (
              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Pajak ({taxRate}%)</span><span>{fmt(taxAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t">
              <span>Total</span><span className="text-primary">{fmt(total)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClear} className="h-10 px-3" title="Kosongkan keranjang">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
            <Button size="sm" onClick={onPlaceOrder} disabled={placing || !selectedTable} className="flex-1 h-10 gap-2 text-sm font-semibold">
              {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {placing ? 'Memproses…' : 'Kirim Pesanan'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Cart Item ────────────────────────────────────────────────
function CartItem({ item, fmt, onQtyChange, onRemove, onNoteChange }) {
  const [showNote, setShowNote] = useState(false);
  const lineTotal = (item.unitPrice + (item.addonsPerUnit || 0)) * item.qty;
  return (
    <div className="bg-background rounded-xl border p-2.5 group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-snug">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-primary font-medium">{fmt(item.unitPrice)}</span>
            {item.addonsPerUnit > 0 && <span className="text-[10px] text-orange-500">+{fmt(item.addonsPerUnit)}</span>}
          </div>
          {item.addons?.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              {item.addons.map(a => `${a.addon_name}${a.qty > 1 ? ` ×${a.qty}` : ''}`).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onQtyChange(-1)} className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"><Minus className="w-3 h-3" /></button>
          <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qty}</span>
          <button onClick={() => onQtyChange(1)} className="w-6 h-6 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground transition-colors"><Plus className="w-3 h-3" /></button>
          <button onClick={onRemove} className="w-6 h-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive/50 hover:text-destructive transition-colors ml-0.5"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <button onClick={() => setShowNote(v => !v)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
          <Plus className="w-2.5 h-2.5" />{item.notes ? item.notes : 'Catatan'}
        </button>
        <span className="text-xs font-bold">{fmt(lineTotal)}</span>
      </div>
      {showNote && (
        <Input autoFocus placeholder="Catatan untuk item ini…" value={item.notes}
          onChange={e => onNoteChange(e.target.value)}
          onBlur={() => { if (!item.notes) setShowNote(false); }}
          className="mt-1.5 h-7 text-xs" />
      )}
    </div>
  );
}

// ─── Customer Picker ──────────────────────────────────────────
function CustomerPicker({ selected, onSelect, customerName, setCustomerName, fmt }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '' });
  const [registering, setRegistering] = useState(false);
  const dropdownRef = useRef(null);
  const debouncedQ = useDebounce(query, 300);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      setShowRegister(false); setQuery(''); setShowDropdown(false);
      setRegForm({ name: '', phone: '', email: '' });
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.user) {
        onSelect(err.response.data.user);
        setShowRegister(false); setQuery(''); setShowDropdown(false);
      } else {
        alert(err.response?.data?.error || 'Gagal mendaftarkan member');
      }
    } finally { setRegistering(false); }
  };

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/30 rounded-xl">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-primary-foreground" /></div>
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
              <span className="text-[10px] text-primary font-medium flex items-center gap-0.5"><Wallet className="w-2.5 h-2.5" />{fmt(selected.balance)}</span>
            )}
          </div>
        </div>
        <button onClick={() => onSelect(null)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {!showRegister ? (
        <>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input type="text" value={query || customerName} placeholder="Cari member (kosong = Umum)"
                onChange={e => { const v = e.target.value; setQuery(v); setCustomerName(v); setShowDropdown(true); }}
                onFocus={() => { if (query.length >= 2) setShowDropdown(true); }}
                className="w-full pl-8 pr-3 h-9 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
              {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
            <button type="button"
              onClick={() => { setShowRegister(true); setRegForm({ name: customerName, phone: '', email: '' }); }}
              className="w-9 h-9 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
              title="Daftarkan member baru"><UserPlus className="w-4 h-4" /></button>
          </div>
          {showDropdown && query.length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-card rounded-xl border shadow-lg z-50 overflow-hidden">
              {results.length === 0 && !searching ? (
                <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                  Tidak ada member ditemukan
                  <button className="block mx-auto mt-1.5 text-primary font-medium hover:underline"
                    onClick={() => { setShowRegister(true); setRegForm({ name: query, phone: '', email: '' }); setShowDropdown(false); }}>
                    + Daftarkan sebagai member baru
                  </button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-border">
                  {results.map(u => (
                    <button key={u.id} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                      onClick={() => { onSelect(u); setQuery(''); setShowDropdown(false); }}>
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          {u.is_priority && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                          {u.member_number && <span className="font-mono">{u.member_number}</span>}
                          <span><Phone className="inline w-2.5 h-2.5 mr-0.5" />{u.phone || '—'}</span>
                          {parseFloat(u.balance || 0) > 0 && <span className="text-primary font-medium"><Wallet className="inline w-2.5 h-2.5 mr-0.5" />{fmt(u.balance)}</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Daftarkan Member Baru</p>
            <button onClick={() => setShowRegister(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
          <form onSubmit={handleRegister} className="space-y-1.5">
            <input required placeholder="Nama lengkap *" value={regForm.name}
              onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-8 px-3 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Phone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input required placeholder="No. HP *" value={regForm.phone}
                  onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full h-8 pl-6 pr-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <input type="email" placeholder="Email (opsional)" value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                className="flex-1 h-8 px-2 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
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
  );
}

// ─── Table Picker Dialog ──────────────────────────────────────
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
          {rooms.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[{ id: 'all', name: 'Semua' }, ...rooms].map(r => (
                <button key={r.id} onClick={() => setRoomFilter(String(r.id))}
                  className={cn('px-3 py-1 text-xs rounded-full font-medium transition-colors',
                    roomFilter === String(r.id) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}>{r.name}</button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
            {filtered.map(table => {
              const isSel  = selected?.id === table.id;
              const canPick = table.status === 'available' || isSel;
              const s = STATUS[table.status] || STATUS.available;
              return (
                <button key={table.id} disabled={!canPick}
                  onClick={() => canPick && onSelect(isSel ? null : table)}
                  className={cn('rounded-xl border-2 p-2.5 text-center transition-all',
                    isSel ? 'border-primary bg-primary text-primary-foreground shadow-md' : s.style
                  )}>
                  <p className="font-bold text-sm">{table.table_number}</p>
                  {table.name && <p className="text-[9px] truncate opacity-70 mt-0.5">{table.name}</p>}
                  <p className="text-[9px] mt-0.5 opacity-70">{table.capacity} org</p>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="col-span-5 text-center text-sm text-muted-foreground py-8">Tidak ada meja</p>}
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground flex-wrap">
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full',
                  k === 'available' ? 'bg-green-500' : k === 'occupied' ? 'bg-red-500' : k === 'reserved' ? 'bg-amber-500' : 'bg-gray-400'
                )} />{v.label}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Variant / Addon Picker Dialog ────────────────────────────
function VariantPickerDialog({ product, onClose, onConfirm, fmt }) {
  const { data, loading } = useFetch(`/variants/${product.id}`);
  const [selVariants, setSelVariants] = useState({});
  const [selAddons, setSelAddons] = useState({});

  const variantGroups = data?.variant_groups || [];
  const addonGroups   = data?.addon_groups   || [];

  useState(() => {
    if (data?.variant_groups) {
      const defaults = {};
      data.variant_groups.forEach(g => { const def = g.options?.find(o => o.is_default); if (def) defaults[g.id] = def; });
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[88vh] flex flex-col overflow-hidden p-0">
        <div className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 mb-0.5"><Layers className="w-4 h-4 text-violet-500" /><DialogTitle className="text-base">{product.name}</DialogTitle></div>
          <p className="text-xs text-muted-foreground">Harga dasar: {fmt(product.price)}</p>
        </div>
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
                    <span className="text-[10px] text-muted-foreground ml-auto">pilih {group.max_select === 1 ? '1' : `1–${group.max_select}`}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(group.options || []).map(opt => {
                      const sel = selVariants[group.id]?.id === opt.id;
                      return (
                        <button key={opt.id} onClick={() => setSelVariants(v => ({ ...v, [group.id]: sel ? null : opt }))}
                          className={cn('p-3 rounded-xl border-2 text-left transition-all', sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{opt.name}</span>
                            {sel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <p className={cn('text-xs mt-0.5', opt.price_modifier > 0 ? 'text-green-600' : opt.price_modifier < 0 ? 'text-red-500' : 'text-muted-foreground')}>
                            {opt.price_modifier === 0 ? 'Sama' : opt.price_modifier > 0 ? `+ ${fmt(opt.price_modifier)}` : `− ${fmt(Math.abs(opt.price_modifier))}`}
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
                        <div key={addon.id} className={cn('flex items-center justify-between p-3 rounded-xl border transition-all', qty > 0 ? 'border-orange-300 bg-orange-50' : 'border-border')}>
                          <div><p className="text-sm font-medium">{addon.name}</p><p className="text-xs text-green-600">+ {fmt(addon.price)}</p></div>
                          <div className="flex items-center gap-2">
                            <button disabled={qty === 0}
                              onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.max(0, (a[addon.id] || 0) - 1) }))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"><Minus className="w-3 h-3" /></button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{qty}</span>
                            <button disabled={qty >= addon.max_qty}
                              onClick={() => setSelAddons(a => ({ ...a, [addon.id]: Math.min(addon.max_qty, (a[addon.id] || 0) + 1) }))}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"><Plus className="w-3 h-3" /></button>
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
        <div className="px-5 py-4 border-t bg-muted/20 shrink-0 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Per item</p>
            <p className="text-xl font-bold text-primary">{fmt(preview)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-10">Batal</Button>
            <Button onClick={handleConfirm} className="h-10 gap-1.5 px-5"><Plus className="w-4 h-4" />Tambah</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
