import { Router } from 'express';
import { createRequireAuth } from '../../middleware/auth.js';
import { createReadingsRepository, toReadingDto } from '../readings/readings.repository.js';
import { createUsersRepository } from '../users/users.repository.js';
import { buildTargets } from '../../lib/targets.js';

/**
 * The columns of the export.
 */
const COLUMNS = ['date', 'slot', 'value', 'status', 'target', 'notes', 'tags', 'recorded'];

/**
 * Escape a value for the CSV format.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * The readings of a user as a CSV file, so that they can be opened in a spreadsheet or shared
 * with a doctor.
 *
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createExportRouter({ db, config }) {
  const router = Router();
  const repo = createReadingsRepository(db);
  const users = createUsersRepository(db);
  const requireAuth = createRequireAuth(config);

  router.get('/readings.csv', requireAuth, async (req, res) => {
    const from = req.query.from ?? '1970-01-01';
    const to = req.query.to ?? '2999-12-31';

    const user = await users.findById(req.user.id);
    const targets = buildTargets(user);

    const rows = await repo.list(req.user.id, { from, to, limit: 10000, offset: 0 });
    const readings = rows.map((row) => toReadingDto(row, targets));

    const lines = [COLUMNS.join(',')];

    for (const reading of readings) {
      lines.push(
        [
          reading.date,
          escapeCsv(reading.slotLabel),
          reading.value,
          reading.statusLabel,
          `${reading.target.min}-${reading.target.max}`,
          escapeCsv(reading.notes),
          escapeCsv(reading.tags.join(' ')),
          reading.createdAt ?? '',
        ].join(','),
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sweety-readings-${from}-to-${to}.csv"`,
    );
    res.send(lines.join('\n'));
  });

  return router;
}
