import { addDays } from '../../lib/dates.js';
import { SLOTS } from '../../lib/slots.js';
import { LOW_LIMIT, TIR_BAND } from '../../lib/targets.js';

/**
 * The readings of a period, without the user filter.
 *
 * @param {import('../../db/index.js').Database} db
 */
function createReadingsReader(db) {
  return {
    /**
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @returns {Promise<any[]>}
     */
    async list(userId, from, to) {
      const { rows } = await db.getQuery(
        `SELECT reading_date::text AS reading_date, slot, value, tags
           FROM readings
          WHERE user_id = $1
            AND reading_date BETWEEN $2 AND $3
          ORDER BY reading_date ASC`,
        [userId, from, to],
      );
      return rows;
    },
  };
}

/**
 * Every day of a period, as `YYYY-MM-DD`.
 *
 * @param {string} from
 * @param {string} to
 * @returns {string[]}
 */
function eachDay(from, to) {
  const days = [];
  let cursor = from;

  while (cursor <= to) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

/**
 * How consistently the readings were recorded.
 *
 * @param {any[]} readings
 * @param {string} from
 * @param {string} to
 */
function buildAdherence(readings, from, to) {
  const days = eachDay(from, to);
  const recorded = new Set(readings.map((reading) => `${reading.reading_date}|${reading.slot}`));

  const bySlot = {};
  for (const slot of SLOTS) {
    let logged = 0;
    for (const day of days) {
      if (recorded.has(`${day}|${slot}`)) {
        logged += 1;
      }
    }
    bySlot[slot] = {
      logged,
      possible: days.length,
      percent: Math.round((logged / days.length) * 100),
    };
  }

  const possible = days.length * SLOTS.length;
  const logged = readings.length;

  // The streak counts the days with at least one reading, counting back from the last day.
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const hasReading = readings.some((reading) => reading.reading_date === days[index]);
    if (!hasReading) {
      break;
    }
    streak += 1;
  }

  // The days on which every slot was filled in.
  const completeDays = days.filter((day) =>
    SLOTS.every((slot) => recorded.has(`${day}|${slot}`)),
  ).length;

  return {
    days: days.length,
    loggedSlots: logged,
    possibleSlots: possible,
    percent: possible === 0 ? 0 : Math.round((logged / possible) * 100),
    completeDays,
    completeDaysPercent: days.length === 0 ? 0 : Math.round((completeDays / days.length) * 100),
    bySlot,
    streak,
  };
}

/**
 * The patterns that the numbers of a period show.
 *
 * The rules are simple and explainable on purpose - every insight says what it is based on.
 *
 * @param {any[]} readings
 * @param {any} adherence
 * @param {any} stats the report statistics of the same period
 * @param {any} targets
 * @returns {any[]}
 */
function buildPatterns(readings, adherence, stats, targets) {
  const patterns = [];

  // 1. Adherence.
  if (adherence.days > 0 && adherence.percent < 80) {
    patterns.push({
      id: 'adherence',
      severity: 'warning',
      title: `You recorded ${adherence.percent}% of the possible readings`,
      detail:
        `Between the ${adherence.days} days of this period you filled in ${adherence.loggedSlots} of ` +
        `${adherence.possibleSlots} slots. The lowest slot is ` +
        `${Object.entries(adherence.bySlot)
          .sort((left, right) => left[1].percent - right[1].percent)[0][0]
          .replace('_', ' ')}.`,
    });
  }

  // 2. The slots that are missed most often.
  const worstSlot = Object.entries(adherence.bySlot).sort(
    (left, right) => left[1].percent - right[1].percent,
  )[0];
  if (worstSlot && worstSlot[1].percent < 70) {
    patterns.push({
      id: 'weakest-slot',
      severity: 'info',
      title: `The ${worstSlot[0].replace('_', ' ')} slot is the one you miss most`,
      detail: `You recorded it on ${worstSlot[1].percent}% of the days in this period.`,
    });
  }

  // 3. The difference between the fasting and the post-meal readings.
  const morning = readings.filter((reading) => reading.slot === 'morning');
  const afterMeals = readings.filter((reading) => reading.slot !== 'morning');

  if (morning.length >= 3 && afterMeals.length >= 3) {
    const morningAverage = average(morning.map((reading) => reading.value));
    const mealAverage = average(afterMeals.map((reading) => reading.value));
    const difference = Math.round(mealAverage - morningAverage);

    if (Math.abs(difference) >= 10) {
      patterns.push({
        id: 'meal-gap',
        severity: difference > 0 ? 'warning' : 'info',
        title:
          difference > 0
            ? `Your readings after a meal are ${difference} mg/dl higher than in the morning`
            : `Your morning readings are ${Math.abs(difference)} mg/dl higher than after a meal`,
        detail:
          `Morning average ${morningAverage} mg/dl over ${morning.length} readings, ` +
          `after-meal average ${mealAverage} mg/dl over ${afterMeals.length} readings.`,
      });
    }
  }

  // 4. The readings below the safe limit.
  const lowReadings = readings.filter((reading) => reading.value < LOW_LIMIT);
  if (lowReadings.length > 0) {
    patterns.push({
      id: 'low-readings',
      severity: 'warning',
      title: `You had ${lowReadings.length} reading${lowReadings.length === 1 ? '' : 's'} below ${LOW_LIMIT} mg/dl`,
      detail: `The lowest one was ${Math.min(...lowReadings.map((reading) => reading.value))} mg/dl.`,
    });
  }

  // 5. The readings far above the band.
  const highReadings = readings.filter((reading) => reading.value > TIR_BAND.max);
  if (highReadings.length >= 2) {
    patterns.push({
      id: 'high-readings',
      severity: 'warning',
      title: `You had ${highReadings.length} readings above ${TIR_BAND.max} mg/dl`,
      detail: `The highest one was ${Math.max(...highReadings.map((reading) => reading.value))} mg/dl.`,
    });
  }

  // 6. The goal of the user.
  if (stats.timeInRange !== null && stats.timeInRange < targets.tirGoal) {
    patterns.push({
      id: 'tir-goal',
      severity: 'warning',
      title: `Your time in range was ${stats.timeInRange}%, below your goal of ${targets.tirGoal}%`,
      detail: `${stats.inRange} of ${stats.count} readings were between ${TIR_BAND.min} and ${TIR_BAND.max} mg/dl.`,
    });
  } else if (stats.timeInRange !== null && stats.timeInRange >= targets.tirGoal) {
    patterns.push({
      id: 'tir-goal-met',
      severity: 'success',
      title: `You reached your goal of ${targets.tirGoal}% time in range`,
      detail: `This period came to ${stats.timeInRange}%.`,
    });
  }

  // 7. The estimated A1C against the goal of the user.
  if (stats.estimatedA1c !== null && stats.estimatedA1c > targets.a1cGoal) {
    patterns.push({
      id: 'a1c-goal',
      severity: 'warning',
      title: `The estimated A1C of ${stats.estimatedA1c}% is above your goal of ${targets.a1cGoal}%`,
      detail: 'The estimate follows from the average of the period and is not a diagnosis.',
    });
  }

  return patterns;
}

/**
 * @param {number[]} values
 * @returns {number}
 */
function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/**
 * The insights of a period: how consistently the readings were recorded and what the numbers
 * show.
 *
 * @param {{ db: import('../../db/index.js').Database }} deps
 */
export function createInsightsService({ db }) {
  const readings = createReadingsReader(db);

  return {
    /**
     * @param {string} userId
     * @param {string} from `YYYY-MM-DD`
     * @param {string} to `YYYY-MM-DD`
     * @param {any} stats the report statistics of the same period
     * @param {any} targets
     */
    async build(userId, from, to, stats, targets) {
      const rows = await readings.list(userId, from, to);
      const adherence = buildAdherence(rows, from, to);
      const patterns = buildPatterns(rows, adherence, stats, targets);

      return {
        adherence,
        patterns,
      };
    },

    /**
     * The days on which every slot was filled in, for a small calendar.
     *
     * @param {string} userId
     * @param {string} from
     * @param {string} to
     */
    async calendar(userId, from, to) {
      const rows = await readings.list(userId, from, to);
      const days = {};

      for (const day of eachDay(from, to)) {
        days[day] = { date: day, slots: 0, values: [] };
      }

      for (const reading of rows) {
        const entry = days[reading.reading_date];
        if (entry) {
          entry.slots += 1;
          entry.values.push(reading.value);
        }
      }

      return Object.values(days);
    },
  };
}

export { buildAdherence, buildPatterns, eachDay };
