import { describe, expect, it, vi } from 'vitest';
import { createProviderClient } from '../src/services/llm/llmClient.js';
import { generateStructuredObjectWithOpenAI } from '../src/services/llm/openai.provider.js';

describe('llm client', () => {
  it('requires ANTHROPIC_API_KEY for the anthropic provider', () => {
    expect(() => createProviderClient({
      LLM_PROVIDER: 'anthropic'
    })).toThrow(/ANTHROPIC_API_KEY is required/);
  });

  it('requires OPENAI_API_KEY for the openai provider', () => {
    expect(() => createProviderClient({
      LLM_PROVIDER: 'openai',
      LLM_MODEL: 'gpt-5.4'
    })).toThrow(/OPENAI_API_KEY is required/);
  });

  it('parses structured JSON responses from OpenAI', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: '{"section_1":"## Summary"}'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await generateStructuredObjectWithOpenAI({
      apiKey: 'test-key',
      model: 'gpt-5.4',
      schemaName: 'report_sections',
      schema: {
        type: 'object',
        properties: { section_1: { type: 'string' } },
        required: ['section_1'],
        additionalProperties: false
      },
      systemPrompt: 'You are a consultant',
      userPrompt: 'Generate section_1'
    });

    expect(result).toEqual({ section_1: '## Summary' });
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
