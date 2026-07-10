import { useFetch } from './useApi';
import { useAuth } from '../context/AuthContext';

/**
 * Returns { shiftRequired, currentShift, loading }
 * shiftRequired = true if user is kasir/waiter AND no open shift exists.
 * Admin is never blocked.
 */
export function useShiftGuard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data, loading } = useFetch(isAdmin ? null : '/shifts/current');

  const currentShift = data?.shift || null;
  const shiftRequired = !isAdmin && !loading && !currentShift;

  return { shiftRequired, currentShift, loading };
}
