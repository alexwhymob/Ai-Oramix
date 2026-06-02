import { Router } from 'express';
import { invokeIntegration } from '../controllers/integrations.controller.js';
import { optionalAuthMiddleware } from '../middlewares/auth.middleware.js';

export const integrationsRouter = Router();

integrationsRouter.post('/:integrationName', optionalAuthMiddleware, invokeIntegration);
