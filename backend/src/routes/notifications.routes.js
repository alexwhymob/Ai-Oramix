import { Router } from 'express';
import { publicKey, subscribe, unsubscribe } from '../controllers/notifications.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/security.middleware.js';

export const notificationsRouter = Router();

notificationsRouter.get('/public-key', publicKey);
notificationsRouter.post('/subscribe', authMiddleware, createRateLimiter({ max: 10 }), subscribe);
notificationsRouter.post('/unsubscribe', authMiddleware, createRateLimiter({ max: 10 }), unsubscribe);
