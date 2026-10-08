import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Settings, Image,
  ChevronLeft, ChevronRight, ChevronDown, Coffee, X,
  ClipboardList, Tag, DoorOpen, TableProperties, CreditCard,
  Warehouse, ShieldCheck, MonitorSmartphone, UtensilsCrossed,
  Printer, Layers, FlaskConical, BookMarked, Receipt, Banknote, Building2, QrCode,
  UserCheck, ChefHat, Scale, Users2, Wifi, BarChart3, Clock, Router, FileText,
  TrendingUp, CalendarCheck, Ticket, DatabaseBackup, PanelTop, Scan, CalendarDays, Timer
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { useGlobalBranch } from '../../context/BranchContext';
import { useFetch } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

// ─── Nav structure builder ────────────────────────────────────
export function buildNavGroups(settings = {}) {
  const {
    hrEnabled = true,
    bookingEnabled = true,
    inventoryEnabled = true,
    wifiEnabled = true,
  } = settings;

  const groups = [
  {
    key: 'kasir',
    label: 'Kasir & Order',
    icon: MonitorSmartphone,
    color: 'text-amber-600',
    items: [
      { to: '/pos',         icon: MonitorSmartphone, label: 'POS Kasir',            roles: ['admin', 'kasir'] },
      { to: '/waiter',      icon: UserCheck,         label: 'Waiter Order',         roles: ['admin', 'waiter'] },
      { to: '/table-order', icon: UtensilsCrossed,   label: 'Table Order',          roles: ['admin', 'kasir', 'waiter'] },
      { to: '/orders',      icon: ShoppingBag,       label: 'Pesanan',              roles: ['admin', 'kasir', 'waiter'] },
      { to: '/services',    icon: CalendarCheck,     label: 'Layanan & Pre-Order',  roles: ['admin', 'kasir', 'waiter'] },
    ],
  },
  {
    key: 'produk',
    label: 'Produk & Menu',
    icon: Package,
    color: 'text-violet-600',
    items: [
      { to: '/products',    icon: Package,    label: 'Produk',         roles: ['admin', 'station'] },
      { to: '/variants',    icon: Layers,     label: 'Varian & Addon', roles: ['admin', 'station'] },
      { to: '/categories',  icon: Tag,        label: 'Kategori',       roles: ['admin', 'station'] },
    ],
  },
  ...(bookingEnabled ? [{
    key: 'reservasi',
    label: 'Reservasi & Meja',
    icon: ClipboardList,
    color: 'text-blue-600',
    items: [
      { to: '/bookings', icon: ClipboardList,   label: 'Booking', adminOnly: true },
      { to: '/rooms',    icon: DoorOpen,        label: 'Room',    adminOnly: true },
      { to: '/tables',   icon: TableProperties, label: 'Meja',    adminOnly: true },
    ],
  }] : []),
  ...(inventoryEnabled ? [{
    key: 'inventori',
    label: 'Inventori & Stok',
    icon: Warehouse,
    color: 'text-emerald-600',
    items: [
      { to: '/stock',       icon: Warehouse,    label: 'Stok',        roles: ['admin', 'station'] },
      { to: '/units',       icon: Scale,        label: 'Satuan',      roles: ['admin', 'station'] },
      { to: '/ingredients', icon: FlaskConical, label: 'Bahan Baku',  roles: ['admin', 'station'] },
      { to: '/recipes',     icon: BookMarked,   label: 'Resep & HPP', roles: ['admin', 'station'] },
    ],
  }] : []),
  {
    key: 'keuangan',
    label: 'Keuangan',
    icon: Banknote,
    color: 'text-green-600',
    items: [
      { to: '/expenses', icon: Receipt,    label: 'Pengeluaran', adminOnly: true },
      { to: '/payments', icon: CreditCard, label: 'Pembayaran',  adminOnly: true },
    ],
  },
  {
    key: 'cabang',
    label: 'Cabang & QR',
    icon: Building2,
    color: 'text-cyan-600',
    adminOnly: true,
    items: [
      { to: '/branches', icon: Building2, label: 'Cabang & QR Meja' },
    ],
  },
  {
    key: 'operasional',
    label: 'Operasional',
    icon: Printer,
    color: 'text-orange-500',
    items: [
      { to: '/printers',  icon: Printer, label: 'Printer',  adminOnly: true },
      { to: '/stations',  icon: ChefHat, label: 'Stasiun',  adminOnly: true },
    ],
  },
  {
    key: 'laporan',
    label: 'Laporan',
    icon: BarChart3,
    color: 'text-indigo-600',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Laporan', adminOnly: true },
    ],
  },
  {
    key: 'marketing',
    label: 'Pelanggan & Promo',
    icon: Ticket,
    color: 'text-pink-600',
    adminOnly: true,
    items: [
      { to: '/members',       icon: Users2,      label: 'Manajemen Member', adminOnly: true },
      { to: '/vouchers',      icon: Ticket,      label: 'Voucher & Promo',  adminOnly: true },
    ],
  },
  ...(hrEnabled ? [{
    key: 'sdm',
    label: 'SDM & KPI',
    icon: Users,
    color: 'text-violet-600',
    adminOnly: true,
    items: [
      { to: '/hr',           icon: Users,        label: 'Karyawan & Absensi', adminOnly: true },
      { to: '/hr/schedule',  icon: CalendarDays, label: 'Jadwal Kerja',       adminOnly: true },
      { to: '/hr/overtime',  icon: Timer,        label: 'Lembur',             adminOnly: true },
      { to: '/hr/kpi',       icon: TrendingUp,   label: 'KPI',                adminOnly: true },
      { to: '/kiosk',        icon: Scan,         label: 'Kiosk Absensi (Live)', external: true },
    ],
  }] : []),
  {
    key: 'konten',
    label: 'Konten & Media',
    icon: FileText,
    color: 'text-violet-600',
    adminOnly: true,
    items: [
      { to: '/social-posts', icon: FileText, label: 'Moderasi Feed', adminOnly: true },
      { to: '/posts',      icon: FileText, label: 'Post & Halaman', adminOnly: true },
      { to: '/media',      icon: Image,    label: 'Galeri Media',    adminOnly: true },
      { to: '/navigation', icon: PanelTop, label: 'Navigasi Menu',   adminOnly: true },
    ],
  },
  {
    key: 'advanced',
    label: 'Advanced',
    icon: Settings,
    color: 'text-purple-600',
    adminOnly: true,
    items: [
      { to: '/shift',         icon: Clock,             label: 'Shift & Jadwal',     adminOnly: true },
      ...(wifiEnabled ? [
        { to: '/wifi-settings', icon: Wifi,            label: 'Pengaturan WiFi',    adminOnly: true },
        { to: '/routeros',      icon: Router,          label: 'RouterOS Monitor',   adminOnly: true },
      ] : []),
    ],
  },
  {
    key: 'admin',
    label: 'Admin & Sistem',
    icon: ShieldCheck,
    color: 'text-red-500',
    adminOnly: true,
    items: [
      { to: '/users',         icon: Users,       label: 'Pengguna' },
      { to: '/roles',         icon: ShieldCheck,    label: 'Roles',       adminOnly: true },
      { to: '/audit',         icon: ShieldCheck,    label: 'Audit Trail' },
      { to: '/backup',        icon: DatabaseBackup, label: 'Backup DB',   adminOnly: true },
      { to: '/settings',      icon: Settings,       label: 'Pengaturan' },
    ],
  },
];

  return groups;
}

// ─── Helpers ──────────────────────────────────────────────────
const STORAGE_KEY = 'sidebar_groups_open';

function loadGroupStates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveGroupStates(states) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

// ─── NavItem ──────────────────────────────────────────────────
function NavItem({ item, collapsed, indent = false }) {
  const location = useLocation();
  const isActive = item.to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      className={cn(
        'nav-link group relative',
        isActive && 'active',
        collapsed ? 'justify-center px-0' : indent && 'pl-8'
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate text-sm">{item.label}</span>}
      {/* Tooltip on collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-3 hidden group-hover:flex items-center bg-foreground text-background text-xs rounded-md px-2 py-1 whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {item.label}
        </div>
      )}
    </NavLink>
  );
}

// ─── NavGroup ─────────────────────────────────────────────────
function NavGroup({ group, collapsed, open, onToggle, userRole }) {
  const location = useLocation();

  const visibleItems = group.items.filter(item => {
    if (userRole === 'admin') return true;
    if (item.adminOnly) return false;
    if (item.roles) return item.roles.includes(userRole);
    return true; // default: all authenticated roles
  });
  if (!visibleItems.length) return null;

  // Is any child active?
  const hasActive = visibleItems.some(item =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  // Collapsed sidebar → render flat icons, no group header
  if (collapsed) {
    return (
      <div className="space-y-0.5 py-1 border-b border-border/50 last:border-0">
        {visibleItems.map(item => (
          <NavItem key={item.to} item={item} collapsed={true} />
        ))}
      </div>
    );
  }

  const GroupIcon = group.icon;

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => onToggle(group.key)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors select-none',
          hasActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
          'hover:bg-secondary/60'
        )}
      >
        <GroupIcon className={cn('w-3.5 h-3.5 shrink-0', group.color)} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200 text-muted-foreground',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Items — animated slide */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="mt-0.5 space-y-0.5 pb-1">
          {visibleItems.map(item => (
            <NavItem key={item.to} item={item} collapsed={false} indent={true} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
export default function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  const { user } = useAuth();
  const branchContext = useGlobalBranch();
  const selectedBranchId = branchContext?.branchId;
  const { data: branchData } = useFetch('/branches');
  const branches = branchData?.branches || [];

  // Resolve active branch name
  let activeBranchName = '';
  if (user?.role === 'admin') {
    if (selectedBranchId && selectedBranchId !== 'all') {
      const found = branches.find(b => String(b.id) === String(selectedBranchId));
      activeBranchName = found ? found.name : (user?.branch_name || '');
    } else {
      activeBranchName = 'Semua Cabang';
    }
  } else {
    activeBranchName = user?.branch_name || branches.find(b => String(b.id) === String(user?.branch_id))?.name || '';
  }

  const location = useLocation();
  const [settings, setSettings] = useState({
    hrEnabled: true,
    bookingEnabled: true,
    inventoryEnabled: true,
    wifiEnabled: true,
  });

  const [cafeName, setCafeName] = useState(() => sessionStorage.getItem('admin_cafe_name') || '');

  // Load feature flags from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Fetch general settings (accessible by all roles)
        const settingsRes = await api.get('/settings');
        const generalSettings = settingsRes.data?.settings || [];
        const gsMap = Array.isArray(generalSettings)
          ? generalSettings.reduce((a, s) => ({ ...a, [s.setting_key]: s.setting_value }), {})
          : generalSettings;

        const dynamicName = gsMap.cafe_name || gsMap.site_name || '';
        if (dynamicName) {
          setCafeName(dynamicName);
          sessionStorage.setItem('admin_cafe_name', dynamicName);
        }

        setSettings({
          hrEnabled: gsMap.hr_enabled === 'true',
          bookingEnabled: gsMap.enable_booking !== 'false',
          inventoryEnabled: gsMap.inventory_enabled !== 'false',
          wifiEnabled: gsMap.wifi_enabled !== 'false',
        });
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };

    loadSettings();

    // Reload when settings are saved from any page
    window.addEventListener('settings-updated', loadSettings);
    return () => window.removeEventListener('settings-updated', loadSettings);
  }, [user?.role]);

  const navGroups = buildNavGroups(settings);

  // Per-group open state, persisted
  const [groupOpen, setGroupOpen] = useState(() => {
    const saved = loadGroupStates();
    // Default: all open
    const defaults = {};
    buildNavGroups({
      hrEnabled: true,
      bookingEnabled: true,
      inventoryEnabled: true,
      wifiEnabled: true,
    }).forEach(g => { defaults[g.key] = saved[g.key] !== undefined ? saved[g.key] : true; });
    return defaults;
  });

  // Auto-expand the group that contains the active route
  useEffect(() => {
    for (const group of navGroups) {
      const hasActive = group.items.some(item =>
        item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
      );
      if (hasActive) {
        setGroupOpen(prev => {
          if (prev[group.key]) return prev; // already open
          const next = { ...prev, [group.key]: true };
          saveGroupStates(next);
          return next;
        });
        break;
      }
    }
  }, [location.pathname, navGroups]);

  const toggleGroup = (key) => {
    setGroupOpen(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveGroupStates(next);
      return next;
    });
  };

  const visibleGroups = navGroups.filter(
    g => !g.adminOnly || user?.role === 'admin'
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-card border-r z-50 flex flex-col sidebar-transition',
          'shadow-xl lg:shadow-none',
          collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo & Cafe / Branch info */}
        <div className={cn(
          'flex items-center border-b px-4 h-14 shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <Coffee className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-sm font-semibold font-cafe text-foreground truncate">{cafeName || 'Admin Panel'}</p>
                {activeBranchName ? (
                  <p className="text-[11px] text-muted-foreground truncate font-medium flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{activeBranchName}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Admin Panel</p>
                )}
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center cursor-pointer shadow-sm"
              title={`${cafeName || 'Admin Panel'}${activeBranchName ? ` • ${activeBranchName}` : ''}`}
            >
              <Coffee className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-secondary text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dedicated Branch Pill / Info Banner */}
        {!collapsed && activeBranchName && (
          <div className="px-3 pt-2.5 pb-0.5 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground leading-none">Cabang</p>
                <p className="text-xs font-semibold text-foreground truncate mt-0.5">{activeBranchName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard — always standalone */}
        <div className={cn('px-3 pt-2 pb-1 shrink-0', collapsed && 'px-2')}>
          <NavItem
            item={{
              to: '/',
              icon: user?.role === 'station' || user?.role === 'kitchen' ? ChefHat : LayoutDashboard,
              label: user?.role === 'station' || user?.role === 'kitchen' ? `Stasiun ${user?.station?.name || 'Dapur'}` : 'Dashboard'
            }}
            collapsed={collapsed}
          />
        </div>

        {/* Divider */}
        <div className="mx-3 border-t mb-1" />

        {/* Grouped Nav */}
        <nav className={cn(
          'flex-1 overflow-y-auto pb-4',
          collapsed ? 'px-2 pt-1' : 'px-3 pt-1'
        )}>
          {visibleGroups.map(group => (
            <NavGroup
              key={group.key}
              group={group}
              collapsed={collapsed}
              open={groupOpen[group.key] !== false}
              onToggle={toggleGroup}
              userRole={user?.role}
            />
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="border-t p-2 hidden lg:flex justify-end shrink-0">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
