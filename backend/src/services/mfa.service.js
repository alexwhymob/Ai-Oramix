import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

const MFA_CHALLENGE_EXPIRES_IN = '5m';
const MFA_ISSUER = env.MFA_ISSUER || 'Oramix Assessment Platform';

export function createMfaSetup(user) {
  if (user.role !== 'admin') {
    throw createMfaError('Only administrators can configure MFA', 'mfa_admin_only', 403);
  }

  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, MFA_ISSUER, secret);

  return {
    secret,
    otpauth_url: otpauthUrl
  };
}

export async function confirmMfaSetup(userId, { secret, code } = {}) {
  const user = await findAdmin(userId);
  if (!secret || !isValidMfaCode(code, secret)) {
    throw createMfaError('Invalid MFA code', 'invalid_mfa_code', 400);
  }

  const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'));
  user.mfa_enabled = true;
  user.mfa_secret_encrypted = encryptMfaSecret(secret);
  user.mfa_recovery_codes_hash = await Promise.all(recoveryCodes.map((value) => bcrypt.hash(value, 12)));
  user.mfa_verified_at = new Date();
  user.auth_token_version = (user.auth_token_version || 0) + 1;
  await user.save();

  return { enabled: true, recovery_codes: recoveryCodes };
}

export async function disableMfa(userId) {
  const user = await findAdmin(userId);
  user.mfa_enabled = false;
  user.mfa_secret_encrypted = null;
  user.mfa_recovery_codes_hash = [];
  user.mfa_verified_at = null;
  user.auth_token_version = (user.auth_token_version || 0) + 1;
  await user.save();
  return { enabled: false };
}

export function createMfaChallenge(user) {
  if (!env.JWT_SECRET) {
    throw createMfaError('JWT_SECRET is required', 'missing_jwt_secret', 500);
  }

  return jwt.sign({ sub: user.id, type: 'mfa_challenge' }, env.JWT_SECRET, {
    expiresIn: MFA_CHALLENGE_EXPIRES_IN
  });
}

export async function verifyMfaChallenge(challengeToken, code) {
  let payload;
  try {
    payload = jwt.verify(challengeToken, env.JWT_SECRET);
  } catch {
    throw createMfaError('MFA challenge expired or invalid', 'invalid_mfa_challenge', 401);
  }

  if (payload.type !== 'mfa_challenge') {
    throw createMfaError('Invalid MFA challenge', 'invalid_mfa_challenge', 401);
  }

  const user = await User.findOne({ id: payload.sub });
  if (!user || user.active === false || !user.mfa_enabled || !user.mfa_secret_encrypted) {
    throw createMfaError('MFA is not available for this account', 'mfa_unavailable', 401);
  }

  let recoveryCodeIndex = -1;
  const normalizedCode = String(code || '').trim().toLowerCase();
  if (isValidMfaCode(normalizedCode, decryptMfaSecret(user.mfa_secret_encrypted))) {
    // TOTP verified.
  } else {
    recoveryCodeIndex = await findRecoveryCode(user.mfa_recovery_codes_hash, normalizedCode);
    if (recoveryCodeIndex < 0) {
      const error = createMfaError('Invalid MFA code', 'invalid_mfa_code', 401);
      error.securityEvent = true;
      error.securityMetadata = { userId: user.id };
      throw error;
    }
  }

  if (recoveryCodeIndex >= 0) {
    user.mfa_recovery_codes_hash.splice(recoveryCodeIndex, 1);
    await user.save();
  }

  return { user, usedRecoveryCode: recoveryCodeIndex >= 0 };
}

function isValidMfaCode(code, secret) {
  if (!secret || !/^\d{6}$/.test(String(code || ''))) return false;
  return authenticator.verify({ token: String(code), secret });
}

async function findRecoveryCode(hashes = [], code) {
  for (let index = 0; index < hashes.length; index += 1) {
    if (await bcrypt.compare(code, hashes[index])) {
      return index;
    }
  }
  return -1;
}

async function findAdmin(userId) {
  const user = await User.findOne({ id: userId });
  if (!user || user.role !== 'admin') {
    throw createMfaError('Administrator not found', 'mfa_admin_only', 403);
  }
  return user;
}

function encryptMfaSecret(value) {
  const key = getMfaEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptMfaSecret(value) {
  try {
    const [, version, ivValue, tagValue, encryptedValue] = String(value).split(':');
    if (version !== 'v1') return '';
    const decipher = createDecipheriv('aes-256-gcm', getMfaEncryptionKey(), Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch {
    throw createMfaError('Unable to decrypt MFA configuration', 'mfa_decryption_failed', 500);
  }
}

function getMfaEncryptionKey() {
  const secret = env.LLM_CONFIG_ENCRYPTION_KEY || env.JWT_SECRET;
  if (!secret) throw createMfaError('MFA encryption key is required', 'missing_mfa_encryption_key', 500);
  return createHash('sha256').update(secret).digest();
}

function createMfaError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}
