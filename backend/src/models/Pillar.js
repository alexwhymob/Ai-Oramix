import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const pillarSchema = new mongoose.Schema({
  ...baseFields,
  code: { type: String, required: true, trim: true },
  name_pt: { type: String, required: true },
  name_en: { type: String, default: null },
  weight: { type: Number, required: true },
  order: { type: Number, default: null },
  icon: { type: String, default: null },
  description_pt: { type: String, default: null },
  description_en: { type: String, default: null },
  assessment_type: {
    type: String,
    enum: ['main', 'sub_assessment'],
    default: 'main'
  },
  assessment_template_id: { type: String, default: null, index: true },
  min_score: { type: Number, default: null },
  sub_assessment_template_id: { type: String, default: null, index: true }
}, schemaOptions);

pillarSchema.index({ code: 1 });
pillarSchema.index({ order: 1 });
pillarSchema.index({ assessment_type: 1 });
pillarSchema.index({ assessment_template_id: 1, order: 1 });
pillarSchema.index({ sub_assessment_template_id: 1 });
pillarSchema.index(
  { code: 1, assessment_type: 1, assessment_template_id: 1 },
  { unique: true }
);

touchUpdatedDate(pillarSchema);

export const Pillar = mongoose.model('Pillar', pillarSchema);
