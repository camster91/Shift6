/**
 * Shift6 Sync Client — Bridges the local-first Shift6DataContext to a remote
 * backend (Fastify + Postgres). Last-write-wins conflict resolution using
 * a monotonic revision counter.
 *
 * Cross-repo: this client expects a sibling repo `armor-sync-api` to be
 * running and reachable at DEFAULT_API_BASE. The API repo is NOT a part of
 * this project — see the `armor-sync-api` package on the same GitHub
 * account for the server side. Until the sync API is deployed, the
 * Shift6Account UI in `src/pages/Shift6Account.jsx` will fail to register
 * or log in. The rest of the app is fully functional without it.
 *
 * Storage keys for auth state — separate from `armor_data` to keep the
 * auth metadata out of the synced payload.
 */

const AUTH_KEY = 'shift6_auth';
const API_BASE_KEY = 'shift6_api_base';

// Default API base — production endpoint on Cam's VPS via Coolify
// Local dev: run `npm run dev` in armor-sync-api and override via localStorage
//   localStorage.setItem('shift6_api_base', 'http://localhost:4001')
const DEFAULT_API_BASE = 'https://sync.getshift6.com';

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── API base URL (env-overridable) ───────────────────────────
export function getApiBase() {
  // Only allow localStorage override in development to prevent redirection in production
  if (import.meta.env.DEV) {
    return loadJSON(API_BASE_KEY, DEFAULT_API_BASE);
  }
  return DEFAULT_API_BASE;
}
export function setApiBase(url) {
  saveJSON(API_BASE_KEY, url);
}

// ── Auth state ───────────────────────────────────────────────
export function getAuth() {
  return loadJSON(AUTH_KEY, { token: null, user: null });
}
export function setAuth(auth) {
  saveJSON(AUTH_KEY, auth);
}
export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

// ── Network layer ────────────────────────────────────────────
async function apiRequest(path, options = {}) {
  const { token } = getAuth();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${getApiBase()}${path}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) { clearAuth(); throw new Error('Session expired'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const e = new Error(err.error || 'Request failed');
    e.status = res.status;
    e.payload = err;
    throw e;
  }
  return res.json();
}

export async function register(email, password, displayName) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setAuth({ token: data.token, user: data.user });
  return data.user;
}

export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuth({ token: data.token, user: data.user });
  return data.user;
}

export async function logout() {
  clearAuth();
}

// ── Sync protocol ────────────────────────────────────────────
export async function fetchCloud() {
  return apiRequest('/data', { method: 'GET' });
}

/**
 * Push local state to cloud. Returns one of:
 *   { ok: true, revision }  — write succeeded
 *   { conflict: true, serverData, serverRevision }  — server has newer data
 */
export async function pushCloud(data, revision) {
  try {
    const res = await apiRequest('/data', {
      method: 'PUT',
      body: JSON.stringify({ data, revision }),
    });
    return { ok: true, revision: res.revision };
  } catch (err) {
    if (err.status === 409 && err.payload) {
      return {
        conflict: true,
        serverData: err.payload.serverData,
        serverRevision: err.payload.serverRevision,
      };
    }
    throw err;
  }
}

// ── Connection state (for UI) ────────────────────────────────
export function isLoggedIn() {
  return !!getAuth().token;
}
