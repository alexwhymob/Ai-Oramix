import { AuditLog } from '../models/index.js';

export async function writeAuditLog({
  req,
  user,
  action,
  entity = null,
  entity_id = null,
  metadata = {}
}) {
  try {
    const actor = user || req?.user || null;

    await AuditLog.create({
      user_id: actor?.id || null,
      user_email: actor?.email || null,
      user_role: actor?.role || null,
      action,
      entity,
      entity_id,
      metadata,
      ip: req?.ip || null,
      user_agent: req?.headers?.['user-agent'] || null
    });
  } catch (error) {
    console.warn('[auditLog] failed to write audit log:', error.message);
  }
}

export async function listAuditLogs({ filter = {}, limit = 100, skip = 0, sort = { created_date: -1 } }) {
  return AuditLog.find(filter).sort(sort).skip(skip).limit(limit).lean();
}
