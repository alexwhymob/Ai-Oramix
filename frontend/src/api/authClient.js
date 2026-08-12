import { apiRequest } from './apiClient';

export function createAuthClient() {
  return {
    me: () => apiRequest('/auth/me'),
    loginViaEmailPassword: async (email, password) => {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      return result;
    },
    verifyMfa: (challenge_token, code) => apiRequest('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challenge_token, code })
    }),
    setupMfa: () => apiRequest('/auth/mfa/setup'),
    confirmMfa: (secret, code) => apiRequest('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ secret, code })
    }),
    disableMfa: () => apiRequest('/auth/mfa/disable', { method: 'POST' }),
    loginWithProvider: notMigrated,
    logout: async (redirectTo = '/') => {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } finally {
        if (redirectTo) {
          window.location.href = redirectTo;
        }
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
      return result;
    },
    verifyOtp: notMigrated,
    setToken: () => undefined,
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

function notMigrated() {
  throw new Error('This authentication flow is not migrated yet.');
}
