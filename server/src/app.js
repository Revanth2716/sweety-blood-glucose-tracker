import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createReadingsRouter } from './modules/readings/readings.routes.js';
import { createReportsRouter } from './modules/reports/reports.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Build the Express application.
 *
 * The app is created without listening, so tests can drive it with supertest.
 *
 * @param {{ db: import('./db/index.js').Database, config: any }} deps
 * @returns {import('express').Express}
 */
export function createApp({ db, config }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: db.mode });
  });

  app.use('/api/auth', createAuthRouter({ db, config }));
  app.use('/api/readings', createReadingsRouter({ db, config }));
  app.use('/api/reports', createReportsRouter({ db, config }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
