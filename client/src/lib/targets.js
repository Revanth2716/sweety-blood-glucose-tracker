/**
 * Glucose targets.
 *
 * The server owns the real rules, but the interface needs the same numbers to label a reading
 * before it is saved. The targets of the user are fetched from the profile.
 */
export const DEFAULT_TARGETS = {
  fastingMin: 70,
  fastingMax: 130,
  postMealMin: 70,
  postMealMax: 180,
  tirGoal: 70,
  a1cGoal: 7,
};

/** The lower limit of the safe band. A reading below it is "low". */
export const LOW_LIMIT = 70;

/** The band used for the time in range metric. */
export const TIR_BAND = { min: 70, max: 180 };

export const STATUS_LABELS = {
  low: 'Low',
  'in-range': 'In range',
  high: 'High',
};

const FASTING_SLOTS = new Set(['morning']);

/**
 * The target range of a slot.
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
 * @returns {'low' | 'in-range' | 'high'}
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
 * The tags a reading can carry.
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
