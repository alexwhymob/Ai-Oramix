import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { sendEmail } from './email/emailClient.js';

const TOKEN_EXPIRES_IN = '8h';
const PUBLIC_USER_FIELDS = 'id email full_name role created_date updated_date created_by_id';
const PASSWORD_RESET_EXPIRES_IN_MS = 60 * 60 * 1000;

export function requireJwtSecret() {
  if (!env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is required');
    error.status = 500;
    error.code = 'missing_jwt_secret';
    throw error;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(user) {
  requireJwtSecret();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );
}

export function verifyAuthToken(token) {
  requireJwtSecret();
  return jwt.verify(token, env.JWT_SECRET);
}

export async function registerUser({ email, password, full_name, role = 'account_manager' }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const error = new Error('User already exists');
    error.status = 409;
    error.code = 'user_exists';
    throw error;
  }

  const password_hash = await hashPassword(password);
  const user = await User.create({
    email,
    full_name: full_name || email,
    role,
    password_hash
  });

  return createAuthResponse(user);
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const isValid = await verifyPassword(password, user?.password_hash);

  if (!user || !isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.code = 'invalid_credentials';
    throw error;
  }

  return createAuthResponse(user);
}

export async function getUserFromToken(token) {
  const payload = verifyAuthToken(token);
  const user = await User.findOne({ id: payload.sub }).select(PUBLIC_USER_FIELDS);

  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    error.code = 'user_not_found';
    throw error;
  }

  return user.toJSON();
}

export const requestPasswordReset = createPasswordResetRequestService();
export const resetPasswordWithToken = createResetPasswordService();
export const inviteUser = createInviteUserService();

export function createPasswordResetRequestService(deps = {}) {
  const models = {
    User: deps.User || User
  };
  const emailClient = deps.email || { sendEmail };
  const now = deps.now || (() => new Date());

  return async function runPasswordResetRequest({ email }) {
    if (!email || !email.trim()) {
      return { success: true };
    }

    const user = await models.User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return { success: true };
    }

    const resetToken = generateResetToken();
    const resetTokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(now().getTime() + PASSWORD_RESET_EXPIRES_IN_MS);

    user.reset_password_token_hash = resetTokenHash;
    user.reset_password_expires_at = expiresAt;
    await user.save();

    const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await emailClient.sendEmail({
      to: user.email,
      subject: 'Reset your Oramix password',
      text: [
        `Hello ${user.full_name || user.email},`,
        '',
        'We received a request to reset your Oramix password.',
        '',
        `Reset your password here: ${resetUrl}`,
        '',
        'This link expires in 1 hour.',
        'If you did not request this, you can ignore this email.'
      ].join('\n')
    });

    return { success: true };
  };
}

export function createResetPasswordService(deps = {}) {
  const models = {
    User: deps.User || User
  };
  const now = deps.now || (() => new Date());
  const hashPasswordFn = deps.hashPassword || hashPassword;

  return async function runResetPassword({ resetToken, newPassword }) {
    if (!resetToken || !resetToken.trim()) {
      const error = new Error('Reset token is required');
      error.status = 400;
      error.code = 'missing_reset_token';
      throw error;
    }

    if (!newPassword || newPassword.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.status = 400;
      error.code = 'invalid_password';
      throw error;
    }

    const resetTokenHash = hashResetToken(resetToken);
    const user = await models.User.findOne({
      reset_password_token_hash: resetTokenHash,
      reset_password_expires_at: { $gt: now() }
    });

    if (!user) {
      const error = new Error('Invalid or expired reset token');
      error.status = 400;
      error.code = 'invalid_reset_token';
      throw error;
    }

    user.password_hash = await hashPasswordFn(newPassword);
    user.reset_password_token_hash = null;
    user.reset_password_expires_at = null;
    await user.save();

    return { success: true };
  };
}

export function createInviteUserService(deps = {}) {
  const models = {
    User: deps.User || User
  };
  const emailClient = deps.email || { sendEmail };
  const now = deps.now || (() => new Date());

  return async function runInviteUser({ email, role = 'account_manager', full_name = '' }) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      const error = new Error('Email is required');
      error.status = 400;
      error.code = 'missing_email';
      throw error;
    }

    if (!['admin', 'ai_consultant', 'account_manager'].includes(role)) {
      const error = new Error('Invalid role');
      error.status = 400;
      error.code = 'invalid_role';
      throw error;
    }

    let user = await models.User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await models.User.create({
        email: normalizedEmail,
        full_name: full_name.trim() || normalizedEmail,
        role,
        password_hash: null
      });
    } else {
      user.role = role;
      if (full_name?.trim()) {
        user.full_name = full_name.trim();
      }
    }

    const resetToken = generateResetToken();
    user.reset_password_token_hash = hashResetToken(resetToken);
    user.reset_password_expires_at = new Date(now().getTime() + PASSWORD_RESET_EXPIRES_IN_MS);
    await user.save();

    const setupUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await emailClient.sendEmail({
      to: user.email,
      subject: 'You have been invited to Oramix',
      text: [
        `Hello ${user.full_name || user.email},`,
        '',
        'You have been invited to access Oramix.',
        '',
        `Your role: ${formatRoleLabel(user.role)}`,
        `Set your password here: ${setupUrl}`,
        '',
        'This link expires in 1 hour.'
      ].join('\n')
    });

    return {
      success: true,
      invited_user: sanitizeUser(user)
    };
  };
}

export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function generateResetToken() {
  return randomBytes(32).toString('hex');
}

function createAuthResponse(user) {
  const token = signAuthToken(user);
  const jsonUser = sanitizeUser(user);

  return {
    access_token: token,
    user: jsonUser
  };
}

function sanitizeUser(user) {
  const jsonUser = user.toJSON ? user.toJSON() : { ...user };
  delete jsonUser.password_hash;
  delete jsonUser.reset_password_token_hash;
  delete jsonUser.reset_password_expires_at;
  return jsonUser;
}

function formatRoleLabel(role) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'ai_consultant':
      return 'AI Consultant';
    case 'account_manager':
      return 'Account Manager';
    default:
      return role;
  }
}
