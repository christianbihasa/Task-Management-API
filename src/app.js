import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { tasksRouter } from './modules/tasks/tasks.routes.js';
import { AppError } from './utils/AppError.js';
import { sendSuccess } from './utils/response.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '10kb' }));
  if (env.isDevelopment) app.use(morgan('dev'));

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    try {
      await query('SELECT 1');
    } catch {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Database is unreachable');
    }
    sendSuccess(res, { status: 'ok', database: 'connected', uptime: process.uptime() });
  });

  api.use('/auth', authRouter);
  api.use('/tasks', tasksRouter);

  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
