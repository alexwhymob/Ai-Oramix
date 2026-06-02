import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const consultantNoteSchema = new mongoose.Schema({
  ...baseFields,
  assessment_id: { type: String, required: true, index: true },
  pillar_code: { type: String, required: true, index: true },
  gap_description: { type: String, default: null },
  mitigation: { type: String, default: null },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  effort: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  impact: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, schemaOptions);

consultantNoteSchema.index({ assessment_id: 1, pillar_code: 1 });

touchUpdatedDate(consultantNoteSchema);

export const ConsultantNote = mongoose.model('ConsultantNote', consultantNoteSchema);
