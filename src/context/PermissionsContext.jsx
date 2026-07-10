import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../lib/api';

const PermissionsContext = createContext({ permissions: {}, can: () => true, reload: () => {} });

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({});

  const load = useCallback(async () => {
    if (!user) { setPermissions({}); return; }
    if (user.role === 'admin') {
      // Admin has all permissions — no need to fetch
      setPermissions('__admin__');
      return;
    }
    try {
      const res = await api.get('/roles/my-permissions');
      setPermissions(res.data.permissions || {});
    } catch {
      setPermissions({});
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // can('update', 'products') → true/false
  const can = useCallback((action, resource) => {
    if (permissions === '__admin__') return true;
    const res = permissions[resource];
    if (!res) return false;
    return Array.isArray(res) ? res.includes(action) : res[action] === true;
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={{ permissions, can, reload: load }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
