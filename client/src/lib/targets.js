/**
 * The glucose targets, mirrored from the server so that the interface can label a reading
 * before the answer arrives.
 */
export const LOW_LIMIT = 70;

/** The band used for the time in range metric. */
export const TIR_BAND = { min: 70, max: 180 };

export const TARGETS = {
  morning: { min: 70, max: 130, label: 'Fasting target 70-130 mg/dl' },
  after_breakfast: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
  after_lunch: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
  after_dinner: { min: 70, max: 180, label: 'Post-meal target 70-180 mg/dl' },
};

export const STATUS_LABELS = {
  low: 'Low',
  'in-range': 'In range',
  high: 'High',
};

/**
 * @param {number} value
 * @param {string} slot
 * @returns {'low' | 'in-range' | 'high'}
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
 * @param {string} slot
 * @returns {{ min: number, max: number, label: string }}
 */
export function targetFor(slot) {
  return TARGETS[slot] ?? TARGETS.after_lunch;
}
