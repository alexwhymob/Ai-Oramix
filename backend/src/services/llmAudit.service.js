import { LlmAuditLog } from '../models/index.js';
import { env } from '../config/env.js';

export async function recordLlmAudit(entry) {
  if (env.NODE_ENV === 'test') return;
  try {
    await LlmAuditLog.create(entry);
  } catch (error) {
    console.error('LLM audit logging failed:', error.message);
  }
}
