import { badRequest } from '../../lib/errors.js';
import {
  addDays,
  dailyRange,
  formatRangeLabel,
  isValidISODate,
  monthRange,
  monthToDateRange,
  previousMonthRange,
  shiftMonths,
  today,
} from '../../lib/dates.js';
import { slotLabel } from '../../lib/slots.js';
import { buildTargets, targetFor } from '../../lib/targets.js';
import { createUsersRepository } from '../users/users.repository.js';
import { createReportsRepository } from './reports.repository.js';

/**
 * Compare a value with the value of the previous period.
 *
 * @param {number | null} current
 * @param {number | null} previous
 * @param {{ higherIsBetter?: 'up' | 'down' | null }} [options]
 */
function buildTrend(current, previous, { higherIsBetter = null } = {}) {
  if (current === null || previous === null || previous === 0) {
    return {
      current,
      previous,
      change: null,
      changePercent: null,
      direction: null,
      higherIsBetter,
    };
  }

  const change = Math.round((current - previous) * 10) / 10;
  const changePercent = Math.round(((current - previous) / previous) * 1000) / 10;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';

  return { current, previous, change, changePercent, direction, higherIsBetter };
}

/**
 * The period right before the reported one, with the same length.
 *
 * @param {'daily' | 'month-to-date' | 'monthly'} report
 * @param {{ from: string, to: string }} range
 * @returns {{ from: string, to: string }}
 */
function previousRangeFor(report, range) {
  if (report === 'daily') {
    return { from: addDays(range.from, -1), to: addDays(range.to, -1) };
  }

  if (report === 'month-to-date') {
    const to = shiftMonths(range.to, -1);
    return { from: monthRange(to).from, to };
  }

  return monthRange(shiftMonths(range.from, -1));
}

/**
 * Business rules for the report endpoints.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createReportsService({ db }) {
  const repo = createReportsRepository(db);
  const users = createUsersRepository(db);

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

  /**
   * Build one of the three reports.
   *
   * @param {string} userId
   * @param {'daily' | 'month-to-date' | 'monthly'} report
   * @param {{ from: string, to: string }} range
   */
  async function buildReport(userId, report, range) {
    const previousRange = previousRangeFor(report, range);
    const user = await users.findById(userId);
    const targets = buildTargets(user);

    const [stats, previousStats, bySlot, readings] = await Promise.all([
      repo.stats(userId, range.from, range.to),
      repo.stats(userId, previousRange.from, previousRange.to),
      repo.statsBySlot(userId, range.from, range.to),
      repo.list(userId, range.from, range.to, targets),
    ]);

    const timeInRange = stats.timeInRange;
    const previousTimeInRange = previousStats.timeInRange;

    return {
      report,
      range: { ...range, label: formatRangeLabel(range.from, range.to) },
      previousRange: {
        ...previousRange,
        label: formatRangeLabel(previousRange.from, previousRange.to),
      },
      stats: {
        highest: stats.highest,
        lowest: stats.lowest,
        average: stats.average,
        count: stats.count,
        standardDeviation: stats.standardDeviation,
        inRange: stats.inRange,
        belowRange: stats.belowRange,
        aboveRange: stats.aboveRange,
        timeInRange,
        estimatedA1c: stats.estimatedA1c,
      },
      trend: {
        average: buildTrend(stats.average, previousStats.average),
        count: buildTrend(stats.count, previousStats.count),
        timeInRange: buildTrend(timeInRange, previousTimeInRange, { higherIsBetter: 'up' }),
      },
      slots: bySlot.map((entry) => ({
        ...entry,
        slotLabel: slotLabel(entry.slot),
        target: targetFor(entry.slot, targets),
      })),
      readings,
    };
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
      return buildReport(userId, 'daily', dailyRange(selected));
    },

    /**
     * The report from the first day of the selected month up to the selected date.
     *
     * @param {string} userId
     * @param {unknown} date
     */
    async monthToDate(userId, date) {
      const selected = resolveDate(date);
      return buildReport(userId, 'month-to-date', monthToDateRange(selected));
    },

    /**
     * The report for the whole calendar month before the selected date.
     *
     * @param {string} userId
     * @param {unknown} date
     */
    async monthly(userId, date) {
      const selected = resolveDate(date);
      return buildReport(userId, 'monthly', previousMonthRange(selected));
    },
  };
}
