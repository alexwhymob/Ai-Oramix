import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { sendEmail } from './email/emailClient.js';
import { assertLoginAllowed, clearLoginFailures, getLoginProtectionStatus, recordLoginFailure } from './loginProtection.service.js';
import { createMfaChallenge } from './mfa.service.js';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const AUTH_USER_FIELDS = 'id email full_name role active created_date updated_date created_by_id auth_token_version mfa_enabled';
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
      role: user.role,
      token_version: user.auth_token_version || 0
    },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  requireJwtSecret();

  return jwt.sign(
    {
      sub: user.id,
      token_version: user.auth_token_version || 0,
      type: 'refresh'
    },
    env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

export function verifyAuthToken(token) {
  requireJwtSecret();
  return jwt.verify(token, env.JWT_SECRET);
}

export async function registerUser({ email, password, full_name, role = 'account_manager' } = {}, options = {}) {
  validateEmail(email);
  validatePassword(password);
  const effectiveRole = resolveRegistrationRole(role, options);
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
    role: effectiveRole,
    password_hash
  });

  return createAuthResponse(user);
}

export function resolveRegistrationRole(role = 'account_manager', options = {}) {
  return options.allowRoleOverride ? role : 'account_manager';
}

export async function loginUser({ email, password } = {}) {
  validateEmail(email);
  assertLoginAllowed(email);
  if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    throw createAuthInputError('Invalid email or password');
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  assertLoginAllowed(email, user);
  const isValid = await verifyPassword(password, user?.password_hash);

  if (!user || !isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.code = 'invalid_credentials';
    const attempt = recordLoginFailure(email, user);
    if (user) await user.save();
    error.securityEvent = attempt.suspected;
    error.securityMetadata = attempt.metadata;
    throw error;
  }

  assertUserIsActive(user);
  await clearLoginFailures(email, user);
  if (user.role === 'admin' && user.mfa_enabled) {
    return {
      mfa_required: true,
      challenge_token: createMfaChallenge(user)
    };
  }
  return createAuthResponse(user);
}

export async function unlockUserLogin(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.code = 'user_not_found';
    throw error;
  }

  user.login_failed_attempts = 0;
  user.login_locked_until = null;
  user.login_lock_level = 0;
  await user.save();
  clearLoginFailures(user.email);
  return sanitizeUser(user);
}

export { getLoginProtectionStatus };

export async function getUserFromToken(token) {
  const payload = verifyAuthToken(token);
  const user = await User.findOne({ id: payload.sub }).select(AUTH_USER_FIELDS);

  if (!user) {
    const error = new Error('User not found');
    error.status = 401;
    error.code = 'user_not_found';
    throw error;
  }

  if ((payload.token_version || 0) !== (user.auth_token_version || 0)) {
    const error = new Error('Authentication token is no longer valid');
    error.status = 401;
    error.code = 'token_revoked';
    throw error;
  }

  assertUserIsActive(user);
  return sanitizeUser(user);
}

export async function invalidateUserSessions(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) return;

  user.auth_token_version = (user.auth_token_version || 0) + 1;
  user.refresh_token_hash = null;
  user.refresh_token_expires_at = null;
  await user.save();
}

export async function refreshUserSession(refreshToken) {
  if (!refreshToken) {
    throw createSessionError('Refresh token is required', 'refresh_token_required', 401);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_SECRET);
  } catch {
    throw createSessionError('Invalid refresh token', 'invalid_refresh_token', 401);
  }

  if (payload.type !== 'refresh') {
    throw createSessionError('Invalid refresh token', 'invalid_refresh_token', 401);
  }

  const user = await User.findOne({ id: payload.sub });
  if (!user || user.active === false) {
    throw createSessionError('Invalid refresh token', 'invalid_refresh_token', 401);
  }

  const tokenMatches = Boolean(user.refresh_token_hash) && hashResetToken(refreshToken) === user.refresh_token_hash;
  const versionMatches = (payload.token_version || 0) === (user.auth_token_version || 0);
  const refreshIsValid = user.refresh_token_expires_at && user.refresh_token_expires_at > new Date();

  if (!tokenMatches || !versionMatches || !refreshIsValid) {
    if (!tokenMatches && user.refresh_token_hash) {
      await invalidateUserSessions(user.id);
      const error = createSessionError('Refresh token reuse detected', 'refresh_token_reuse', 401);
      error.securityEvent = true;
      error.securityMetadata = { userId: user.id };
      throw error;
    }

    throw createSessionError('Invalid refresh token', 'invalid_refresh_token', 401);
  }

  return createAuthResponse(user);
}

export async function logoutUser({ accessToken, refreshToken } = {}) {
  let userId = null;

  if (accessToken) {
    try {
      userId = verifyAuthToken(accessToken).sub;
    } catch {
      // The access token may already be expired; use the refresh token below.
    }
  }

  if (!userId && refreshToken) {
    try {
      userId = jwt.verify(refreshToken, env.JWT_SECRET).sub;
    } catch {
      // Clearing the cookies remains safe even when both tokens are invalid.
    }
  }

  if (userId) {
    await invalidateUserSessions(userId);
  }
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

  return async function runPasswordResetRequest({ email } = {}) {
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

    validatePassword(newPassword);

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
    user.auth_token_version = (user.auth_token_version || 0) + 1;
    user.refresh_token_hash = null;
    user.refresh_token_expires_at = null;
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

  return async function runInviteUser({ email, role = 'account_manager', full_name = '' } = {}) {
    validateEmail(email);
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedFullName = typeof full_name === 'string' ? full_name.trim() : '';

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
        full_name: normalizedFullName || normalizedEmail,
        role,
        active: true,
        password_hash: null
      });
    } else {
      user.role = role;
      if (normalizedFullName) {
        user.full_name = normalizedFullName;
      }
    }

    const resetToken = generateResetToken();
    user.reset_password_token_hash = hashResetToken(resetToken);
    user.reset_password_expires_at = new Date(now().getTime() + PASSWORD_RESET_EXPIRES_IN_MS);
    user.auth_token_version = (user.auth_token_version || 0) + 1;
    user.refresh_token_hash = null;
    user.refresh_token_expires_at = null;
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

export async function updateInternalUser(userId, payload = {}, options = {}) {
  const actor = options.actor || null;
  const normalizedPayload = normalizeInternalUserPayload(payload);
  const user = await User.findOne({ id: userId });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    error.code = 'user_not_found';
    throw error;
  }

  if (actor?.id === user.id && normalizedPayload.active === false) {
    const error = new Error('You cannot deactivate your own account');
    error.status = 400;
    error.code = 'cannot_deactivate_self';
    throw error;
  }

  if (normalizedPayload.email && normalizedPayload.email !== user.email) {
    const existingUser = await User.findOne({ email: normalizedPayload.email });
    if (existingUser && existingUser.id !== user.id) {
      const error = new Error('Email is already in use');
      error.status = 409;
      error.code = 'user_exists';
      throw error;
    }
  }

  Object.assign(user, normalizedPayload);
  if (normalizedPayload.email || normalizedPayload.role || normalizedPayload.active !== undefined) {
    user.auth_token_version = (user.auth_token_version || 0) + 1;
  }
  await user.save();

  return sanitizeUser(user);
}

function normalizeInternalUserPayload(payload = {}) {
  const nextPayload = {};

  if (typeof payload.full_name === 'string' && payload.full_name.trim()) {
    nextPayload.full_name = payload.full_name.trim();
  }

  if (typeof payload.email === 'string' && payload.email.trim()) {
    nextPayload.email = payload.email.toLowerCase().trim();
  }

  if (typeof payload.role === 'string') {
    if (!['admin', 'ai_consultant', 'account_manager'].includes(payload.role)) {
      const error = new Error('Invalid role');
      error.status = 400;
      error.code = 'invalid_role';
      throw error;
    }
    nextPayload.role = payload.role;
  }

  if (typeof payload.active === 'boolean') {
    nextPayload.active = payload.active;
  }

  return nextPayload;
}

function assertUserIsActive(user) {
  if (user?.active !== false) {
    return;
  }

  const error = new Error('User account is inactive');
  error.status = 403;
  error.code = 'user_inactive';
  throw error;
}

export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function generateResetToken() {
  return randomBytes(32).toString('hex');
}

export async function createAuthResponse(user) {
  const refreshToken = signRefreshToken(user);
  user.refresh_token_hash = hashResetToken(refreshToken);
  user.refresh_token_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await user.save();

  const token = signAuthToken(user);
  const jsonUser = sanitizeUser(user);

  return {
    access_token: token,
    refresh_token: refreshToken,
    user: jsonUser
  };
}

function createSessionError(message, code, status) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sanitizeUser(user) {
  const jsonUser = user.toJSON ? user.toJSON() : { ...user };
  delete jsonUser.password_hash;
  delete jsonUser.reset_password_token_hash;
  delete jsonUser.reset_password_expires_at;
  delete jsonUser.refresh_token_hash;
  delete jsonUser.refresh_token_expires_at;
  delete jsonUser.auth_token_version;
  delete jsonUser.login_failed_attempts;
  delete jsonUser.login_locked_until;
  delete jsonUser.login_lock_level;
  delete jsonUser.mfa_secret_encrypted;
  delete jsonUser.mfa_recovery_codes_hash;
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

function validateEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    const error = new Error('A valid email is required');
    error.status = 400;
    error.code = 'invalid_email';
    throw error;
  }
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    const error = new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters long`);
    error.status = 400;
    error.code = 'invalid_password';
    throw error;
  }
}

function createAuthInputError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'invalid_auth_input';
  return error;
}
