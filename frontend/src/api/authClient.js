import { apiRequest } from './apiClient';

const TOKEN_KEY = 'oramix_access_token';

export function createAuthClient() {
  return {
    me: () => apiRequest('/auth/me'),
    loginViaEmailPassword: async (email, password) => {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      setToken(result.access_token);
      return result;
    },
    loginWithProvider: notMigrated,
    logout: (redirectTo = '/') => {
      clearToken();
      if (redirectTo) {
        window.location.href = redirectTo;
      }
    },
    redirectToLogin: (fromUrl = '/') => {
      window.location.href = `/login?from=${encodeURIComponent(fromUrl)}`;
    },
    register: async ({ email, password, full_name, role }) => {
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name, role })
      });
      setToken(result.access_token);
      return result;
    },
    verifyOtp: notMigrated,
    setToken,
    resendOtp: notMigrated,
    resetPasswordRequest: (email) => apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    resetPassword: ({ resetToken, newPassword }) => apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword })
    })
  };
}

function setToken(token) {
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function notMigrated() {
  throw new Error('This authentication flow is not migrated yet.');
}
