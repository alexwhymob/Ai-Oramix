import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const assessmentTemplateSchema = new mongoose.Schema({
  ...baseFields,
  code: { type: String, required: true, trim: true, unique: true },
  name_pt: { type: String, required: true, trim: true },
  name_en: { type: String, default: null, trim: true },
  tagline_pt: { type: String, default: null },
  tagline_en: { type: String, default: null },
  description_pt: { type: String, default: null },
  description_en: { type: String, default: null },
  pitch_pt: { type: String, default: null },
  pitch_en: { type: String, default: null },
  report_security_pt: { type: String, default: null },
  report_security_en: { type: String, default: null },
  pillar_count: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, schemaOptions);

assessmentTemplateSchema.index({ active: 1, order: 1 });

touchUpdatedDate(assessmentTemplateSchema);

export const AssessmentTemplate = mongoose.model('AssessmentTemplate', assessmentTemplateSchema);
