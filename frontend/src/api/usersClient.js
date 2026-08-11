import { apiRequest } from './apiClient';

export function createUsersClient() {
  return {
    inviteUser: (email, role, full_name = '') => apiRequest('/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, full_name })
    }),
    updateUser: (userId, payload) => apiRequest(`/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    resendInvite: (userId, payload) => apiRequest(`/users/${encodeURIComponent(userId)}/resend-invite`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    unlockLogin: (userId, justification) => apiRequest(`/users/${encodeURIComponent(userId)}/unlock-login`, {
      method: 'POST',
      body: JSON.stringify({ justification })
    }),
    getAiProviderConfig: () => apiRequest('/users/ai-provider-config'),
    updateAiProviderConfig: (payload) => apiRequest('/users/ai-provider-config', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
    listAiProviderModels: (provider) => apiRequest(`/users/ai-provider-models?provider=${encodeURIComponent(provider)}`)
  };
}
