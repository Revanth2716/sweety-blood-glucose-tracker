import { toReadingDto } from '../readings/readings.repository.js';
import { estimateA1c } from '../../lib/targets.js';

/** A report needs at least this many readings before an A1C estimate is meaningful. */
export const MIN_READINGS_FOR_ESTIMATE = 3;

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
     * Highest, lowest, average and the time in range of a period.
     *
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @returns {Promise<{
     *   count: number,
     *   highest: number | null,
     *   lowest: number | null,
     *   average: number | null,
     *   standardDeviation: number | null,
     *   inRange: number,
     *   belowRange: number,
     *   aboveRange: number
     * }>}
     */
    async stats(userId, from, to) {
      const { rows } = await db.getQuery(
        `SELECT COUNT(*)::int                    AS count,
                MAX(value)                       AS highest,
                MIN(value)                       AS lowest,
                ROUND(AVG(value)::numeric, 1)     AS average,
                ROUND(STDDEV_POP(value)::numeric, 1) AS standard_deviation,
                COUNT(*) FILTER (WHERE value BETWEEN 70 AND 180)::int AS in_range,
                COUNT(*) FILTER (WHERE value < 70)::int             AS below_range,
                COUNT(*) FILTER (WHERE value > 180)::int            AS above_range
           FROM readings
          WHERE user_id = $1
            AND reading_date BETWEEN $2 AND $3`,
        [userId, from, to],
      );

      const row = rows[0] ?? {};
      const count = row.count ?? 0;

      return {
        count,
        highest: row.highest ?? null,
        lowest: row.lowest ?? null,
        // ROUND(...) on a numeric column is returned as a string by PostgreSQL.
        average: row.average === null || row.average === undefined ? null : Number(row.average),
        standardDeviation:
          row.standard_deviation === null || row.standard_deviation === undefined
            ? null
            : Number(row.standard_deviation),
        inRange: row.in_range ?? 0,
        belowRange: row.below_range ?? 0,
        aboveRange: row.above_range ?? 0,
        timeInRange: count === 0 ? null : Math.round(((row.in_range ?? 0) / count) * 1000) / 10,
        estimatedA1c:
          count >= MIN_READINGS_FOR_ESTIMATE && row.average !== null && row.average !== undefined
            ? estimateA1c(Number(row.average))
            : null,
      };
    },

    /**
     * The readings of a period, oldest first.
     *
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @param {any} [targets] the targets of the owner of the readings
     * @returns {Promise<any[]>}
     */
    async list(userId, from, to, targets) {
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
      return rows.map((row) => toReadingDto(row, targets));
    },

    /**
     * The average of a slot over a period, used for the per slot breakdown.
     *
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @returns {Promise<{ slot: string, average: number | null, count: number, highest: number | null, lowest: number | null }[]>}
     */
    async statsBySlot(userId, from, to) {
      const { rows } = await db.getQuery(
        `SELECT slot,
                COUNT(*)::int                AS count,
                MAX(value)                   AS highest,
                MIN(value)                   AS lowest,
                ROUND(AVG(value)::numeric, 1) AS average
           FROM readings
          WHERE user_id = $1
            AND reading_date BETWEEN $2 AND $3
          GROUP BY slot
          ORDER BY ${SLOT_ORDER}`,
        [userId, from, to],
      );

      return rows.map((row) => ({
        slot: row.slot,
        count: row.count ?? 0,
        highest: row.highest ?? null,
        lowest: row.lowest ?? null,
        average: row.average === null || row.average === undefined ? null : Number(row.average),
      }));
    },
  };
}
