import axios from 'axios';

// The Cloudflare Worker base URL. Set VITE_API_BASE at build time, or edit this default.
const API_BASE = import.meta.env.VITE_API_BASE || 'https://nexus-proxy.example.workers.dev';

let _token = localStorage.getItem('nexus_token') || '';

export function setToken(t) {
  _token = t || '';
  if (t) localStorage.setItem('nexus_token', t);
  else localStorage.removeItem('nexus_token');
}
export function getToken() { return _token; }

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((cfg) => {
  if (_token) cfg.headers.Authorization = `Bearer ${_token}`;
  return cfg;
});

/**
 * Unwrap the Section 0.2 envelope. On success returns { data, meta }.
 * On failure throws an Error carrying .code and optional .fields.
 */
function unwrap(resp) {
  const env = resp.data;
  if (!env || typeof env.success !== 'boolean') {
    throw Object.assign(new Error('Malformed response'), { code: 'INTERNAL' });
  }
  if (!env.success) {
    const err = new Error(env.error?.message || 'Request failed');
    err.code = env.error?.code || 'INTERNAL';
    err.fields = env.error?.fields || null;
    throw err;
  }
  return { data: env.data, meta: env.meta };
}

export const api = {
  async getPublicConfig() {
    return unwrap(await client.get('/api/config'));
  },
  async login(idToken) {
    return unwrap(await client.post('/api/auth/login', { idToken }));
  },
  async me() {
    return unwrap(await client.get('/api/me'));
  },
  async formFields(module) {
    return unwrap(await client.get('/api/meta/form-fields', { params: { module } }));
  },
  async list(module, params = {}) {
    return unwrap(await client.get(`/api/${module}`, { params }));
  },
  async get(module, id) {
    return unwrap(await client.get(`/api/${module}/${id}`));
  },
  async create(module, body, idempotencyKey) {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    return unwrap(await client.post(`/api/${module}`, body, { headers }));
  },
  async update(module, id, body) {
    return unwrap(await client.put(`/api/${module}/${id}`, body));
  },
  async remove(module, id) {
    return unwrap(await client.delete(`/api/${module}/${id}`));
  }
};
