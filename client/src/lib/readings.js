/**
 * The four time slots and their labels.
 *
 * The API is the source of truth, this list only mirrors it for the form and the tables.
 */
export const SLOTS = [
  { value: 'morning', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];

/**
 * The validation messages required by the assignment.
 */
export const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: 'Value must be between 40 and 600 mg/dl.',
  invalidDate: 'Please enter a valid date.',
  futureDate: 'Date cannot be in the future.',
  invalidSlot: 'Please choose a valid time slot.',
};

/**
 * Check the values of the form.
 *
 * The same rules are applied by the API - checking them here gives the user immediate feedback.
 *
 * @param {{ date: string, slot: string, value: string }} values
 * @param {string} today
 * @returns {Record<string, string>} the errors, keyed by field
 */
export function validateReading(values, today) {
  const errors = {};

  const rawValue = (values.value ?? '').trim();

  if (rawValue === '') {
    errors.value = MESSAGES.valueRequired;
  } else if (!/^\d+$/.test(rawValue) || Number(rawValue) < 40 || Number(rawValue) > 600) {
    errors.value = MESSAGES.valueRange;
  }

  if (!values.date) {
    errors.date = MESSAGES.invalidDate;
  } else if (values.date > today) {
    errors.date = MESSAGES.futureDate;
  }

  if (!values.slot) {
    errors.slot = MESSAGES.invalidSlot;
  }

  return errors;
}
