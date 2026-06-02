import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const reportSchema = new mongoose.Schema({
  ...baseFields,
  assessment_id: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['draft', 'generating', 'review', 'final'],
    default: 'draft'
  },
  section_1: { type: String, default: null },
  section_2: { type: String, default: null },
  section_3: { type: String, default: null },
  section_4: { type: String, default: null },
  section_5: { type: String, default: null },
  section_6: { type: String, default: null },
  section_7: { type: String, default: null },
  section_8: { type: String, default: null },
  section_9: { type: String, default: null },
  generated_at: { type: Date, default: null },
  finalized_at: { type: Date, default: null },
  language: { type: String, enum: ['pt', 'en'], default: 'pt' }
}, schemaOptions);

reportSchema.index({ status: 1 });

touchUpdatedDate(reportSchema);

export const Report = mongoose.model('Report', reportSchema);
