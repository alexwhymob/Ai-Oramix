import { env } from '../../config/env.js';
import {
  generateStructuredObjectWithOpenAI,
  generateTextWithOpenAI
} from './openai.provider.js';

export async function generateStructuredObject(options) {
  const provider = createProviderClient();
  return provider.generateStructuredObject(options);
}

export async function generateText(options) {
  const provider = createProviderClient();
  return provider.generateText(options);
}

export function createProviderClient(runtimeEnv = env) {
  switch (runtimeEnv.LLM_PROVIDER) {
    case 'openai':
      return createOpenAiClient(runtimeEnv);
    case 'google':
    case 'anthropic': {
      const error = new Error(`LLM provider ${runtimeEnv.LLM_PROVIDER} is not implemented yet`);
      error.code = 'llm_provider_not_supported';
      error.status = 501;
      throw error;
    }
    default: {
      const error = new Error(`Unknown LLM provider: ${runtimeEnv.LLM_PROVIDER}`);
      error.code = 'unknown_llm_provider';
      error.status = 500;
      throw error;
    }
  }
}

function createOpenAiClient(runtimeEnv) {
  if (!runtimeEnv.OPENAI_API_KEY) {
    const error = new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    error.code = 'missing_openai_api_key';
    error.status = 500;
    throw error;
  }

  return {
    generateStructuredObject: (options) => generateStructuredObjectWithOpenAI({
      apiKey: runtimeEnv.OPENAI_API_KEY,
      model: options.model || runtimeEnv.LLM_MODEL,
      ...options
    }),
    generateText: (options) => generateTextWithOpenAI({
      apiKey: runtimeEnv.OPENAI_API_KEY,
      model: options.model || runtimeEnv.LLM_MODEL,
      ...options
    })
  };
}
