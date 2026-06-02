import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const assessmentSchema = new mongoose.Schema({
  ...baseFields,
  customer_id: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  started_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
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
  reviewed_by_consultant: { type: Boolean, default: false }
}, schemaOptions);

assessmentSchema.index({ customer_id: 1 });
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ parent_assessment_id: 1 });

touchUpdatedDate(assessmentSchema);

export const Assessment = mongoose.model('Assessment', assessmentSchema);
