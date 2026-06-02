import { parseEntityQuery } from '../entities/entityQuery.js';
import { listAuditLogs } from '../services/auditLog.service.js';

export async function listAuditLogRecords(req, res, next) {
  try {
    const { filter, limit, skip, sort } = parseEntityQuery(req.query);
    const records = await listAuditLogs({ filter, limit, skip, sort });
    res.json(records);
  } catch (error) {
    next(error);
  }
}
