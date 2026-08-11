import { createHash } from 'node:crypto';

const MAX_FAILURES_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 30 * 1000;
const MAX_LOCK_MS = 15 * 60 * 1000;
const ATTEMPT_TTL_MS = 30 * 60 * 1000;
const attempts = new Map();

export const LOGIN_PROTECTION_POLICY = {
  maxFailuresBeforeLock: MAX_FAILURES_BEFORE_LOCK,
  baseLockSeconds: BASE_LOCK_MS / 1000,
  maxLockSeconds: MAX_LOCK_MS / 1000,
  attemptWindowSeconds: ATTEMPT_TTL_MS / 1000
};

export function assertLoginAllowed(email, user = null) {
  const key = normalizeKey(email);
  const state = getState(key, user);
  const now = Date.now();

  if (!state) return;
  if (state.expiresAt <= now) {
    attempts.delete(key);
    return;
  }

  if (state.lockedUntil > now) {
    const error = new Error('Too many failed login attempts. Please try again later.');
    error.status = 429;
    error.code = 'auth_temporarily_locked';
    error.securityEvent = true;
    error.securityMetadata = buildMetadata(email, state, now);
    throw error;
  }
}

export function recordLoginFailure(email, user = null) {
  const key = normalizeKey(email);
  const now = Date.now();
  const previous = getState(key, user);
  const state = previous && previous.expiresAt > now
    ? previous
    : { failures: 0, lockedUntil: 0 };

  state.failures += 1;
  state.expiresAt = now + ATTEMPT_TTL_MS;

  if (state.failures >= MAX_FAILURES_BEFORE_LOCK) {
    const multiplier = 2 ** (state.failures - MAX_FAILURES_BEFORE_LOCK);
    state.lockedUntil = now + Math.min(BASE_LOCK_MS * multiplier, MAX_LOCK_MS);
  }

  if (user) {
    user.login_failed_attempts = state.failures;
    user.login_locked_until = state.lockedUntil ? new Date(state.lockedUntil) : null;
    user.login_lock_level = Math.max(0, state.failures - MAX_FAILURES_BEFORE_LOCK + 1);
  } else {
    attempts.set(key, state);
  }
  return {
    suspected: state.failures >= MAX_FAILURES_BEFORE_LOCK,
    metadata: buildMetadata(email, state, now)
  };
}

export async function clearLoginFailures(email, user = null) {
  attempts.delete(normalizeKey(email));
  if (user) {
    user.login_failed_attempts = 0;
    user.login_locked_until = null;
    user.login_lock_level = 0;
    await user.save();
  }
}

export function getLoginProtectionStatus(user) {
  const now = Date.now();
  const lockedUntil = user?.login_locked_until ? new Date(user.login_locked_until).getTime() : 0;
  return {
    locked: lockedUntil > now,
    failed_attempts: user?.login_failed_attempts || 0,
    locked_until: lockedUntil > now ? new Date(lockedUntil).toISOString() : null,
    lock_level: user?.login_lock_level || 0
  };
}

function getState(key, user) {
  if (user) {
    return {
      failures: user.login_failed_attempts || 0,
      lockedUntil: user.login_locked_until ? new Date(user.login_locked_until).getTime() : 0,
      expiresAt: Date.now() + ATTEMPT_TTL_MS
    };
  }
  return attempts.get(key);
}

function buildMetadata(email, state, now) {
  return {
    email_fingerprint: createHash('sha256').update(normalizeKey(email)).digest('hex'),
    failures: state.failures,
    locked: state.lockedUntil > now,
    retry_after_seconds: state.lockedUntil > now ? Math.ceil((state.lockedUntil - now) / 1000) : 0
  };
}

function normalizeKey(email) {
  return String(email || '').trim().toLowerCase();
}
