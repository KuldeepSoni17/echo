import axios, { type InternalAxiosRequestConfig } from 'axios';
import { dispatchMock, DEMO_TOKEN } from '../mocks/mockApi';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

function isDemoMode(): boolean {
  try {
    const raw = localStorage.getItem('echo-auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { token?: string } };
    return parsed?.state?.token === DEMO_TOKEN;
  } catch {
    return false;
  }
}

// Request interceptor: attach JWT token + intercept demo requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem('echo-auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* ignore */ }
  }

  if (!isDemoMode()) return config;

  // In demo mode: intercept the request before it hits the network
  const url = (config.url ?? '').replace(config.baseURL ?? '', '');
  const method = config.method ?? 'GET';

  let body: unknown = config.data;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* keep as string */ }
  }

  // Parse query string into object
  const query: Record<string, string> = {};
  if (config.params) {
    for (const [k, v] of Object.entries(config.params)) {
      query[k] = String(v);
    }
  }

  const { data, status } = await dispatchMock(method, url, body, query);

  // Abort the real network request and return mock data via adapter
  config.adapter = async () => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config,
  });

  return config;
});

// Response interceptor: unwrap { success, data } envelope + handle 401
api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = (response.data as { data: unknown }).data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !isDemoMode()) {
      localStorage.removeItem('echo-auth');
      window.location.href = '/auth/phone';
    }
    return Promise.reject(error);
  },
);

export default api;
export { api as apiClient };
