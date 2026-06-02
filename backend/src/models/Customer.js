import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const customerSchema = new mongoose.Schema({
  ...baseFields,
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  company: { type: String, required: true, trim: true },
  role: { type: String, default: null },
  sector: { type: String, default: null },
  company_size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', null],
    default: null
  },
  qr_token: { type: String, default: null },
  registered_by: { type: String, enum: ['self', 'admin'], default: 'self' },
  language: { type: String, enum: ['pt', 'en'], default: 'pt' },
  phone: { type: String, default: null },
  notes: { type: String, default: null },
  account_manager_id: { type: String, default: null },
  data_consent: { type: Boolean, default: false },
  data_consent_at: { type: String, default: null }
}, schemaOptions);

customerSchema.index({ email: 1 });
customerSchema.index({ qr_token: 1 });
customerSchema.index({ account_manager_id: 1 });

touchUpdatedDate(customerSchema);

export const Customer = mongoose.model('Customer', customerSchema);
