import { apiRequest } from './apiClient';

export function createFunctionsClient() {
  return {
    invoke: async (functionName, payload = {}) => {
      const data = await apiRequest(`/functions/${functionName}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return { data };
    }
  };
}
