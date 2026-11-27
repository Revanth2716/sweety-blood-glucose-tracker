import { addDays, today } from '../../lib/dates.js';
import { forbidden, notFound } from '../../lib/errors.js';
import { buildTargets } from '../../lib/targets.js';
import { createInsightsService } from '../insights/insights.service.js';
import { createReportsRepository } from '../reports/reports.repository.js';
import { createUsersRepository } from './users.repository.js';

/** The period that the care team looks at when it lists the patients. */
const OVERVIEW_DAYS = 30;

/**
 * The console of a doctor: the patients they look after, with a short summary of each.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createCareService({ db }) {
  const users = createUsersRepository(db);
  const reports = createReportsRepository(db);
  const insights = createInsightsService({ db });

  return {
    /**
     * The patients of a doctor, each with the numbers of the last 30 days.
     *
     * @param {string} doctorId
     */
    async listPatients(doctorId) {
      const doctor = await users.findById(doctorId);
      if (!doctor) {
        throw notFound('User not found.');
      }
      if (doctor.role !== 'doctor') {
        throw forbidden('Only a doctor can see a list of patients.');
      }

      const patients = await users.listPatientsOf(doctorId);
      const to = today();
      const from = addDays(to, -(OVERVIEW_DAYS - 1));

      const summaries = [];

      for (const patient of patients) {
        const patientRow = await users.findById(patient.id);
        const stats = await reports.stats(patient.id, from, to);
        const detail = await insights.build(patient.id, from, to, stats, buildTargets(patientRow));

        summaries.push({
          id: patient.id,
          name: patient.name,
          email: patient.email,
          since:
            patient.created_at instanceof Date
              ? patient.created_at.toISOString()
              : patient.created_at,
          period: { from, to },
          stats,
          adherence: detail.adherence,
          flags: detail.patterns.filter((pattern) => pattern.severity === 'warning'),
        });
      }

      return summaries;
    },
  };
}
