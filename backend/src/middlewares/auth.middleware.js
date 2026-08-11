import { getUserFromToken } from '../services/auth.service.js';
import { ACCESS_COOKIE_NAME, parseCookies } from '../services/authCookies.service.js';

export async function authMiddleware(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization) || parseCookies(req)[ACCESS_COOKIE_NAME];
    if (!token) {
      const error = new Error('Authentication required');
      error.status = 401;
      error.code = 'auth_required';
      throw error;
    }

    req.user = await getUserFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthMiddleware(req, _res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization) || parseCookies(req)[ACCESS_COOKIE_NAME];
    if (token) {
      req.user = await getUserFromToken(token);
    }
  } catch {
    req.user = null;
  }

  next();
}

export function requireRoles(roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('Forbidden');
      error.status = 403;
      error.code = 'forbidden';
      next(error);
      return;
    }

    next();
  };
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}
