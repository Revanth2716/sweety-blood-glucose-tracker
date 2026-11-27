/**
 * The four time slots a patient can record a reading for.
 * This module is the single source of truth for the allowed slots and their labels.
 */
export const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

export const SLOT_LABELS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

/** Maximum number of readings a user may record for a single day. */
export const MAX_READINGS_PER_DAY = 4;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isSlot(value) {
  return typeof value === 'string' && SLOTS.includes(value);
}

/**
 * @param {string} slot
 * @returns {string}
 */
export function slotLabel(slot) {
  return SLOT_LABELS[slot] ?? slot;
}

/**
 * Build the "you already have a reading" message for a slot.
 *
 * The article follows the slot label ("an After lunch reading", "a Morning (fasting) reading").
 *
 * @param {string} slot
 * @returns {string}
 */
export function slotTakenMessage(slot) {
  const label = slotLabel(slot);
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}
