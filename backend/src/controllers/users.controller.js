import { inviteUser, unlockUserLogin, updateInternalUser } from '../services/auth.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import {
  getLlmProviderAdminConfig,
  listSupportedModels,
  saveLlmProviderAdminConfig
} from '../services/llmProviderConfig.service.js';

export async function invite(req, res, next) {
  try {
    const result = await inviteUser(req.body || {});
    await writeAuditLog({
      req,
      user: req.user,
      action: 'user.invited',
      entity: 'User',
      entity_id: result.invited_user.id,
      metadata: {
        email: result.invited_user.email,
        role: result.invited_user.role
      }
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await updateInternalUser(req.params.userId, req.body || {}, { actor: req.user });
    await writeAuditLog({
      req,
      user: req.user,
      action: 'user.updated',
      entity: 'User',
      entity_id: result.id,
      metadata: {
        email: result.email,
        role: result.role,
        active: result.active
      }
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resendInvite(req, res, next) {
  try {
    const targetUser = req.body || {};
    const result = await inviteUser(targetUser);
    await writeAuditLog({
      req,
      user: req.user,
      action: 'user.invite_resent',
      entity: 'User',
      entity_id: result.invited_user.id,
      metadata: {
        email: result.invited_user.email,
        role: result.invited_user.role
      }
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function unlockLogin(req, res, next) {
  try {
    const justification = String(req.body?.justification || '').trim();
    if (justification.length < 5 || justification.length > 500) {
      const error = new Error('A justification with 5 to 500 characters is required.');
      error.status = 400;
      error.code = 'unlock_justification_required';
      throw error;
    }

    const result = await unlockUserLogin(req.params.userId);
    await writeAuditLog({
      req,
      user: req.user,
      action: 'security.login_unlocked',
      entity: 'User',
      entity_id: result.id,
      metadata: { justification }
    });
    res.json({ success: true, user: result });
  } catch (error) {
    next(error);
  }
}

export async function getAiProviderConfig(req, res, next) {
  try {
    const result = await getLlmProviderAdminConfig();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateAiProviderConfig(req, res, next) {
  try {
    const result = await saveLlmProviderAdminConfig(req.body || {}, req.user);
    await writeAuditLog({
      req,
      user: req.user,
      action: 'llm_provider_config.updated',
      entity: 'LlmProviderConfig',
      metadata: {
        provider: result.provider,
        model: result.model
      }
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAiProviderModels(req, res, next) {
  try {
    const provider = req.query.provider;
    const models = listSupportedModels(provider);
    res.json({ provider, models });
  } catch (error) {
    next(error);
  }
}
