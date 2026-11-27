import bcrypt from 'bcryptjs';
import { loadConfig, loadEnvFiles } from '../config.js';
import { createDatabase } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { toISODate } from '../lib/dates.js';

const DEMO_EMAIL = 'demo@sweety.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Demo Patient';
const DAYS_OF_HISTORY = 60;

/** The four slots a day can contain. */
const ALL_SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

/**
 * A small deterministic random number generator, so that the seeded data is the same on every
 * machine. That makes the screenshots in the README reproducible.
 *
 * @param {number} seed
 * @returns {() => number} a function returning a number between 0 and 1
 */
function createRandom(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick the slots that have a reading on a given day: between two and four of them.
 *
 * @param {() => number} random
 * @returns {string[]}
 */
function pickSlots(random) {
  const count = 2 + Math.floor(random() * 3);
  const slots = [...ALL_SLOTS];

  for (let index = slots.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    [slots[index], slots[swapWith]] = [slots[swapWith], slots[index]];
  }

  return slots
    .slice(0, count)
    .sort((left, right) => ALL_SLOTS.indexOf(left) - ALL_SLOTS.indexOf(right));
}

/**
 * Pick a realistic glucose value for a slot, in mg/dl.
 *
 * @param {() => number} random
 * @param {string} slot
 * @returns {number}
 */
function pickValue(random, slot) {
  const ranges = {
    morning: [72, 108],
    after_breakfast: [95, 145],
    after_lunch: [100, 160],
    after_dinner: [100, 150],
  };
  const [low, high] = ranges[slot];
  return Math.round(low + random() * (high - low));
}

async function main() {
  loadEnvFiles();
  const config = loadConfig();
  const db = await createDatabase(config.db);

  try {
    await runMigrations(db);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, config.bcryptRounds);
    const existing = await db.getQuery('SELECT id FROM users WHERE lower(email) = lower($1)', [
      DEMO_EMAIL,
    ]);

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await db.getQuery('UPDATE users SET name = $2, password_hash = $3 WHERE id = $1', [
        userId,
        DEMO_NAME,
        passwordHash,
      ]);
      await db.getQuery('DELETE FROM readings WHERE user_id = $1', [userId]);
    } else {
      const created = await db.getQuery(
        `INSERT INTO users (name, email, password_hash)
              VALUES ($1, $2, $3)
           RETURNING id`,
        [DEMO_NAME, DEMO_EMAIL, passwordHash],
      );
      userId = created.rows[0].id;
    }

    const random = createRandom(20261015);
    const readings = [];

    for (let daysAgo = DAYS_OF_HISTORY - 1; daysAgo >= 0; daysAgo -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const isoDate = toISODate(date);

      for (const slot of pickSlots(random)) {
        readings.push({ date: isoDate, slot, value: pickValue(random, slot) });
      }
    }

    for (const reading of readings) {
      await db.getQuery(
        `INSERT INTO readings (user_id, reading_date, slot, value)
              VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [userId, reading.date, reading.slot, reading.value],
      );
    }

    console.log('Seed complete.');
    console.log(`  Demo user : ${DEMO_EMAIL}`);
    console.log(`  Password  : ${DEMO_PASSWORD}`);
    console.log(`  Readings  : ${readings.length} over the last ${DAYS_OF_HISTORY} days`);
  } finally {
    await db.close();
  }
}

await main();
