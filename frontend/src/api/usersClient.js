import { apiRequest } from './apiClient';

export function createUsersClient() {
  return {
    inviteUser: (email, role, full_name = '') => apiRequest('/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role, full_name })
    })
  };
}
