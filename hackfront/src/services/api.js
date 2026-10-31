/**
 * api.js — REST API client for Neo4j Backend Integration
 */

const BASE_URL = import.meta.env.VITE_API_BASE || '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    credentials: 'include', // Include HttpOnly cookies for session
    headers,
    ...options
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const error = new Error(data?.error?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data?.error?.code || 'REQUEST_FAILED';
      error.details = data?.error?.details || null;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    const networkError = new Error('Could not connect to the Loss Finder server. Please ensure the backend is running.');
    networkError.code = 'NETWORK_ERROR';
    throw networkError;
  }
}

export const api = {
  baseUrl: BASE_URL,
  request,

  health: () => request('/api/health'),

  auth: {
    register: (email, password) => request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    login: (email, password) => request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    logout: () => request('/api/auth/logout', {
      method: 'POST'
    }),
    me: () => request('/api/auth/me'),
    deleteData: () => request('/api/auth/me/data', {
      method: 'DELETE'
    })
  },

  imports: {
    create: (data) => request('/api/imports', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    list: () => request('/api/imports'),
    get: (id) => request(`/api/imports/${id}`),
    delete: (id) => request(`/api/imports/${id}`, {
      method: 'DELETE'
    })
  },

  subscriptions: {
    list: () => request('/api/subscriptions'),
    get: (id) => request(`/api/subscriptions/${encodeURIComponent(id)}`),
    update: (id, data) => request(`/api/subscriptions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    reanalyze: () => request('/api/subscriptions/reanalyze', {
      method: 'POST'
    })
  },

  usage: {
    list: (merchantKey) => {
      const qs = merchantKey ? `?merchantKey=${encodeURIComponent(merchantKey)}` : '';
      return request(`/api/usage${qs}`);
    },
    create: (data) => request('/api/usage', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (id) => request(`/api/usage/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
  },

  analytics: {
    summary: () => request('/api/analytics/summary'),
    monthly: () => request('/api/analytics/monthly'),
    categories: () => request('/api/analytics/categories'),
    savings: () => request('/api/analytics/savings'),
    upcoming: () => request('/api/analytics/upcoming')
  }
};
