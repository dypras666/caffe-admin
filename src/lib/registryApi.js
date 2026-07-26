import axios from 'axios';

// Separate axios instance that hits cafe-registry directly.
// In dev: proxied via /registry → http://localhost:3000
// In prod: set VITE_REGISTRY_URL env var
// In dev: Vite proxies /registry → http://localhost:3000
// In prod: VITE_REGISTRY_URL=https://registry.caffe.id, baseURL = VITE_REGISTRY_URL/api
const base = import.meta.env.VITE_REGISTRY_URL
  ? `${import.meta.env.VITE_REGISTRY_URL}/api`
  : '/registry/api';

const registryApi = axios.create({ baseURL: base });

registryApi.interceptors.request.use((config) => {
  // Registry auth uses the tenant owner token stored separately.
  // Fallback: try admin token (superadmin role also passes tenantAuth).
  const token = localStorage.getItem('cafe_registry_token') || localStorage.getItem('cafe_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default registryApi;
