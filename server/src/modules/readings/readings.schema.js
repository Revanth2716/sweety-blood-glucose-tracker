import { badRequest } from '../../lib/errors.js';
import { isValidISODate, today } from '../../lib/dates.js';
import { isSlot } from '../../lib/slots.js';

/**
 * The exact wording required by the assignment. These strings are shown verbatim in the UI.
 */
export const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: 'Value must be between 40 and 600 mg/dl.',
  invalidDate: 'Please enter a valid date.',
  futureDate: 'Date cannot be in the future.',
  invalidSlot: 'Please choose a valid time slot.',
  maxPerDay: 'You can add only 4 readings per day.',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * The longest note that a reading can carry.
 */
export const MAX_NOTES_LENGTH = 280;

/** The number of tags that a reading can carry. */
export const MAX_TAGS = 6;

/**
 * Clean up the tags of a reading: lower case, no duplicates and no more than six of them.
 *
 * @param {unknown} tags
 * @returns {string[]}
 */
export function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const cleaned = tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 24);

  return [...new Set(cleaned)].slice(0, MAX_TAGS);
}

/**
 * Validate the body of a create/update request.
 *
 * The checks run in the order listed in the assignment, with one deliberate exception: the
 * "date cannot be in the future" check runs before the database backed checks, so that a future
 * date is never reported as "You can add only 4 readings per day.".
 *
 * @param {{ date?: unknown, slot?: unknown, value?: unknown, notes?: unknown, tags?: unknown }} input
 * @returns {{ date: string, slot: string, value: number, notes: string, tags: string[] }}
 */
export function validateReadingInput(input) {
  const body = input ?? {};

  // 1. The value is required.
  const rawValue = body.value;
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    throw badRequest(MESSAGES.valueRequired, 'value', 'VALUE_REQUIRED');
  }

  // 2. The value must be a whole number between 40 and 600.
  const valueText = String(rawValue).trim();
  if (!/^\d+$/.test(valueText)) {
    throw badRequest(MESSAGES.valueRange, 'value', 'VALUE_OUT_OF_RANGE');
  }
  const value = Number(valueText);
  if (!Number.isInteger(value) || value < 40 || value > 600) {
    throw badRequest(MESSAGES.valueRange, 'value', 'VALUE_OUT_OF_RANGE');
  }

  // 3. The date must be a real calendar date.
  const date = String(body.date ?? '').trim();
  if (!isValidISODate(date)) {
    throw badRequest(MESSAGES.invalidDate, 'date', 'INVALID_DATE');
  }

  // 4. The date cannot be in the future.
  if (date > today()) {
    throw badRequest(MESSAGES.futureDate, 'date', 'FUTURE_DATE');
  }

  // 5. The slot must be one of the four time slots.
  const slot = String(body.slot ?? '').trim();
  if (!isSlot(slot)) {
    throw badRequest(MESSAGES.invalidSlot, 'slot', 'INVALID_SLOT');
  }

  // The context of the reading: an optional note and a few tags.
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, MAX_NOTES_LENGTH) : '';
  const tags = normalizeTags(body.tags);

  return { date, slot, value, notes, tags };
}

/**
 * Parse and validate the query parameters of the readings list endpoint.
 *
 * @param {Record<string, unknown>} [query]
 * @returns {{ page: number, limit: number, from?: string, to?: string }}
 */
export function parseListQuery(query = {}) {
  const page = parsePositiveInt(query.page, 1, 'page');
  const limit = Math.min(parsePositiveInt(query.limit, 20, 'limit'), 100);

  const date = query.date ? parseDate(query.date) : undefined;
  const from = date ?? (query.from ? parseDate(query.from) : undefined);
  const to = date ?? (query.to ? parseDate(query.to) : undefined);

  if (from && to && from > to) {
    throw badRequest('The start date must not be after the end date.', 'from', 'INVALID_RANGE');
  }

  return { page, limit, from, to };
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {string} field
 * @returns {number}
 */
function parsePositiveInt(value, fallback, field) {
  if (value === undefined || value === '') {
    return fallback;
  }
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw badRequest(`The ${field} must be a positive whole number.`, field, 'INVALID_PAGINATION');
  }
  return parsed;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function parseDate(value) {
  const raw = String(Array.isArray(value) ? value[0] : value).trim();
  if (!isValidISODate(raw)) {
    throw badRequest(MESSAGES.invalidDate, 'date', 'INVALID_DATE');
  }
  return raw;
}
