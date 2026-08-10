import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const reportTemplateSchema = new mongoose.Schema({
  ...baseFields,
  code: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  system_prompt: { type: String, required: true },
  style_guide: { type: String, default: null },
  is_default: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, schemaOptions);

reportTemplateSchema.index({ is_active: 1, is_default: -1, order: 1 });

touchUpdatedDate(reportTemplateSchema);

export const ReportTemplate = mongoose.model('ReportTemplate', reportTemplateSchema);
