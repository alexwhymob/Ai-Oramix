import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const pushSubscriptionSchema = new mongoose.Schema({
  ...baseFields,
  user_id: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, trim: true },
  p256dh: { type: String, required: true },
  auth: { type: String, required: true },
  user_agent: { type: String, default: null },
  active: { type: Boolean, default: true, index: true },
  last_error_at: { type: Date, default: null }
}, schemaOptions);

pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ user_id: 1, active: 1 });

touchUpdatedDate(pushSubscriptionSchema);

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
