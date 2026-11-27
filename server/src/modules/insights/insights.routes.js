import { Router } from 'express';
import { createRequireAuth } from '../../middleware/auth.js';
import { addDays, today } from '../../lib/dates.js';
import { createInsightsService } from './insights.service.js';
import { createReportsRepository } from '../reports/reports.repository.js';
import { createUsersService } from '../users/users.service.js';

/** The period that the insights cover when no dates are given. */
const DEFAULT_DAYS = 30;

/**
 * The insights of a period: adherence and the patterns of the numbers.
 *
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createInsightsRouter({ db, config }) {
  const router = Router();
  const service = createInsightsService({ db });
  const reports = createReportsRepository(db);
  const users = createUsersService({ db });
  const requireAuth = createRequireAuth(config);

  router.get('/insights', requireAuth, async (req, res) => {
    const to = req.query.to ?? today();
    const from = req.query.from ?? addDays(to, -(DEFAULT_DAYS - 1));

    const [stats, targets] = await Promise.all([
      reports.stats(req.user.id, from, to),
      users.getTargets(req.user.id),
    ]);

    const result = await service.build(req.user.id, from, to, stats, targets);

    res.json({
      period: { from, to },
      ...result,
    });
  });

  return router;
}
