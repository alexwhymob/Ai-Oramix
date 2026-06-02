import { describe, expect, it, vi } from 'vitest';
import { createInvokeLlmIntegration } from '../src/services/llmIntegration.service.js';

describe('llm integration service', () => {
  it('requires authentication', async () => {
    const invokeLlmIntegration = createInvokeLlmIntegration({});

    await expect(invokeLlmIntegration(
      { prompt: 'Hello' },
      { actor: null }
    )).rejects.toMatchObject({
      code: 'auth_required',
      status: 401
    });
  });

  it('allows only admin and ai_consultant roles', async () => {
    const invokeLlmIntegration = createInvokeLlmIntegration({});

    await expect(invokeLlmIntegration(
      { prompt: 'Hello' },
      { actor: { role: 'account_manager' } }
    )).rejects.toMatchObject({
      code: 'forbidden',
      status: 403
    });
  });

  it('requires a prompt and returns generated text', async () => {
    const generateText = vi.fn().mockResolvedValue('Generated note');
    const invokeLlmIntegration = createInvokeLlmIntegration({
      llm: { generateText }
    });

    await expect(invokeLlmIntegration(
      { prompt: '   ' },
      { actor: { role: 'admin' } }
    )).rejects.toMatchObject({
      code: 'missing_prompt',
      status: 400
    });

    await expect(invokeLlmIntegration(
      { prompt: 'Write a note', model: 'gpt-5.4' },
      { actor: { role: 'ai_consultant' } }
    )).resolves.toEqual({
      text: 'Generated note'
    });
  });
});
