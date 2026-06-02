import { Router } from 'express';
import { invokeFunction } from '../controllers/functions.controller.js';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

export const functionsRouter = Router();

functionsRouter.post('/:functionName', optionalAuthMiddleware, invokeFunction);
