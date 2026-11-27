const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Convert a Date to a `YYYY-MM-DD` string using the server's local time zone.
 *
 * @param {Date} date
 * @returns {string}
 */
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Today's date on the server, as `YYYY-MM-DD`.
 *
 * @returns {string}
 */
export function today() {
  return toISODate(new Date());
}

/**
 * @param {unknown} value
 * @returns {boolean} true when the value is a real calendar date in `YYYY-MM-DD` form
 */
export function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  );
}

/**
 * Parse a `YYYY-MM-DD` string into a local Date at midnight.
 *
 * @param {string} value
 * @returns {Date}
 */
export function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date as "15 Oct 2026".
 *
 * The month names are listed here instead of using `toLocaleDateString`, because the short
 * month name of some locales is "Sept" instead of "Sep".
 *
 * @param {string} value `YYYY-MM-DD`
 * @returns {string}
 */
export function formatDateLabel(value) {
  const [year, month, day] = value.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Format a range as "15 Oct 2026" (single day) or "1 Oct – 15 Oct 2026".
 *
 * @param {string} from `YYYY-MM-DD`
 * @param {string} to `YYYY-MM-DD`
 * @returns {string}
 */
export function formatRangeLabel(from, to) {
  if (from === to) {
    return formatDateLabel(from);
  }

  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);

  const startLabel =
    fromYear === toYear
      ? `${fromDay} ${MONTH_NAMES[fromMonth - 1]}`
      : `${fromDay} ${MONTH_NAMES[fromMonth - 1]} ${fromYear}`;
  const endLabel = `${toDay} ${MONTH_NAMES[toMonth - 1]} ${toYear}`;

  return `${startLabel} – ${endLabel}`;
}

/**
 * The range covering a single day.
 *
 * @param {string} date `YYYY-MM-DD`
 * @returns {{ from: string, to: string }}
 */
export function dailyRange(date) {
  return { from: date, to: date };
}

/**
 * The range from the first day of the selected month up to and including the selected date.
 *
 * @param {string} date `YYYY-MM-DD`
 * @returns {{ from: string, to: string }}
 */
export function monthToDateRange(date) {
  const [year, month] = date.split('-').map(Number);
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  return { from: first, to: date };
}

/**
 * The range covering the whole calendar month before the selected date.
 *
 * @param {string} date `YYYY-MM-DD`
 * @returns {{ from: string, to: string }}
 */
export function previousMonthRange(date) {
  const [year, month] = date.split('-').map(Number);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  const lastDay = new Date(previousYear, previousMonth, 0).getDate();
  const prefix = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
  return { from: `${prefix}-01`, to: `${prefix}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Shift a date by a number of days.
 *
 * @param {string} date `YYYY-MM-DD`
 * @param {number} days
 * @returns {string}
 */
export function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(year, month - 1, day);
  shifted.setDate(shifted.getDate() + days);
  return toISODate(shifted);
}

/**
 * Shift a date by a number of months. The day is clamped to the length of the target month,
 * so the 31st of January becomes the 28th or 29th of February.
 *
 * @param {string} date `YYYY-MM-DD`
 * @param {number} months
 * @returns {string}
 */
export function shiftMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toISODate(new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)));
}

/**
 * The range covering the whole calendar month of the given date.
 *
 * @param {string} date `YYYY-MM-DD`
 * @returns {{ from: string, to: string }}
 */
export function monthRange(date) {
  const [year, month] = date.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return { from: `${prefix}-01`, to: `${prefix}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * The number of days of a range, both ends included.
 *
 * @param {{ from: string, to: string }} range
 * @returns {number}
 */
export function rangeLength(range) {
  const [fromYear, fromMonth, fromDay] = range.from.split('-').map(Number);
  const [toYear, toMonth, toDay] = range.to.split('-').map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86400000) + 1;
}
