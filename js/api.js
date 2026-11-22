/* Cliente del backend. Nunca lanza errores hacia la UI: todo degradada a local. */
(function (global) {
  'use strict';

  const BASE = String((global.NUTRIPLAN_CONFIG && global.NUTRIPLAN_CONFIG.apiUrl) || '').replace(/\/$/, '');

  async function request(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(BASE + path, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (error) { throw new Error('Respuesta no JSON'); }
      if (!response.ok) {
        const error = new Error(data.error || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  global.Api = {
    get enabled() { return true; },
    health: () => request('/api/health', { method: 'GET' }),
    getState: (code) => request(`/api/state/${encodeURIComponent(code)}`, { method: 'GET' }),
    saveState: (code, state) => request(`/api/state/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify({ state }) }),
    askCoach: (message, context) => request('/api/coach', { method: 'POST', body: JSON.stringify({ message, context }) })
  };
})(window);
