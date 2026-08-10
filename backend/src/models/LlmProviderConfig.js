import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const llmProviderConfigSchema = new mongoose.Schema({
  ...baseFields,
  key: { type: String, required: true, default: 'default' },
  provider: {
    type: String,
    enum: ['openai', 'anthropic'],
    default: 'openai'
  },
  model: { type: String, required: true, default: 'gpt-5.4-mini' },
  openai_api_key: { type: String, default: null },
  anthropic_api_key: { type: String, default: null },
  updated_by_id: { type: String, default: null }
}, schemaOptions);

llmProviderConfigSchema.index({ key: 1 }, { unique: true });
llmProviderConfigSchema.index({ provider: 1 });

touchUpdatedDate(llmProviderConfigSchema);

export const LlmProviderConfig = mongoose.model('LlmProviderConfig', llmProviderConfigSchema);
