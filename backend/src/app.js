import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { auditLogsRouter } from './routes/auditLogs.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { functionsRouter } from './routes/functions.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { integrationsRouter } from './routes/integrations.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { optionalAuthMiddleware } from './middlewares/auth.middleware.js';
import { createRateLimiter, csrfOriginProtection, securityHeaders } from './middlewares/security.middleware.js';
import { httpMetricsMiddleware } from './telemetry/metrics.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);
  app.use(securityHeaders);
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(csrfOriginProtection);
  app.use(httpMetricsMiddleware);

  app.use('/api', healthRouter);
  app.use('/api/auth', createRateLimiter({ max: 30 }));
  app.use('/api/auth', authRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/functions', functionsRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/users', createRateLimiter({ max: 30 }));
  app.use('/api/users', usersRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/entities', optionalAuthMiddleware);
  app.use('/api/entities', entitiesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
