/**
 * Glucose targets and the classification of a reading.
 *
 * The numbers follow the usual diabetes guidance:
 *   - 70 mg/dl is the lower limit. A reading below it is a hypo ("low").
 *   - 130 mg/dl is the upper target for a fasting reading.
 *   - 180 mg/dl is the upper target for a reading after a meal.
 *   - 70 - 180 mg/dl is the band used for the "time in range" metric.
 *
 * Both the server and the client use these rules, so the two always agree.
 */

/** The lower limit of the safe band. A reading below it is "low". */
export const LOW_LIMIT = 70;

/** The band used for the time in range metric. */
export const TIR_BAND = { min: 70, max: 180 };

/**
 * The target range of every time slot.
 *
 * @type {Record<string, { min: number, max: number, label: string }>}
 */
export const TARGETS = {
  morning: { min: 70, max: 130, label: 'Fasting target 70-130 mg/dl' },
  after_breakfast: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
  after_lunch: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
  after_dinner: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
};

/**
 * The status of a reading.
 *
 * @typedef {'low' | 'in-range' | 'high'} ReadingStatus
 */

export const STATUS_LABELS = {
  low: 'Low',
  'in-range': 'In range',
  high: 'High',
};

/**
 * Classify a reading against the target of its slot.
 *
 * @param {number} value
 * @param {string} slot
 * @returns {ReadingStatus}
 */
export function classifyReading(value, slot) {
  const target = TARGETS[slot] ?? TARGETS.after_lunch;

  if (value < LOW_LIMIT) {
    return 'low';
  }
  if (value > target.max) {
    return 'high';
  }
  return 'in-range';
}

/**
 * The target range of a slot.
 *
 * @param {string} slot
 * @returns {{ min: number, max: number, label: string }}
 */
export function targetFor(slot) {
  return TARGETS[slot] ?? TARGETS.after_lunch;
}

/**
 * Whether a value is inside the time in range band (70 - 180 mg/dl).
 *
 * @param {number} value
 * @returns {boolean}
 */
export function isInTirBand(value) {
  return value >= TIR_BAND.min && value <= TIR_BAND.max;
}

/**
 * Estimate the A1C from the average glucose (the ADAG formula).
 *
 * eAG = 28.7 * mean - 46.7 and A1C = (eAG + 46.7) / 28.7, which simplifies to
 * A1C = (mean + 46.7) / 28.7.
 *
 * This is an estimate for the patient's own information, not a diagnosis.
 *
 * @param {number} average
 * @returns {number} the estimated A1C in percent, rounded to one decimal place
 */
export function estimateA1c(average) {
  return Math.round(((average + 46.7) / 28.7) * 10) / 10;
}
