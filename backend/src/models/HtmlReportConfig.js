import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const htmlReportConfigSchema = new mongoose.Schema({
  ...baseFields,
  name: { type: String, required: true, default: 'Default' },
  is_active: { type: Boolean, default: true },
  css: { type: String, default: null }
}, schemaOptions);

htmlReportConfigSchema.index({ is_active: 1, created_date: -1 });

touchUpdatedDate(htmlReportConfigSchema);

export const HtmlReportConfig = mongoose.model('HtmlReportConfig', htmlReportConfigSchema);
