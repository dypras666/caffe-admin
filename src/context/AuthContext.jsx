import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { exp: payload.exp * 1000, user: payload };
  } catch { return null; }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cafe_admin_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem('cafe_admin_token');
    if (!token) { setUser(null); return; }
    const decoded = decodeToken(token);
    if (!decoded || decoded.exp < Date.now()) {
      localStorage.removeItem('cafe_admin_token');
      localStorage.removeItem('cafe_admin_user');
      setUser(null);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('cafe_admin_token', data.token);
      localStorage.setItem('cafe_admin_user', JSON.stringify(data.user));
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Login gagal' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('cafe_admin_token');
    localStorage.removeItem('cafe_admin_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
