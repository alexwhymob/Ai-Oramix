import { Router } from 'express';
import {
  getAiProviderConfig,
  invite,
  listAiProviderModels,
  resendInvite,
  update,
  updateAiProviderConfig
} from '../controllers/users.controller.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';

export const usersRouter = Router();

usersRouter.post('/invite', authMiddleware, requireRoles(['admin']), invite);
usersRouter.get('/ai-provider-config', authMiddleware, requireRoles(['admin']), getAiProviderConfig);
usersRouter.put('/ai-provider-config', authMiddleware, requireRoles(['admin']), updateAiProviderConfig);
usersRouter.get('/ai-provider-models', authMiddleware, requireRoles(['admin']), listAiProviderModels);
usersRouter.put('/:userId', authMiddleware, requireRoles(['admin']), update);
usersRouter.post('/:userId/resend-invite', authMiddleware, requireRoles(['admin']), resendInvite);
