import { Router } from 'express';
import { invokeFunction } from '../controllers/functions.controller.js';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/security.middleware.js';

export const functionsRouter = Router();

// Protect public quiz and integration-like function endpoints from automated abuse.
functionsRouter.post('/:functionName', createRateLimiter({ max: 120 }), optionalAuthMiddleware, invokeFunction);
