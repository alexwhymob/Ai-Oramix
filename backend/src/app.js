import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { entitiesRouter } from './routes/entities.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
  }));
  app.use(express.json());

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/entities', entitiesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
