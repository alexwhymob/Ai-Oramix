export function createAuthClient() {
  const notMigrated = () => {
    throw new Error('Auth is not migrated yet. JWT auth will be added in a later phase.');
  };

  return {
    me: notMigrated,
    loginViaEmailPassword: notMigrated,
    loginWithProvider: notMigrated,
    logout: () => {
      window.location.href = '/';
    },
    redirectToLogin: (fromUrl = '/') => {
      window.location.href = `/login?from=${encodeURIComponent(fromUrl)}`;
    },
    register: notMigrated,
    verifyOtp: notMigrated,
    setToken: notMigrated,
    resendOtp: notMigrated,
    resetPasswordRequest: notMigrated,
    resetPassword: notMigrated
  };
}
