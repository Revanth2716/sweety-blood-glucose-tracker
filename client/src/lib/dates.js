const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Convert a Date to a `YYYY-MM-DD` string using the browser's local time zone.
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
 * Today's date in the browser, as `YYYY-MM-DD`.
 *
 * @returns {string}
 */
export function todayISO() {
  return toISODate(new Date());
}

/**
 * Format a `YYYY-MM-DD` date as "15 Oct 2026".
 *
 * @param {string} value
 * @returns {string}
 */
export function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Format a `YYYY-MM-DD` date as "15 Oct".
 *
 * @param {string} value
 * @returns {string}
 */
export function formatShortDate(value) {
  const [, month, day] = value.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/**
 * Format an ISO timestamp as "15 Oct 2026, 09:30".
 *
 * @param {string | null} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(toISODate(date))}, ${time}`;
}
