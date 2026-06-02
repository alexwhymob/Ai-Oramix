import {
  getUserFromToken,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken
} from '../services/auth.service.js';
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
    res.json(result);
  } catch (error) {
    await writeAuditLog({
      req,
      action: 'auth.login_failed',
      entity: 'User',
      metadata: { email: req.body?.email }
    });
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
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const user = await getUserFromToken(token);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function logout(_req, res) {
  res.json({ success: true });
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
