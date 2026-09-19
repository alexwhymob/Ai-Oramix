import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const RESULT_ACCESS_COOKIE_NAME = 'oramix_result_access';
export const RESULT_ACCESS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const INPUT_ACCESS_DURATION_MS = 48 * 60 * 60 * 1000;

export function createSecret() {
  return randomBytes(32).toString('base64url');
}

// Unlike result credentials, input links must be included again in the 24-hour
// reminder.  A deterministic, signed token lets us recreate the same link from
// its assessment id and expiry without persisting a usable secret in MongoDB.
export function createInputAccessToken(assessmentId, expiresAt) {
  if (!env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is required to issue assessment links');
    error.status = 500;
    error.code = 'missing_jwt_secret';
    throw error;
  }

  return jwt.sign(
    {
      sub: assessmentId,
      type: 'assessment_input',
      exp: Math.floor(new Date(expiresAt).getTime() / 1000)
    },
    env.JWT_SECRET,
    { algorithm: 'HS256', noTimestamp: true }
  );
}

export function hashSecret(secret) {
  return createHash('sha256').update(String(secret)).digest('hex');
}

export function secretsMatch(secret, storedHash) {
  if (!secret || !storedHash) return false;
  const provided = Buffer.from(hashSecret(secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

export function isActiveAccess({ hash, expiresAt, revokedAt }, secret) {
  return Boolean(hash && !revokedAt && (!expiresAt || new Date(expiresAt) > new Date()) && secretsMatch(secret, hash));
}

export function parseResultAccess(request) {
  const header = request?.headers?.cookie || '';
  const value = header.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${RESULT_ACCESS_COOKIE_NAME}=`))?.slice(RESULT_ACCESS_COOKIE_NAME.length + 1);
  if (!value) return null;
  const separator = value.indexOf('.');
  if (separator < 1) return null;
  try {
    return {
      assessmentId: decodeURIComponent(value.slice(0, separator)),
      token: decodeURIComponent(value.slice(separator + 1))
    };
  } catch {
    return null;
  }
}

export function setResultAccessCookie(response, { assessmentId, sessionToken }) {
  response.setHeader('Set-Cookie', serializeCookie(`${assessmentId}.${sessionToken}`, RESULT_ACCESS_MAX_AGE_SECONDS));
}

export function clearResultAccessCookie(response) {
  response.setHeader('Set-Cookie', serializeCookie('', 0));
}

function serializeCookie(value, maxAge) {
  const attributes = [
    `${RESULT_ACCESS_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    ...(maxAge === 0 ? ['Expires=Thu, 01 Jan 1970 00:00:00 GMT'] : []),
    `SameSite=${env.AUTH_COOKIE_SAMESITE}`
  ];
  if (env.NODE_ENV === 'production' || env.AUTH_COOKIE_SECURE) attributes.push('Secure');
  if (env.AUTH_COOKIE_DOMAIN) attributes.push(`Domain=${env.AUTH_COOKIE_DOMAIN}`);
  return attributes.join('; ');
}
