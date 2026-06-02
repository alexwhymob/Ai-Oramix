import { generateText } from './llm/llmClient.js';

export const invokeLlmIntegration = createInvokeLlmIntegration();

export function createInvokeLlmIntegration(deps = {}) {
  const llm = deps.llm || { generateText };

  return async function runInvokeLlmIntegration(payload = {}, options = {}) {
    const actor = options.actor || null;
    assertIntegrationPermissions(actor);

    const prompt = payload.prompt?.trim();
    if (!prompt) {
      const error = new Error('prompt is required');
      error.code = 'missing_prompt';
      error.status = 400;
      throw error;
    }

    const text = await llm.generateText({
      prompt,
      systemPrompt: payload.systemPrompt || null,
      model: payload.model || undefined,
      temperature: payload.temperature
    });

    return { text };
  };
}

function assertIntegrationPermissions(actor) {
  if (!actor) {
    const error = new Error('Authentication required');
    error.code = 'auth_required';
    error.status = 401;
    throw error;
  }

  if (!['admin', 'ai_consultant'].includes(actor.role)) {
    const error = new Error('Forbidden');
    error.code = 'forbidden';
    error.status = 403;
    throw error;
  }
}
