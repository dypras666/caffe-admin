import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSidebar } from '../../context/SidebarContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '../../lib/utils';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/orders': 'Manajemen Pesanan',
  '/products': 'Manajemen Produk',
  '/categories': 'Kategori Produk',
  '/bookings': 'Manajemen Booking',
  '/rooms': 'Manajemen Room',
  '/tables': 'Manajemen Meja',
  '/pos': 'POS — Point of Sale',
  '/table-order': 'Table Order & Floor Plan',
  '/printers': 'Manajemen Printer',
  '/payments': 'Metode Pembayaran & Saldo',
  '/branches': 'Cabang & QR Meja',
  '/stock': 'Manajemen Stok',
  '/variants': 'Varian & Addon Produk',
  '/ingredients': 'Bahan Baku',
  '/recipes': 'Resep Produk & HPP',
  '/expenses': 'Pengeluaran Toko',
  '/audit': 'Audit Trail',
  '/media': 'Media & Galeri',
  '/users': 'Manajemen Pengguna',
  '/settings': 'Pengaturan Sistem',
  '/waiter': 'Waiter — Ambil Pesanan',
  '/stations': 'Manajemen Stasiun',
  '/units': 'Master Satuan',
  '/members': 'Manajemen Member',
  '/wifi-settings': 'Pengaturan WiFi Hotspot',
  '/reports': 'Laporan',
  '/shift': 'Manajemen Shift',
  '/templates': 'Template Tampilan',
};

export default function AppLayout() {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const [cafeName, setCafeName] = useState(() => sessionStorage.getItem('admin_cafe_name') || '');

  useEffect(() => {
    if (cafeName) return;
    fetch('/api/settings/cafe_name')
      .then(r => r.json())
      .then(d => {
        const n = d?.setting?.setting_value || d?.value || '';
        if (n) { setCafeName(n); sessionStorage.setItem('admin_cafe_name', n); }
      })
      .catch(() => {});
  }, []);

  // Update document.title on route change
  useEffect(() => {
    const pageName = PAGE_TITLES[location.pathname];
    const base = cafeName || 'Admin';
    document.title = pageName ? `${pageName} — ${base}` : base;
  }, [location.pathname, cafeName]);

  const title = PAGE_TITLES[location.pathname] || cafeName || 'Dashboard';

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />

      {/* Main content — offset by sidebar width */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen',
          'lg:ml-[var(--sidebar-width)]',
          collapsed && 'lg:ml-[var(--sidebar-width-collapsed)]'
        )}
      >
        <Topbar title={title} />
        <main className={cn(
          ['/pos', '/waiter'].includes(location.pathname)
            ? 'flex-1 overflow-hidden p-0'   // POS/Waiter: no scroll, no padding — manages own layout
            : 'flex-1 overflow-auto p-5'
        )}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
