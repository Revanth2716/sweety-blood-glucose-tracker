import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

/** A date in the past, so it is always accepted by the API. */
const PAST_DATE = '2026-10-15';

/** A date in the future, relative to the day the tests run. */
function futureDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

describe('reading validation', () => {
  /** @type {import('supertest').Test} */
  let api;
  /** @type {import('../src/db/index.js').Database} */
  let db;
  /** @type {string} */
  let token;

  beforeAll(async () => {
    const created = await createTestApp();
    db = created.db;
    api = request(created.app);
    ({ token } = await registerUser(api, { email: 'validation@example.com' }));
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * @param {Record<string, unknown>} body
   */
  async function create(body) {
    return api.post('/api/readings').set(bearer(token)).send(body);
  }

  it('requires a value', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Please enter a glucose value.');
    expect(response.body.error.field).toBe('value');
  });

  it('rejects an empty value', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning', value: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Please enter a glucose value.');
  });

  it('rejects a value below 40 mg/dl', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning', value: 39 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects a value above 600 mg/dl', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning', value: 601 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects a value that is not a whole number', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning', value: 100.5 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('rejects a value that is not a number', async () => {
    const response = await create({ date: PAST_DATE, slot: 'morning', value: 'high' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it('accepts the boundary values 40 and 600', async () => {
    const low = await create({ date: '2026-10-01', slot: 'morning', value: 40 });
    const high = await create({ date: '2026-10-02', slot: 'morning', value: 600 });

    expect(low.status).toBe(201);
    expect(low.body.reading.value).toBe(40);
    expect(high.status).toBe(201);
    expect(high.body.reading.value).toBe(600);
  });

  it('rejects a date in the future', async () => {
    const response = await create({ date: futureDate(), slot: 'morning', value: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Date cannot be in the future.');
    expect(response.body.error.field).toBe('date');
  });

  it('rejects a malformed date', async () => {
    const response = await create({ date: '15-10-2026', slot: 'morning', value: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Please enter a valid date.');
  });

  it('rejects a date that does not exist', async () => {
    const response = await create({ date: '2026-02-30', slot: 'morning', value: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Please enter a valid date.');
  });

  it('rejects an unknown time slot', async () => {
    const response = await create({ date: PAST_DATE, slot: 'before_bedtime', value: 100 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Please choose a valid time slot.');
  });

  it('rejects a second reading for the same slot on the same date', async () => {
    const first = await create({ date: '2026-09-10', slot: 'after_lunch', value: 120 });
    expect(first.status).toBe(201);

    const second = await create({ date: '2026-09-10', slot: 'after_lunch', value: 130 });

    expect(second.status).toBe(409);
    expect(second.body.error.message).toBe(
      'You already have an After lunch reading for this date.',
    );
    expect(second.body.error.field).toBe('slot');
  });

  it('rejects a fifth reading on the same date', async () => {
    const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
    for (const slot of slots) {
      const response = await create({ date: '2026-08-10', slot, value: 100 });
      expect(response.status).toBe(201);
    }

    const fifth = await create({ date: '2026-08-10', slot: 'morning', value: 100 });

    expect(fifth.status).toBe(400);
    expect(fifth.body.error.message).toBe('You can add only 4 readings per day.');
  });

  it('applies the same rules when a reading is edited', async () => {
    const created = await create({ date: '2026-07-10', slot: 'morning', value: 100 });
    const readingId = created.body.reading.id;

    const noValue = await api
      .put(`/api/readings/${readingId}`)
      .set(bearer(token))
      .send({ date: '2026-07-10', slot: 'morning' });

    expect(noValue.status).toBe(400);
    expect(noValue.body.error.message).toBe('Please enter a glucose value.');

    const outOfRange = await api
      .put(`/api/readings/${readingId}`)
      .set(bearer(token))
      .send({ date: '2026-07-10', slot: 'morning', value: 700 });

    expect(outOfRange.status).toBe(400);
    expect(outOfRange.body.error.message).toBe('Value must be between 40 and 600 mg/dl.');
  });
});
