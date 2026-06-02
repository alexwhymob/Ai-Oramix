export function createIntegrationsClient() {
  return {
    Core: {
      InvokeLLM: async () => {
        throw new Error('LLM integrations are not migrated yet.');
      }
    }
  };
}
