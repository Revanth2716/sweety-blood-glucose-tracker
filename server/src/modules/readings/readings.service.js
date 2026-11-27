import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { MAX_READINGS_PER_DAY, slotTakenMessage } from '../../lib/slots.js';
import { createReadingsRepository, toReadingDto } from './readings.repository.js';
import { MESSAGES, isUuid, parseListQuery, validateReadingInput } from './readings.schema.js';

/**
 * Business rules for the readings endpoints.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createReadingsService({ db }) {
  const repo = createReadingsRepository(db);

  /**
   * Make sure the requested slot is still free on the requested date.
   *
   * The daily limit is checked first so that both messages stay reachable: on a day that already
   * holds four readings the user is told about the limit, on a day that holds fewer the user is
   * told which slot is taken.
   *
   * @param {string} userId
   * @param {{ date: string, slot: string }} reading
   * @param {string | null} excludeId
   */
  async function assertSlotAvailable(userId, reading, excludeId) {
    const existing = await repo.findSlotsForDate(userId, reading.date, excludeId);

    if (existing.length >= MAX_READINGS_PER_DAY) {
      throw badRequest(MESSAGES.maxPerDay, 'value', 'MAX_READINGS_PER_DAY');
    }

    if (existing.some((row) => row.slot === reading.slot)) {
      throw conflict(slotTakenMessage(reading.slot), 'slot', 'SLOT_TAKEN');
    }
  }

  return {
    /**
     * @param {string} userId
     * @param {Record<string, unknown>} query
     */
    async list(userId, query) {
      const { page, limit, from, to } = parseListQuery(query);
      const total = await repo.count(userId, { from, to });
      const rows = await repo.list(userId, { from, to, limit, offset: (page - 1) * limit });

      return {
        data: rows.map(toReadingDto),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    },

    /**
     * @param {string} userId
     * @param {string} id
     */
    async getById(userId, id) {
      if (!isUuid(id)) {
        throw notFound('Reading not found.');
      }
      const row = await repo.findById(userId, id);
      if (!row) {
        throw notFound('Reading not found.');
      }
      return toReadingDto(row);
    },

    /**
     * @param {string} userId
     * @param {unknown} input
     */
    async create(userId, input) {
      const reading = validateReadingInput(input);
      await assertSlotAvailable(userId, reading, null);
      const row = await repo.create(userId, reading);
      return toReadingDto(row);
    },

    /**
     * @param {string} userId
     * @param {string} id
     * @param {unknown} input
     */
    async update(userId, id, input) {
      if (!isUuid(id)) {
        throw notFound('Reading not found.');
      }
      const reading = validateReadingInput(input);

      const existing = await repo.findById(userId, id);
      if (!existing) {
        throw notFound('Reading not found.');
      }

      await assertSlotAvailable(userId, reading, id);
      const row = await repo.update(userId, id, reading);
      return toReadingDto(row);
    },

    /**
     * @param {string} userId
     * @param {string} id
     */
    async remove(userId, id) {
      if (!isUuid(id)) {
        throw notFound('Reading not found.');
      }
      const row = await repo.remove(userId, id);
      if (!row) {
        throw notFound('Reading not found.');
      }
    },
  };
}
