/**
 * Glucose targets.
 *
 * The numbers follow the usual diabetes guidance:
 *   - 70 mg/dl is the lower limit. A reading below it is a hypo ("low").
 *   - 130 mg/dl is the upper target for a fasting reading.
 *   - 180 mg/dl is the upper target for a reading after a meal.
 *   - 70 - 180 mg/dl is the band used for the "time in range" metric.
 *
 * Every target can be changed by the user, so the rules live in a small object that is built
 * from the row of the user.
 */

/** The default targets, used when a user has not changed anything. */
export const DEFAULT_TARGETS = {
  fastingMin: 70,
  fastingMax: 130,
  postMealMin: 70,
  postMealMax: 180,
  tirGoal: 70,
  a1cGoal: 7,
};

/**
 * Build the targets of a user from their row in the users table.
 *
 * @param {any} row
 * @returns {typeof DEFAULT_TARGETS}
 */
export function buildTargets(row = {}) {
  return {
    fastingMin: row.fasting_target_min ?? DEFAULT_TARGETS.fastingMin,
    fastingMax: row.fasting_target_max ?? DEFAULT_TARGETS.fastingMax,
    postMealMin: row.post_meal_target_min ?? DEFAULT_TARGETS.postMealMin,
    postMealMax: row.post_meal_target_max ?? DEFAULT_TARGETS.postMealMax,
    tirGoal: row.tir_goal ?? DEFAULT_TARGETS.tirGoal,
    a1cGoal: Number(row.a1c_goal ?? DEFAULT_TARGETS.a1cGoal),
  };
}

/**
 * The lower limit of the safe band. A reading below it is "low".
 */
export const LOW_LIMIT = 70;

/** The band used for the time in range metric. */
export const TIR_BAND = { min: 70, max: 180 };

/**
 * @typedef {'low' | 'in-range' | 'high'} ReadingStatus
 */

export const STATUS_LABELS = {
  low: 'Low',
  'in-range': 'In range',
  high: 'High',
};

/**
 * The slots that use the fasting target.
 */
const FASTING_SLOTS = new Set(['morning']);

/**
 * The target range of a slot, for the targets of a user.
 *
 * @param {string} slot
 * @param {typeof DEFAULT_TARGETS} [targets]
 * @returns {{ min: number, max: number, label: string }}
 */
export function targetFor(slot, targets = DEFAULT_TARGETS) {
  const fasting = FASTING_SLOTS.has(slot);
  const min = fasting ? targets.fastingMin : targets.postMealMin;
  const max = fasting ? targets.fastingMax : targets.postMealMax;

  return {
    min,
    max,
    label: fasting ? `Fasting target ${min}-${max} mg/dl` : `Post-meal target ${min}-${max} mg/dl`,
  };
}

/**
 * Classify a reading against the target of its slot.
 *
 * @param {number} value
 * @param {string} slot
 * @param {typeof DEFAULT_TARGETS} [targets]
 * @returns {ReadingStatus}
 */
export function classifyReading(value, slot, targets = DEFAULT_TARGETS) {
  const target = targetFor(slot, targets);

  if (value < LOW_LIMIT) {
    return 'low';
  }
  if (value > target.max) {
    return 'high';
  }
  return 'in-range';
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

/**
 * The tags a user can put on a reading.
 */
export const READING_TAGS = [
  'exercise',
  'stress',
  'illness',
  'alcohol',
  'late meal',
  'skipped meal',
  'medication',
  'poor sleep',
];
