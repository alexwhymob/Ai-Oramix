import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const reportSectionSchema = new mongoose.Schema({
  ...baseFields,
  report_template_id: { type: String, required: true, index: true },
  key: { type: String, required: true, trim: true },
  title: { type: String, required: true },
  prompt: { type: String, required: true },
  context_keys: { type: String, default: '["org","score","pillars","answers"]' },
  json_schema: { type: String, default: null },
  order: { type: Number, default: 0 }
}, schemaOptions);

reportSectionSchema.index({ report_template_id: 1, order: 1 });
reportSectionSchema.index({ report_template_id: 1, key: 1 }, { unique: true });

touchUpdatedDate(reportSectionSchema);

export const ReportSection = mongoose.model('ReportSection', reportSectionSchema);
