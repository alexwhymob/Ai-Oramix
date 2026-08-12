import {
  loginUser,
  logoutUser,
  registerUser,
  refreshUserSession,
  requestPasswordReset,
  resetPasswordWithToken,
  createAuthResponse
} from '../services/auth.service.js';
import { confirmMfaSetup, createMfaSetup, disableMfa, verifyMfaChallenge } from '../services/mfa.service.js';
import { clearAuthCookies, parseCookies, setAuthCookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../services/authCookies.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    if (result.mfa_required) {
      await writeAuditLog({
        req,
        action: 'auth.mfa_required',
        entity: 'User',
        metadata: { email: req.body?.email }
      });
      res.status(202).json({ mfa_required: true, challenge_token: result.challenge_token });
      return;
    }
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

export async function verifyMfa(req, res, next) {
  try {
    const result = await verifyMfaChallenge(req.body?.challenge_token, req.body?.code);
    const session = await createAuthResponse(result.user);
    await writeAuditLog({
      req,
      user: result.user,
      action: result.usedRecoveryCode ? 'auth.mfa_recovery_code_used' : 'auth.mfa_verified',
      entity: 'User',
      entity_id: result.user.id
    });
    sendSessionResponse(res, session);
  } catch (error) {
    await writeAuditLog({
      req,
      action: error.securityEvent ? 'security.mfa_failed' : 'auth.mfa_failed',
      entity: 'User',
      metadata: error.securityMetadata || {}
    });
    next(error);
  }
}

export async function setupMfa(req, res, next) {
  try {
    res.json(createMfaSetup(req.user));
  } catch (error) {
    next(error);
  }
}

export async function confirmMfa(req, res, next) {
  try {
    const result = await confirmMfaSetup(req.user.id, req.body || {});
    await writeAuditLog({ req, user: req.user, action: 'security.mfa_enabled', entity: 'User', entity_id: req.user.id });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function turnOffMfa(req, res, next) {
  try {
    const result = await disableMfa(req.user.id);
    await writeAuditLog({ req, user: req.user, action: 'security.mfa_disabled', entity: 'User', entity_id: req.user.id });
    res.json(result);
  } catch (error) {
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
