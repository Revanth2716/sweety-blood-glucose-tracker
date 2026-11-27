import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('reports', () => {
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
    ({ token } = await registerUser(api, { email: 'reports@example.com' }));
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * @param {string} date
   * @param {string} slot
   * @param {number} value
   */
  async function addReading(date, slot, value) {
    const response = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date, slot, value });
    expect(response.status).toBe(201);
  }

  describe('daily report', () => {
    it('returns the highest, lowest, average and count of the day', async () => {
      await addReading('2026-10-15', 'morning', 88);
      await addReading('2026-10-15', 'after_breakfast', 142);
      await addReading('2026-10-15', 'after_lunch', 116);

      const response = await api.get('/api/reports/daily?date=2026-10-15').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('daily');
      expect(response.body.range).toMatchObject({ from: '2026-10-15', to: '2026-10-15' });
      expect(response.body.range.label).toBe('15 Oct 2026');
      expect(response.body.stats).toEqual({ highest: 142, lowest: 88, average: 115.3, count: 3 });
    });

    it('lists every reading of the day with its slot', async () => {
      await addReading('2026-11-05', 'morning', 95);
      await addReading('2026-11-05', 'after_dinner', 128);

      const response = await api.get('/api/reports/daily?date=2026-11-05').set(bearer(token));

      expect(response.body.readings).toHaveLength(2);
      expect(response.body.readings[0]).toMatchObject({
        date: '2026-11-05',
        slot: 'morning',
        slotLabel: 'Morning (fasting)',
        value: 95,
      });
    });

    it('rounds the average to one decimal place', async () => {
      await addReading('2026-06-10', 'morning', 100);
      await addReading('2026-06-10', 'after_lunch', 101);
      await addReading('2026-06-10', 'after_dinner', 102);

      const response = await api.get('/api/reports/daily?date=2026-06-10').set(bearer(token));

      expect(response.body.stats.average).toBe(101);
    });

    it('shows an empty state when there are no readings', async () => {
      const response = await api.get('/api/reports/daily?date=2026-05-01').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.stats).toEqual({ highest: null, lowest: null, average: null, count: 0 });
      expect(response.body.readings).toEqual([]);
    });

    it('rejects an invalid date', async () => {
      const response = await api.get('/api/reports/daily?date=15-10-2026').set(bearer(token));

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Please enter a valid date.');
    });
  });

  describe('month to date report', () => {
    it('covers the first day of the month up to the selected date', async () => {
      await addReading('2026-04-01', 'morning', 100);
      await addReading('2026-04-15', 'morning', 120);

      const response = await api.get('/api/reports/month-to-date?date=2026-04-15').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('month-to-date');
      expect(response.body.range).toMatchObject({ from: '2026-04-01', to: '2026-04-15' });
      expect(response.body.range.label).toBe('1 Apr – 15 Apr 2026');
      expect(response.body.stats.count).toBe(2);
      expect(response.body.stats.average).toBe(110);
    });

    it('does not include readings after the selected date', async () => {
      await addReading('2026-03-20', 'morning', 200);

      const response = await api.get('/api/reports/month-to-date?date=2026-03-10').set(bearer(token));

      expect(response.body.stats.count).toBe(0);
    });
  });

  describe('monthly report', () => {
    it('covers the whole previous month', async () => {
      await addReading('2026-09-01', 'morning', 95);
      await addReading('2026-09-30', 'after_dinner', 135);

      const response = await api.get('/api/reports/monthly?date=2026-10-15').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.report).toBe('monthly');
      expect(response.body.range).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
      expect(response.body.range.label).toBe('1 Sep – 30 Sep 2026');
      expect(response.body.stats).toEqual({ highest: 135, lowest: 95, average: 115, count: 2 });
    });

    it('crosses the year boundary correctly', async () => {
      const response = await api.get('/api/reports/monthly?date=2026-01-15').set(bearer(token));

      expect(response.body.range).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    });
  });

  it('only counts the readings of the signed in user', async () => {
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
