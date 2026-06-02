import { Router } from 'express';
import { invite } from '../controllers/users.controller.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';

export const usersRouter = Router();

usersRouter.post('/invite', authMiddleware, requireRoles(['admin']), invite);
