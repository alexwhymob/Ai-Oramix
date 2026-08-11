import { env } from '../config/env.js';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  next();
}

export function createRateLimiter({ windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS, max = DEFAULT_RATE_LIMIT_MAX } = {}) {
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
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

export function csrfOriginProtection(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (!origin || origin === env.FRONTEND_URL) {
    next();
    return;
  }

  const error = new Error('Cross-site request blocked');
  error.status = 403;
  error.code = 'csrf_origin_rejected';
  next(error);
}

function getClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
