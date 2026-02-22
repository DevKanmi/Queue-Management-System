import axios from 'axios';

const raw = (import.meta.env.VITE_API_URL || '').trim();
const baseURL = raw ? raw.replace(/\/api\/v1\/?$/, '') + '/api/v1' : '/api/v1';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refresh });
          if (data?.data?.access_token) {
            localStorage.setItem('access_token', data.data.access_token);
            original.headers.Authorization = `Bearer ${data.data.access_token}`;
            return api(original);
          }
        } catch (_e) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);
