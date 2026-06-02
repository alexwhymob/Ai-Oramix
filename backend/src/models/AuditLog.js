import mongoose from 'mongoose';
import { baseFields, schemaOptions } from './baseFields.js';

const auditLogSchema = new mongoose.Schema({
  ...baseFields,
  user_id: { type: String, default: null, index: true },
  user_email: { type: String, default: null, index: true },
  user_role: { type: String, default: null },
  action: { type: String, required: true, index: true },
  entity: { type: String, default: null, index: true },
  entity_id: { type: String, default: null, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: null },
  user_agent: { type: String, default: null }
}, schemaOptions);

auditLogSchema.index({ created_date: -1 });
auditLogSchema.index({ user_id: 1, created_date: -1 });
auditLogSchema.index({ entity: 1, entity_id: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
