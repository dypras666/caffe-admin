import { Menu, Bell, LogOut, User, Printer } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import DevicePrinterSettings from '../DevicePrinterSettings';
import { getDevicePrinter } from '../../lib/printer';

export default function Topbar({ title }) {
  const { collapsed, toggle, setMobileOpen } = useSidebar();
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
      {/* Mobile menu toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden p-2 rounded-lg hover:bg-secondary text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop collapse toggle */}
      <button
        onClick={toggle}
        className="hidden lg:flex p-2 rounded-lg hover:bg-secondary text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className={cn('text-base font-semibold font-cafe text-foreground flex-1', 'truncate')}>
        {title}
      </h1>

      <div className="flex items-center gap-2">
        {/* Device printer quick-access */}
        <DevicePrinterSettings trigger={
          <button className={cn(
            'p-2 rounded-lg hover:bg-secondary transition-colors relative',
            getDevicePrinter('receipt') ? 'text-primary' : 'text-muted-foreground'
          )} title="Pengaturan Printer Perangkat Ini">
            <Printer className="w-4 h-4" />
            {getDevicePrinter('receipt') && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </button>
        } />

        <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <User className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="hidden sm:block font-medium text-foreground">{user?.name || 'Admin'}</span>
          <span className="hidden sm:block text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full uppercase">
            {user?.role}
          </span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
