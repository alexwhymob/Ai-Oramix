const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest(path, options = {}) {
  const token = window.localStorage.getItem('oramix_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(data?.message || response.statusText, {
      status: response.status,
      data
    });
  }

  return data;
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
