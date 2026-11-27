import { toReadingDto } from '../readings/readings.repository.js';

const SLOT_ORDER = `CASE slot
    WHEN 'morning' THEN 1
    WHEN 'after_breakfast' THEN 2
    WHEN 'after_lunch' THEN 3
    ELSE 4
  END`;

/**
 * All SQL for the report endpoints lives here.
 *
 * @param {import('../../db/index.js').Database} db
 */
export function createReportsRepository(db) {
  return {
    /**
     * Highest, lowest, average and number of readings in a period.
     *
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @returns {Promise<{ count: number, highest: number | null, lowest: number | null, average: number | null }>}
     */
    async stats(userId, from, to) {
      const { rows } = await db.getQuery(
        `SELECT COUNT(*)::int            AS count,
                MAX(value)               AS highest,
                MIN(value)               AS lowest,
                ROUND(AVG(value)::numeric, 1) AS average
           FROM readings
          WHERE user_id = $1
            AND reading_date BETWEEN $2 AND $3`,
        [userId, from, to],
      );

      const row = rows[0] ?? {};
      return {
        count: row.count ?? 0,
        highest: row.highest ?? null,
        lowest: row.lowest ?? null,
        // ROUND(...) on a numeric column is returned as a string by PostgreSQL.
        average: row.average === null || row.average === undefined ? null : Number(row.average),
      };
    },

    /**
     * The readings of a period, oldest first.
     *
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @returns {Promise<any[]>}
     */
    async list(userId, from, to) {
      const { rows } = await db.getQuery(
        `SELECT id,
                reading_date::text AS reading_date,
                slot,
                value,
                created_at,
                updated_at
           FROM readings
          WHERE user_id = $1
            AND reading_date BETWEEN $2 AND $3
          ORDER BY reading_date ASC, ${SLOT_ORDER}, created_at ASC`,
        [userId, from, to],
      );
      return rows.map(toReadingDto);
    },
  };
}
