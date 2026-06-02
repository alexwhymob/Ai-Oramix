import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const questionSchema = new mongoose.Schema({
  ...baseFields,
  pillar_code: { type: String, required: true, index: true },
  code: { type: String, required: true, trim: true },
  text_pt: { type: String, required: true },
  text_en: { type: String, default: null },
  anchor_1_pt: { type: String, default: null },
  anchor_2_pt: { type: String, default: null },
  anchor_3_pt: { type: String, default: null },
  anchor_4_pt: { type: String, default: null },
  anchor_5_pt: { type: String, default: null },
  anchor_1_en: { type: String, default: null },
  anchor_2_en: { type: String, default: null },
  anchor_3_en: { type: String, default: null },
  anchor_4_en: { type: String, default: null },
  anchor_5_en: { type: String, default: null },
  order: { type: Number, default: null },
  subsection_pt: { type: String, default: null },
  subsection_en: { type: String, default: null }
}, schemaOptions);

questionSchema.index({ code: 1 });
questionSchema.index({ pillar_code: 1, order: 1 });
questionSchema.index({ code: 1, pillar_code: 1 }, { unique: true });

touchUpdatedDate(questionSchema);

export const Question = mongoose.model('Question', questionSchema);
