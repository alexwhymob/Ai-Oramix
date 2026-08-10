import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const maturityLevelSchema = new mongoose.Schema({
  ...baseFields,
  preset_id: { type: String, required: true, index: true },
  level: { type: Number, required: true, min: 1, max: 5 },
  min_score: { type: Number, required: true },
  max_score: { type: Number, required: true },
  label_pt: { type: String, required: true },
  label_en: { type: String, default: null },
  color: { type: String, default: '#3b82f6' },
  emoji: { type: String, default: null },
  recommendation_pt: { type: String, default: null },
  recommendation_en: { type: String, default: null },
  order: { type: Number, default: 0 }
}, schemaOptions);

maturityLevelSchema.index({ preset_id: 1, order: 1 });
maturityLevelSchema.index({ preset_id: 1, level: 1 }, { unique: true });

touchUpdatedDate(maturityLevelSchema);

export const MaturityLevel = mongoose.model('MaturityLevel', maturityLevelSchema);
