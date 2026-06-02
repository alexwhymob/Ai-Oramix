import { apiRequest } from './apiClient';

export function createIntegrationsClient() {
  return {
    Core: {
      InvokeLLM: async (payload = {}) => {
        const data = await apiRequest('/integrations/llm', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        return data?.text || '';
      }
    }
  };
}
