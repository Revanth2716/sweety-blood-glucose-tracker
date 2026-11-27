import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('reports', () => {
  /** @type {import('supertest').Test} */
  let api;
  /** @type {import('../src/db/index.js').Database} */
  let db;
  let userCounter = 0;

  beforeAll(async () => {
    const created = await createTestApp();
    db = created.db;
    api = request(created.app);
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * Every test gets its own account, so that the readings of one test cannot influence
   * another one.
   *
   * @returns {Promise<string>} the access token of the new account
   */
  async function createUser() {
    userCounter += 1;
    const { token } = await registerUser(api, { email: `report-${userCounter}@example.com` });
    return token;
  }

  /**
   * @param {string} token
   * @param {string} date
   * @param {string} slot
   * @param {number} value
   */
  async function addReading(token, date, slot, value) {
    const response = await api.post('/api/readings').set(bearer(token)).send({ date, slot, value });
    expect(response.status).toBe(201);
  }

  describe('daily report', () => {
    it('returns the highest, lowest, average and count of the day', async () => {
      const token = await createUser();
      await addReading(token, '2026-10-15', 'morning', 88);
      await addReading(token, '2026-10-15', 'after_breakfast', 142);
      await addReading(token, '2026-10-15', 'after_lunch', 116);

      const response = await api.get('/api/reports/daily?date=2026-10-15').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('daily');
      expect(response.body.range).toMatchObject({ from: '2026-10-15', to: '2026-10-15' });
      expect(response.body.range.label).toBe('15 Oct 2026');
      expect(response.body.stats).toMatchObject({
        highest: 142,
        lowest: 88,
        average: 115.3,
        count: 3,
      });
    });

    it('lists every reading of the day with its slot', async () => {
      const token = await createUser();
      await addReading(token, '2026-11-05', 'morning', 95);
      await addReading(token, '2026-11-05', 'after_dinner', 128);

      const response = await api.get('/api/reports/daily?date=2026-11-05').set(bearer(token));

      expect(response.body.readings).toHaveLength(2);
      expect(response.body.readings[0]).toMatchObject({
        date: '2026-11-05',
        slot: 'morning',
        slotLabel: 'Morning (fasting)',
        value: 95,
        status: 'in-range',
        statusLabel: 'In range',
      });
    });

    it('rounds the average to one decimal place', async () => {
      const token = await createUser();
      await addReading(token, '2026-06-10', 'morning', 100);
      await addReading(token, '2026-06-10', 'after_lunch', 101);
      await addReading(token, '2026-06-10', 'after_dinner', 102);

      const response = await api.get('/api/reports/daily?date=2026-06-10').set(bearer(token));

      expect(response.body.stats.average).toBe(101);
    });

    it('shows an empty state when there are no readings', async () => {
      const token = await createUser();
      const response = await api.get('/api/reports/daily?date=2026-05-01').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.stats).toMatchObject({
        highest: null,
        lowest: null,
        average: null,
        count: 0,
        timeInRange: null,
        estimatedA1c: null,
      });
      expect(response.body.readings).toEqual([]);
    });

    it('rejects an invalid date', async () => {
      const token = await createUser();
      const response = await api.get('/api/reports/daily?date=15-10-2026').set(bearer(token));

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Please enter a valid date.');
    });
  });

  describe('time in range', () => {
    it('counts the readings inside, below and above the 70-180 band', async () => {
      const token = await createUser();
      await addReading(token, '2026-07-01', 'morning', 65); // below
      await addReading(token, '2026-07-01', 'after_breakfast', 120); // inside
      await addReading(token, '2026-07-01', 'after_lunch', 190); // above
      await addReading(token, '2026-07-01', 'after_dinner', 140); // inside

      const response = await api.get('/api/reports/daily?date=2026-07-01').set(bearer(token));

      expect(response.body.stats.count).toBe(4);
      expect(response.body.stats.inRange).toBe(2);
      expect(response.body.stats.belowRange).toBe(1);
      expect(response.body.stats.aboveRange).toBe(1);
      expect(response.body.stats.timeInRange).toBe(50);
    });

    it('reports 100 percent when every reading is in range', async () => {
      const token = await createUser();
      await addReading(token, '2026-07-02', 'morning', 100);
      await addReading(token, '2026-07-02', 'after_lunch', 130);

      const response = await api.get('/api/reports/daily?date=2026-07-02').set(bearer(token));

      expect(response.body.stats.timeInRange).toBe(100);
    });
  });

  describe('reading status', () => {
    it('marks a fasting reading above 130 as high', async () => {
      const token = await createUser();
      await addReading(token, '2026-07-03', 'morning', 145);

      const response = await api.get('/api/reports/daily?date=2026-07-03').set(bearer(token));

      expect(response.body.readings[0].status).toBe('high');
      expect(response.body.readings[0].statusLabel).toBe('High');
      expect(response.body.readings[0].target).toMatchObject({ min: 70, max: 130 });
    });

    it('marks a reading below 70 as low', async () => {
      const token = await createUser();
      await addReading(token, '2026-07-04', 'after_lunch', 60);

      const response = await api.get('/api/reports/daily?date=2026-07-04').set(bearer(token));

      expect(response.body.readings[0].status).toBe('low');
      expect(response.body.readings[0].statusLabel).toBe('Low');
    });

    it('keeps a reading of 140 after a meal in range', async () => {
      const token = await createUser();
      await addReading(token, '2026-07-05', 'after_lunch', 140);

      const response = await api.get('/api/reports/daily?date=2026-07-05').set(bearer(token));

      expect(response.body.readings[0].status).toBe('in-range');
      expect(response.body.readings[0].target).toMatchObject({ min: 70, max: 180 });
    });
  });

  describe('estimated A1C', () => {
    it('estimates the A1C from the average when there are enough readings', async () => {
      const token = await createUser();
      await addReading(token, '2026-08-01', 'morning', 100);
      await addReading(token, '2026-08-02', 'morning', 120);
      await addReading(token, '2026-08-03', 'morning', 140);

      const response = await api.get('/api/reports/monthly?date=2026-09-15').set(bearer(token));

      expect(response.body.stats.average).toBe(120);
      expect(response.body.stats.estimatedA1c).toBe(5.8);
    });

    it('does not estimate the A1C with fewer than three readings', async () => {
      const token = await createUser();
      await addReading(token, '2026-08-10', 'morning', 100);
      await addReading(token, '2026-08-11', 'morning', 120);

      const response = await api.get('/api/reports/monthly?date=2026-09-15').set(bearer(token));

      expect(response.body.stats.estimatedA1c).toBeNull();
    });
  });

  describe('trend', () => {
    it('compares a day with the day before it', async () => {
      const token = await createUser();
      await addReading(token, '2026-02-10', 'morning', 100);
      await addReading(token, '2026-02-10', 'after_lunch', 120);
      await addReading(token, '2026-02-11', 'morning', 120);
      await addReading(token, '2026-02-11', 'after_lunch', 160);

      const response = await api.get('/api/reports/daily?date=2026-02-11').set(bearer(token));

      expect(response.body.previousRange).toMatchObject({ from: '2026-02-10', to: '2026-02-10' });
      expect(response.body.trend.average.current).toBe(140);
      expect(response.body.trend.average.previous).toBe(110);
      expect(response.body.trend.average.change).toBe(30);
      expect(response.body.trend.average.direction).toBe('up');
    });

    it('compares a month with the month before it', async () => {
      const token = await createUser();
      await addReading(token, '2026-01-10', 'morning', 100);
      await addReading(token, '2026-02-10', 'morning', 130);

      const response = await api.get('/api/reports/monthly?date=2026-03-15').set(bearer(token));

      expect(response.body.range).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
      expect(response.body.previousRange).toMatchObject({ from: '2026-01-01', to: '2026-01-31' });
      expect(response.body.trend.average.current).toBe(130);
      expect(response.body.trend.average.previous).toBe(100);
      expect(response.body.trend.average.changePercent).toBe(30);
    });

    it('reports no trend when the previous period has no readings', async () => {
      const token = await createUser();
      await addReading(token, '2026-06-10', 'morning', 100);

      const response = await api.get('/api/reports/monthly?date=2026-07-15').set(bearer(token));

      expect(response.body.trend.average.current).toBe(100);
      expect(response.body.trend.average.previous).toBeNull();
      expect(response.body.trend.average.change).toBeNull();
      expect(response.body.trend.average.direction).toBeNull();
    });
  });

  describe('month to date report', () => {
    it('covers the first day of the month up to the selected date', async () => {
      const token = await createUser();
      await addReading(token, '2026-04-01', 'morning', 100);
      await addReading(token, '2026-04-15', 'morning', 120);

      const response = await api
        .get('/api/reports/month-to-date?date=2026-04-15')
        .set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('month-to-date');
      expect(response.body.range).toMatchObject({ from: '2026-04-01', to: '2026-04-15' });
      expect(response.body.range.label).toBe('1 Apr – 15 Apr 2026');
      expect(response.body.stats.count).toBe(2);
      expect(response.body.stats.average).toBe(110);
    });

    it('does not include readings after the selected date', async () => {
      const token = await createUser();
      await addReading(token, '2026-03-20', 'morning', 200);

      const response = await api
        .get('/api/reports/month-to-date?date=2026-03-10')
        .set(bearer(token));

      expect(response.body.stats.count).toBe(0);
    });

    it('compares with the same part of the previous month', async () => {
      const token = await createUser();
      await addReading(token, '2026-03-01', 'morning', 100);
      await addReading(token, '2026-03-05', 'morning', 120);
      await addReading(token, '2026-04-01', 'morning', 200);
      await addReading(token, '2026-04-05', 'morning', 200);

      const response = await api
        .get('/api/reports/month-to-date?date=2026-04-05')
        .set(bearer(token));

      expect(response.body.previousRange).toMatchObject({ from: '2026-03-01', to: '2026-03-05' });
      expect(response.body.trend.average.current).toBe(200);
      expect(response.body.trend.average.previous).toBe(110);
    });
  });

  describe('monthly report', () => {
    it('covers the whole previous month', async () => {
      const token = await createUser();
      await addReading(token, '2026-09-01', 'morning', 95);
      await addReading(token, '2026-09-30', 'after_dinner', 135);

      const response = await api.get('/api/reports/monthly?date=2026-10-15').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('monthly');
      expect(response.body.range).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
      expect(response.body.range.label).toBe('1 Sep – 30 Sep 2026');
      expect(response.body.stats).toMatchObject({
        highest: 135,
        lowest: 95,
        average: 115,
        count: 2,
      });
    });

    it('crosses the year boundary correctly', async () => {
      const token = await createUser();
      const response = await api.get('/api/reports/monthly?date=2026-01-15').set(bearer(token));

      expect(response.body.range).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    });
  });

  describe('per slot breakdown', () => {
    it('returns the average of every slot of the period', async () => {
      const token = await createUser();
      await addReading(token, '2026-05-01', 'morning', 90);
      await addReading(token, '2026-05-02', 'morning', 110);
      await addReading(token, '2026-05-01', 'after_lunch', 150);

      const response = await api.get('/api/reports/daily?date=2026-05-01').set(bearer(token));

      const morning = response.body.slots.find((entry) => entry.slot === 'morning');
      const lunch = response.body.slots.find((entry) => entry.slot === 'after_lunch');

      expect(morning).toMatchObject({ slotLabel: 'Morning (fasting)', count: 1, average: 90 });
      expect(lunch).toMatchObject({ slotLabel: 'After lunch', count: 1, average: 150 });
      expect(morning.target).toMatchObject({ max: 130 });
    });
  });

  it('only counts the readings of the signed in user', async () => {
    const token = await createUser();
    const other = await registerUser(api, { email: 'other-reports@example.com' });
    await api
      .post('/api/readings')
      .set(bearer(other.token))
      .send({ date: '2026-03-10', slot: 'morning', value: 300 });

    const response = await api.get('/api/reports/daily?date=2026-03-10').set(bearer(token));

    expect(response.body.stats.count).toBe(0);
    expect(response.body.readings).toEqual([]);
  });

  it('requires a token', async () => {
    const response = await api.get('/api/reports/daily');

    expect(response.status).toBe(401);
  });
});
