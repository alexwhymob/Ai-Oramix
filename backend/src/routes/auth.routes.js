import { Router } from 'express';
import { forgotPassword, login, logout, me, refresh, register, resetPassword } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/security.middleware.js';

export const authRouter = Router();

authRouter.post('/login', createRateLimiter({ max: 10 }), login);
authRouter.post('/register', register);
authRouter.post('/forgot-password', createRateLimiter({ max: 10 }), forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authMiddleware, me);
authRouter.post('/logout', logout);
