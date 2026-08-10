import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const notificationTemplateSchema = new mongoose.Schema({
  ...baseFields,
  key: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  trigger_type: {
    type: String,
    enum: ['immediate', 'scheduled_24h', 'manual', 'scheduled_96h', 'report_ready'],
    default: 'immediate'
  },
  target: {
    type: String,
    enum: ['customer', 'account_manager'],
    default: 'customer'
  },
  subject_pt: { type: String, required: true },
  subject_en: { type: String, default: null },
  body_pt: { type: String, required: true },
  body_en: { type: String, default: null },
  from_email: { type: String, default: 'Oramix <readiness@oramix.pt>' },
  is_active: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, schemaOptions);

notificationTemplateSchema.index({ is_active: 1, order: 1 });

touchUpdatedDate(notificationTemplateSchema);

export const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);
