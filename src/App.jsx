import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/ui/toast';
import { SidebarProvider } from './context/SidebarContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BookingsPage from './pages/BookingsPage';
import MediaPage from './pages/MediaPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import RoomsPage from './pages/RoomsPage';
import TablesPage from './pages/TablesPage';
import PaymentsPage from './pages/PaymentsPage';
import StockPage from './pages/StockPage';
import AuditPage from './pages/AuditPage';
import POSPage from './pages/POSPage';
import TableOrderPage from './pages/TableOrderPage';
import PrintersPage from './pages/PrintersPage';
import VariantsPage from './pages/VariantsPage';
import IngredientsPage from './pages/IngredientsPage';
import RecipesPage from './pages/RecipesPage';
import ExpensesPage from './pages/ExpensesPage';
import BranchesPage from './pages/BranchesPage';
import StationsPage from './pages/StationsPage';
import StationDisplayPage from './pages/StationDisplayPage';
import UnitsPage from './pages/UnitsPage';
import WaiterPage from './pages/WaiterPage';
import MembersPage from './pages/MembersPage';
import WiFiSettingsPage from './pages/WiFiSettingsPage';
import RouterOSMonitorPage from './pages/RouterOSMonitorPage';
import ReportsPage from './pages/ReportsPage';
import ShiftPage from './pages/ShiftPage';
import HRPage from './pages/HRPage';
import PostsPage from './pages/PostsPage';
import RolesPage from './pages/RolesPage';
import VouchersPage from './pages/VouchersPage';
import BackupPage from './pages/BackupPage';
import NavigationPage from './pages/NavigationPage';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for auth check
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for auth check
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function RequireRole({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for auth check
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return children;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><SidebarProvider><AppLayout /></SidebarProvider></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<RequireRole roles={['station']}><ProductsPage /></RequireRole>} />
        <Route path="categories" element={<RequireRole roles={['station']}><CategoriesPage /></RequireRole>} />
        <Route path="bookings" element={<RequireAdmin><BookingsPage /></RequireAdmin>} />
        <Route path="media" element={<RequireAdmin><MediaPage /></RequireAdmin>} />
        <Route path="rooms" element={<RequireAdmin><RoomsPage /></RequireAdmin>} />
        <Route path="tables" element={<RequireAdmin><TablesPage /></RequireAdmin>} />
        <Route path="payments" element={<RequireAdmin><PaymentsPage /></RequireAdmin>} />
        <Route path="stock" element={<RequireRole roles={['station']}><StockPage /></RequireRole>} />
        <Route path="audit" element={<RequireAdmin><AuditPage /></RequireAdmin>} />
        <Route path="pos" element={<POSPage />} />
        <Route path="table-order" element={<TableOrderPage />} />
        <Route path="printers" element={<RequireAdmin><PrintersPage /></RequireAdmin>} />
        <Route path="variants" element={<RequireRole roles={['station']}><VariantsPage /></RequireRole>} />
        <Route path="ingredients" element={<RequireRole roles={['station']}><IngredientsPage /></RequireRole>} />
        <Route path="recipes" element={<RequireRole roles={['station']}><RecipesPage /></RequireRole>} />
        <Route path="expenses" element={<RequireAdmin><ExpensesPage /></RequireAdmin>} />
        <Route path="branches" element={<RequireAdmin><BranchesPage /></RequireAdmin>} />
        <Route path="stations" element={<RequireAdmin><StationsPage /></RequireAdmin>} />
        <Route path="units" element={<RequireRole roles={['station']}><UnitsPage /></RequireRole>} />
        <Route path="waiter" element={<WaiterPage />} />
        <Route path="members" element={<RequireAdmin><MembersPage /></RequireAdmin>} />
        <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
        <Route path="settings" element={<RequireAdmin><SettingsPage /></RequireAdmin>} />
        <Route path="wifi-settings" element={<RequireAdmin><WiFiSettingsPage /></RequireAdmin>} />
        <Route path="routeros" element={<RequireAdmin><RouterOSMonitorPage /></RequireAdmin>} />
        <Route path="reports" element={<RequireAdmin><ReportsPage /></RequireAdmin>} />
        <Route path="shift" element={<ShiftPage />} />
        <Route path="hr" element={<RequireAdmin><HRPage defaultTab="employees" /></RequireAdmin>} />
        <Route path="hr/kpi" element={<RequireAdmin><HRPage defaultTab="kpi" /></RequireAdmin>} />
        <Route path="posts" element={<RequireAdmin><PostsPage /></RequireAdmin>} />
        <Route path="roles" element={<RequireAdmin><RolesPage /></RequireAdmin>} />
        <Route path="vouchers" element={<RequireAdmin><VouchersPage /></RequireAdmin>} />
        <Route path="backup" element={<RequireAdmin><BackupPage /></RequireAdmin>} />
        <Route path="navigation" element={<RequireAdmin><NavigationPage /></RequireAdmin>} />
      </Route>
      <Route path="/display/:stationCode" element={<RequireAuth><StationDisplayPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PermissionsProvider>
          <SocketProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SocketProvider>
        </PermissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
