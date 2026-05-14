import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  // Lazily import to avoid circular deps
  const raw = localStorage.getItem('echo-auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Response interceptor: unwrap { success, data } and handle 401
api.interceptors.response.use(
  (response) => {
    // Unwrap API envelope if present
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state
      localStorage.removeItem('echo-auth');
      // Redirect to login
      window.location.href = '/auth/phone';
    }
    return Promise.reject(error);
  },
);

export default api;
export { api as apiClient };
