import { env } from '../config/env.js';
import { createHash } from 'node:crypto';
import { incrementDistributedRateLimit } from '../services/rateLimitStore.service.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Content-Security-Policy', "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

export function createRateLimiter({ windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS, max = DEFAULT_RATE_LIMIT_MAX } = {}) {
  const buckets = new Map();
  let lastCleanupAt = 0;

  return async function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = buildRateLimitKey(req);
    let result;

    try {
      result = await incrementDistributedRateLimit(key, windowMs);
    } catch (error) {
      if (env.RATE_LIMIT_REQUIRE_REDIS) {
        res.status(503).json({
          error: 'rate_limit_unavailable',
          message: 'Rate limiting is temporarily unavailable. Please try again later.'
        });
        return;
      }
    }

    if (!result) {
      if (now - lastCleanupAt > windowMs) {
        cleanupExpiredBuckets(buckets, now);
        lastCleanupAt = now;
      }
      result = incrementInMemoryBucket(buckets, key, now, windowMs);
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(result.ttlMs / 1000));
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - result.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil((now + result.ttlMs) / 1000)));

    if (result.count > max) {
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'rate_limited',
        message: 'Too many requests. Please try again later.'
      });
      return;
    }

    next();
  };
}

function incrementInMemoryBucket(buckets, key, now, windowMs) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { count: 1, ttlMs: windowMs };
  }

  bucket.count += 1;
  return { count: bucket.count, ttlMs: bucket.resetAt - now };
}

function cleanupExpiredBuckets(buckets, now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function csrfOriginProtection(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  if (hasBearerToken(req)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  if (origin === env.FRONTEND_URL || (!origin && isTrustedReferer(referer))) {
    next();
    return;
  }

  // Anonymous endpoints (registration, password reset and the public quiz) do
  // not have a browser session to protect. Cookie-authenticated requests must
  // always provide a trusted browser origin or referer.
  if (!origin && !referer && !req.headers.cookie) {
    next();
    return;
  }

  const error = new Error('Cross-site request blocked');
  error.status = 403;
  error.code = 'csrf_origin_rejected';
  next(error);
}

function hasBearerToken(req) {
  return /^Bearer\s+\S+$/i.test(String(req.headers.authorization || ''));
}

function isTrustedReferer(referer) {
  if (!referer) return false;
  try {
    return new URL(referer).origin === env.FRONTEND_URL;
  } catch {
    return false;
  }
}

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function buildRateLimitKey(req) {
  const clientHash = createHash('sha256').update(getClientKey(req)).digest('base64url').slice(0, 24);
  const route = `${req.baseUrl || ''}${req.path || ''}`.replace(/[^a-zA-Z0-9/_-]/g, '_');
  return `oramix:rate-limit:${route}:${clientHash}`;
}
