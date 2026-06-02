import { Router } from 'express';
import { listAuditLogRecords } from '../controllers/auditLogs.controller.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';

export const auditLogsRouter = Router();

auditLogsRouter.get(
  '/',
  authMiddleware,
  requireRoles(['admin', 'ai_consultant']),
  listAuditLogRecords
);
