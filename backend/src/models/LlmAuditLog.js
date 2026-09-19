import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const llmAuditLogSchema = new mongoose.Schema({
  ...baseFields,
  provider: { type: String, required: true },
  model: { type: String, required: true },
  operation: { type: String, required: true },
  status: { type: String, enum: ['success', 'error'], required: true },
  duration_ms: { type: Number, required: true },
  input_tokens: { type: Number, default: null },
  output_tokens: { type: Number, default: null },
  total_tokens: { type: Number, default: null },
  estimated_cost_usd: { type: Number, default: null },
  error_code: { type: String, default: null }
}, schemaOptions);

llmAuditLogSchema.index({ created_date: -1 });
llmAuditLogSchema.index({ model: 1, created_date: -1 });
touchUpdatedDate(llmAuditLogSchema);
export const LlmAuditLog = mongoose.model('LlmAuditLog', llmAuditLogSchema);
