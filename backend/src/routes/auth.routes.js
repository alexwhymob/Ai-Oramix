import { Router } from 'express';
import { confirmMfa, forgotPassword, login, logout, me, refresh, register, resetPassword, setupMfa, turnOffMfa, verifyMfa } from '../controllers/auth.controller.js';
import { authMiddleware, requireRoles } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/security.middleware.js';

export const authRouter = Router();

authRouter.post('/login', createRateLimiter({ max: 10 }), login);
authRouter.post('/mfa/verify', createRateLimiter({ max: 10 }), verifyMfa);
authRouter.post('/register', register);
authRouter.post('/forgot-password', createRateLimiter({ max: 10 }), forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authMiddleware, me);
authRouter.post('/logout', logout);
authRouter.get('/mfa/setup', authMiddleware, requireRoles(['admin']), setupMfa);
authRouter.post('/mfa/confirm', authMiddleware, requireRoles(['admin']), confirmMfa);
authRouter.post('/mfa/disable', authMiddleware, requireRoles(['admin']), turnOffMfa);
