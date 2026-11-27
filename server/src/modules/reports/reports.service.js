import { badRequest } from '../../lib/errors.js';
import {
  dailyRange,
  formatRangeLabel,
  isValidISODate,
  monthToDateRange,
  previousMonthRange,
  today,
} from '../../lib/dates.js';
import { createReportsRepository } from './reports.repository.js';

/**
 * Build one of the three reports.
 *
 * @param {string} userId
 * @param {'daily' | 'month-to-date' | 'monthly'} report
 * @param {{ from: string, to: string }} range
 * @param {ReturnType<typeof createReportsRepository>} repo
 */
async function buildReport(userId, report, range, repo) {
  const [stats, readings] = await Promise.all([
    repo.stats(userId, range.from, range.to),
    repo.list(userId, range.from, range.to),
  ]);

  return {
    report,
    range: { ...range, label: formatRangeLabel(range.from, range.to) },
    stats,
    readings,
  };
}

/**
 * Business rules for the report endpoints.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createReportsService({ db }) {
  const repo = createReportsRepository(db);

  /**
   * The selected date, defaulting to today.
   *
   * @param {unknown} value
   * @returns {string}
   */
  function resolveDate(value) {
    if (value === undefined || value === null || value === '') {
      return today();
    }
    const raw = String(Array.isArray(value) ? value[0] : value).trim();
    if (!isValidISODate(raw)) {
      throw badRequest('Please enter a valid date.', 'date', 'INVALID_DATE');
    }
    return raw;
  }

  return {
    /**
     * The report for a single day.
     *
     * @param {string} userId
     * @param {unknown} date
     */
    async daily(userId, date) {
      const selected = resolveDate(date);
      return buildReport(userId, 'daily', dailyRange(selected), repo);
    },

    /**
     * The report from the first day of the selected month up to the selected date.
     *
     * @param {string} userId
     * @param {unknown} date
     */
    async monthToDate(userId, date) {
      const selected = resolveDate(date);
      return buildReport(userId, 'month-to-date', monthToDateRange(selected), repo);
    },

    /**
     * The report for the whole calendar month before the selected date.
     *
     * @param {string} userId
     * @param {unknown} date
     */
    async monthly(userId, date) {
      const selected = resolveDate(date);
      return buildReport(userId, 'monthly', previousMonthRange(selected), repo);
    },
  };
}
