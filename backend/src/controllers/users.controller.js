import { inviteUser } from '../services/auth.service.js';
import { writeAuditLog } from '../services/auditLog.service.js';

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
