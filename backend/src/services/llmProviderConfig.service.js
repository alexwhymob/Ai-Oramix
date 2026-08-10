import { env } from '../config/env.js';
import { LlmProviderConfig } from '../models/index.js';

export const SUPPORTED_LLM_MODELS = {
  openai: [
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' }
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }
  ]
};

const DEFAULT_CONFIG_KEY = 'default';

export async function resolveLlmRuntimeConfig() {
  const storedConfig = await LlmProviderConfig.findOne({ key: DEFAULT_CONFIG_KEY }).lean();
  const provider = normalizeProvider(storedConfig?.provider || env.LLM_PROVIDER || 'openai');
  const model = resolveModel(provider, storedConfig?.model || env.LLM_MODEL);
  const apiKey = resolveProviderApiKey(provider, storedConfig);

  return {
    LLM_PROVIDER: provider,
    LLM_MODEL: model,
    OPENAI_API_KEY: provider === 'openai' ? apiKey : env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: provider === 'anthropic' ? apiKey : env.ANTHROPIC_API_KEY
  };
}

export async function getLlmProviderAdminConfig() {
  const storedConfig = await LlmProviderConfig.findOne({ key: DEFAULT_CONFIG_KEY }).lean();
  const provider = normalizeProvider(storedConfig?.provider || env.LLM_PROVIDER || 'openai');
  const model = resolveModel(provider, storedConfig?.model || env.LLM_MODEL);

  return {
    provider,
    model,
    providers: listSupportedProviders().map((item) => ({
      ...item,
      has_api_key: hasProviderApiKey(item.value, storedConfig),
      api_key_masked: maskApiKey(resolveProviderApiKey(item.value, storedConfig))
    })),
    models: listSupportedModels(provider)
  };
}

export async function saveLlmProviderAdminConfig(payload = {}, actor = null) {
  const provider = normalizeProvider(payload.provider || env.LLM_PROVIDER || 'openai');
  const model = resolveModel(provider, payload.model || env.LLM_MODEL);
  const apiKeyField = getProviderApiKeyField(provider);
  const apiKey = payload.apiKey?.trim() || '';

  const update = {
    provider,
    model,
    updated_by_id: actor?.id || null
  };

  if (apiKey) {
    update[apiKeyField] = apiKey;
  }

  await LlmProviderConfig.updateOne(
    { key: DEFAULT_CONFIG_KEY },
    {
      $set: update,
      $setOnInsert: { key: DEFAULT_CONFIG_KEY }
    },
    { upsert: true, runValidators: true }
  );

  return getLlmProviderAdminConfig();
}

export function listSupportedProviders() {
  return [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' }
  ];
}

export function listSupportedModels(provider) {
  const normalizedProvider = normalizeProvider(provider || 'openai');
  return SUPPORTED_LLM_MODELS[normalizedProvider] || [];
}

function resolveProviderApiKey(provider, storedConfig) {
  switch (provider) {
    case 'openai':
      return storedConfig?.openai_api_key || env.OPENAI_API_KEY || '';
    case 'anthropic':
      return storedConfig?.anthropic_api_key || env.ANTHROPIC_API_KEY || '';
    default:
      return '';
  }
}

function hasProviderApiKey(provider, storedConfig) {
  return Boolean(resolveProviderApiKey(provider, storedConfig));
}

function getProviderApiKeyField(provider) {
  return provider === 'anthropic' ? 'anthropic_api_key' : 'openai_api_key';
}

function normalizeProvider(provider) {
  if (!['openai', 'anthropic'].includes(provider)) {
    const error = new Error('Unsupported AI provider');
    error.code = 'unsupported_ai_provider';
    error.status = 400;
    throw error;
  }

  return provider;
}

function resolveModel(provider, model) {
  const models = listSupportedModels(provider);
  const resolved = models.find((item) => item.id === model);
  if (resolved) {
    return resolved.id;
  }

  return models[0]?.id || model;
}

function maskApiKey(apiKey) {
  const value = String(apiKey || '').trim();
  if (!value) return null;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
