import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const maturityPresetSchema = new mongoose.Schema({
  ...baseFields,
  code: { type: String, default: null, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  is_default: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, schemaOptions);

maturityPresetSchema.index({ code: 1 }, { unique: true, sparse: true });
maturityPresetSchema.index({ is_active: 1, is_default: -1, order: 1 });

touchUpdatedDate(maturityPresetSchema);

export const MaturityPreset = mongoose.model('MaturityPreset', maturityPresetSchema);
