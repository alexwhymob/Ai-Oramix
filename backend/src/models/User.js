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
  active: { type: Boolean, default: true },
  auth_token_version: { type: Number, default: 0 },
  refresh_token_hash: { type: String, default: null },
  refresh_token_expires_at: { type: Date, default: null },
  login_failed_attempts: { type: Number, default: 0 },
  login_locked_until: { type: Date, default: null },
  login_lock_level: { type: Number, default: 0 },
  password_hash: { type: String, default: null },
  reset_password_token_hash: { type: String, default: null },
  reset_password_expires_at: { type: Date, default: null },
  mfa_enabled: { type: Boolean, default: false },
  mfa_secret_encrypted: { type: String, default: null },
  mfa_recovery_codes_hash: { type: [String], default: [] },
  mfa_verified_at: { type: Date, default: null }
}, schemaOptions);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ active: 1 });
userSchema.index({ reset_password_token_hash: 1 });
userSchema.index({ mfa_enabled: 1 });

touchUpdatedDate(userSchema);

export const User = mongoose.model('User', userSchema);
