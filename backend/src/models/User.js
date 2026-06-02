import mongoose from 'mongoose';
import { baseFields, schemaOptions, touchUpdatedDate } from './baseFields.js';

const userSchema = new mongoose.Schema({
  ...baseFields,
  email: { type: String, required: true, trim: true, lowercase: true },
  full_name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ['admin', 'ai_consultant', 'account_manager'],
    required: true
  },
  password_hash: { type: String, default: null },
  reset_password_token_hash: { type: String, default: null },
  reset_password_expires_at: { type: Date, default: null }
}, schemaOptions);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ reset_password_token_hash: 1 });

touchUpdatedDate(userSchema);

export const User = mongoose.model('User', userSchema);
