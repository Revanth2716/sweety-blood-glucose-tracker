import { Router } from 'express';
import { createRequireAuth } from '../../middleware/auth.js';
import { createReportsService } from './reports.service.js';

/**
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createReportsRouter({ db, config }) {
  const router = Router();
  const service = createReportsService({ db });

  router.use(createRequireAuth(config));

  router.get('/daily', async (req, res) => {
    const report = await service.daily(req.user.id, req.query.date);
    res.json(report);
  });

  router.get('/month-to-date', async (req, res) => {
    const report = await service.monthToDate(req.user.id, req.query.date);
    res.json(report);
  });

  router.get('/monthly', async (req, res) => {
    const report = await service.monthly(req.user.id, req.query.date);
    res.json(report);
  });

  return router;
}
