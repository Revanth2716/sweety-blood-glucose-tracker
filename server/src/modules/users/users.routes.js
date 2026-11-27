import { Router } from 'express';
import { createRequireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { addDays, today } from '../../lib/dates.js';
import { createCareService } from './care.service.js';
import { createUsersService } from './users.service.js';
import { linkPatientSchema, targetsSchema } from './users.schema.js';
import { createReportsService } from '../reports/reports.service.js';
import { createReportsRepository } from '../reports/reports.repository.js';
import { createInsightsService } from '../insights/insights.service.js';

/** The period that the insights cover when no dates are given. */
const DEFAULT_DAYS = 30;

/**
 * The profile of the user and the care team.
 *
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createUsersRouter({ db, config }) {
  const router = Router();
  const service = createUsersService({ db });
  const care = createCareService({ db });
  const reports = createReportsService({ db });
  const reportsRepository = createReportsRepository(db);
  const insightsService = createInsightsService({ db });
  const requireAuth = createRequireAuth(config);

  router.get('/profile', requireAuth, async (req, res) => {
    const profile = await service.getProfile(req.user.id);
    res.json(profile);
  });

  router.put('/profile/targets', requireAuth, validate(targetsSchema), async (req, res) => {
    const targets = await service.updateTargets(req.user.id, req.body);
    res.json({ targets });
  });

  router.get('/care/patients', requireAuth, async (req, res) => {
    const patients = await care.listPatients(req.user.id);
    res.json({ patients });
  });

  router.post('/care/patients', requireAuth, validate(linkPatientSchema), async (req, res) => {
    const result = await service.linkPatient(req.user.id, req.body.email);
    res.status(result.linked ? 201 : 200).json(result);
  });

  router.delete('/care/patients/:patientId', requireAuth, async (req, res) => {
    await service.unlinkPatient(req.user.id, req.params.patientId);
    res.status(204).end();
  });

  router.get('/care/patients/:patientId/report', requireAuth, async (req, res) => {
    await service.assertCaringFor(req.user.id, req.params.patientId);

    const reportType = req.query.type ?? 'month-to-date';
    const date = req.query.date;

    if (reportType === 'daily') {
      res.json(await reports.daily(req.params.patientId, date));
      return;
    }
    if (reportType === 'monthly') {
      res.json(await reports.monthly(req.params.patientId, date));
      return;
    }
    res.json(await reports.monthToDate(req.params.patientId, date));
  });

  router.get('/care/patients/:patientId/insights', requireAuth, async (req, res) => {
    await service.assertCaringFor(req.user.id, req.params.patientId);

    const to = req.query.to ?? today();
    const from = req.query.from ?? addDays(to, -(DEFAULT_DAYS - 1));

    const [stats, targets] = await Promise.all([
      reportsRepository.stats(req.params.patientId, from, to),
      service.getTargets(req.params.patientId),
    ]);

    const result = await insightsService.build(req.params.patientId, from, to, stats, targets);

    res.json({ period: { from, to }, ...result });
  });

  return router;
}
