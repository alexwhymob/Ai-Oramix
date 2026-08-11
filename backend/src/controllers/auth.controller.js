import {
  loginUser,
  logoutUser,
  registerUser,
  refreshUserSession,
  requestPasswordReset,
  resetPasswordWithToken
} from '../services/auth.service.js';
import { clearAuthCookies, parseCookies, setAuthCookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../services/authCookies.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    await writeAuditLog({
      req,
      user: result.user,
      action: 'auth.login',
      entity: 'User',
      entity_id: result.user.id
    });
    sendSessionResponse(res, result);
  } catch (error) {
    await writeAuditLog({
      req,
      action: 'auth.login_failed',
      entity: 'User',
      metadata: error.securityMetadata || { reason: error.code }
    });
    if (error.securityEvent) {
      await writeAuditLog({
        req,
        action: 'security.bruteforce_suspected',
        entity: 'User',
        metadata: error.securityMetadata || {}
      });
    }
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);
    await writeAuditLog({
      req,
      user: result.user,
      action: 'auth.register',
      entity: 'User',
      entity_id: result.user.id
    });
    sendSessionResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const result = await refreshUserSession(cookies[REFRESH_COOKIE_NAME]);
    sendSessionResponse(res, result);
  } catch (error) {
    clearAuthCookies(res);
    if (error.securityEvent) {
      await writeAuditLog({
        req,
        action: 'security.refresh_token_reuse',
        entity: 'User',
        entity_id: error.securityMetadata?.userId || null,
        metadata: error.securityMetadata || {}
      });
    }
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const cookies = parseCookies(req);
    await logoutUser({
      accessToken: cookies[ACCESS_COOKIE_NAME],
      refreshToken: cookies[REFRESH_COOKIE_NAME]
    });
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await requestPasswordReset(req.body || {});
    await writeAuditLog({
      req,
      action: 'auth.password_reset_requested',
      entity: 'User',
      metadata: { email: req.body?.email }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await resetPasswordWithToken(req.body || {});
    await writeAuditLog({
      req,
      action: 'auth.password_reset_completed',
      entity: 'User'
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function sendSessionResponse(res, result, status = 200) {
  setAuthCookies(res, {
    accessToken: result.access_token,
    refreshToken: result.refresh_token
  });
  res.status(status).json({ user: result.user });
}
