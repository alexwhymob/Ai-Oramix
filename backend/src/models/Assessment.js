import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const assessmentSchema = new mongoose.Schema({
  ...baseFields,
  customer_id: { type: String, required: true, index: true },
  assessment_template_id: { type: String, default: null, index: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  started_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  completion_email_sent_at: { type: Date, default: null },
  start_email_sent_at: { type: Date, default: null },
  reminder_sent_at: { type: Date, default: null },
  reminder_sending_at: { type: Date, default: null },
  report_sent_at: { type: Date, default: null },
  presentation_alert_sent_at: { type: Date, default: null },
  presentation_alert_sending_at: { type: Date, default: null },
  global_score: { type: Number, default: null },
  maturity_level: { type: String, default: null },
  pillar_scores: { type: String, default: null },
  language: { type: String, enum: ['pt', 'en'], default: 'pt' },
  assessment_type: {
    type: String,
    enum: ['main', 'sub_assessment'],
    default: 'main'
  },
  parent_assessment_id: { type: String, default: null },
  sub_assessment_for_pillar: { type: String, default: null },
  reviewed_by_consultant: { type: Boolean, default: false },
  public_access_token_hash: { type: String, default: null, select: false },
  public_access_expires_at: { type: Date, default: null },
  public_access_revoked_at: { type: Date, default: null },
  result_exchange_token_hash: { type: String, default: null, select: false },
  result_exchange_expires_at: { type: Date, default: null },
  result_exchange_used_at: { type: Date, default: null },
  result_session_token_hash: { type: String, default: null, select: false },
  result_session_expires_at: { type: Date, default: null },
  result_session_revoked_at: { type: Date, default: null }
}, schemaOptions);

assessmentSchema.index({ status: 1 });
assessmentSchema.index({ parent_assessment_id: 1 });
assessmentSchema.index({ public_access_token_hash: 1 });
assessmentSchema.index({ result_exchange_token_hash: 1 });

touchUpdatedDate(assessmentSchema);

export const Assessment = mongoose.model('Assessment', assessmentSchema);
