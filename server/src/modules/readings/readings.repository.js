import { slotLabel } from '../../lib/slots.js';

const READING_COLUMNS = `
  id,
  reading_date::text AS reading_date,
  slot,
  value,
  created_at,
  updated_at`;

/** Readings are always listed in the order of the day: morning first, then the meals. */
const SLOT_ORDER = `CASE slot
    WHEN 'morning' THEN 1
    WHEN 'after_breakfast' THEN 2
    WHEN 'after_lunch' THEN 3
    ELSE 4
  END`;

/**
 * All SQL for the readings table lives here.
 *
 * @param {import('../../db/index.js').Database} db
 */
export function createReadingsRepository(db) {
  /**
   * @param {string} userId
   * @param {{ from?: string, to?: string }} filters
   * @returns {string}
   */
  function buildFilter(userId, filters) {
    const conditions = ['user_id = $1'];
    const params = [userId];

    if (filters.from) {
      params.push(filters.from);
      conditions.push(`reading_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`reading_date <= $${params.length}`);
    }

    return { where: conditions.join(' AND '), params };
  }

  return {
    /**
     * @param {string} userId
     * @param {{ from?: string, to?: string, limit: number, offset: number }} options
     * @returns {Promise<any[]>}
     */
    async list(userId, { from, to, limit, offset }) {
      const { where, params } = buildFilter(userId, { from, to });
      const limitParam = `$${params.length + 1}`;
      const offsetParam = `$${params.length + 2}`;

      const { rows } = await db.getQuery(
        `SELECT ${READING_COLUMNS}
           FROM readings
          WHERE ${where}
          ORDER BY reading_date DESC, ${SLOT_ORDER}, created_at DESC
          LIMIT ${limitParam} OFFSET ${offsetParam}`,
        [...params, limit, offset],
      );
      return rows;
    },

    /**
     * @param {string} userId
     * @param {{ from?: string, to?: string }} filters
     * @returns {Promise<number>}
     */
    async count(userId, { from, to }) {
      const { where, params } = buildFilter(userId, { from, to });
      const { rows } = await db.getQuery(
        `SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`,
        params,
      );
      return rows[0]?.total ?? 0;
    },

    /**
     * @param {string} userId
     * @param {string} id
     * @returns {Promise<any | null>}
     */
    async findById(userId, id) {
      const { rows } = await db.getQuery(
        `SELECT ${READING_COLUMNS}
           FROM readings
          WHERE id = $1::uuid AND user_id = $2`,
        [id, userId],
      );
      return rows[0] ?? null;
    },

    /**
     * The slots that already have a reading on the given date.
     *
     * @param {string} userId
     * @param {string} date
     * @param {string | null} excludeId a reading that is being edited is left out of the result
     * @returns {Promise<{ id: string, slot: string }[]>}
     */
    async findSlotsForDate(userId, date, excludeId = null) {
      const params = [userId, date];
      let exclusion = '';
      if (excludeId) {
        params.push(excludeId);
        exclusion = `AND id <> $${params.length}::uuid`;
      }

      const { rows } = await db.getQuery(
        `SELECT id, slot
           FROM readings
          WHERE user_id = $1 AND reading_date = $2 ${exclusion}`,
        params,
      );
      return rows;
    },

    /**
     * @param {string} userId
     * @param {{ date: string, slot: string, value: number }} reading
     * @returns {Promise<any>}
     */
    async create(userId, { date, slot, value }) {
      const { rows } = await db.getQuery(
        `INSERT INTO readings (user_id, reading_date, slot, value)
              VALUES ($1, $2, $3, $4)
           RETURNING ${READING_COLUMNS}`,
        [userId, date, slot, value],
      );
      return rows[0];
    },

    /**
     * @param {string} userId
     * @param {string} id
     * @param {{ date: string, slot: string, value: number }} reading
     * @returns {Promise<any | null>}
     */
    async update(userId, id, { date, slot, value }) {
      const { rows } = await db.getQuery(
        `UPDATE readings
            SET reading_date = $3, slot = $4, value = $5, updated_at = now()
          WHERE id = $1::uuid AND user_id = $2
        RETURNING ${READING_COLUMNS}`,
        [id, userId, date, slot, value],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {string} userId
     * @param {string} id
     * @returns {Promise<any | null>}
     */
    async remove(userId, id) {
      const { rows } = await db.getQuery(
        `DELETE FROM readings
          WHERE id = $1::uuid AND user_id = $2
        RETURNING id`,
        [id, userId],
      );
      return rows[0] ?? null;
    },
  };
}

/**
 * @param {any} row
 * @returns {{ id: string, date: string, slot: string, slotLabel: string, value: number, createdAt: string | null, updatedAt: string | null }}
 */
export function toReadingDto(row) {
  return {
    id: row.id,
    date: row.reading_date,
    slot: row.slot,
    slotLabel: slotLabel(row.slot),
    value: row.value,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
