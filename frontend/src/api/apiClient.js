const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}, canRefresh = true) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include',
    ...options
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 && canRefresh && shouldTryRefresh(path)) {
      try {
        await refreshSession();
        return apiRequest(path, options, false);
      } catch {
        // Fall through to the normal authentication failure redirect.
      }
    }

    handleAuthFailure(response.status, path);
    throw new ApiError(data?.message || response.statusText, {
      status: response.status,
      data
    });
  }

  return data;
}

function handleAuthFailure(status, path) {
  if (![401, 403].includes(status)) {
    return;
  }

    if (isAuthRoute(path) || isPublicScreen()) {
    return;
  }

  const fromUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.href = `/login?from=${encodeURIComponent(fromUrl)}`;
}

function shouldTryRefresh(path) {
  return !isAuthRoute(path) && !isPublicScreen();
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(async (response) => {
      if (!response.ok) {
        throw new ApiError('Session refresh failed', { status: response.status });
      }
      return parseResponse(response);
    }).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function isAuthRoute(path) {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/logout',
    '/auth/refresh',
    '/auth/me'
  ].some((authPath) => path.startsWith(authPath));
}

function isPublicScreen() {
  return ['/login', '/forgot-password', '/reset-password', '/register', '/quiz/', '/sub-quiz/', '/complete/', '/sub-complete/'].some((route) =>
    window.location.pathname.startsWith(route)
  );
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveApiBaseUrl(rawBaseUrl) {
  if (!rawBaseUrl) {
    return '/api';
  }

  const trimmedBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  if (!trimmedBaseUrl) {
    return '/api';
  }

  if (trimmedBaseUrl === '/api' || trimmedBaseUrl.endsWith('/api')) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/api`;
}
