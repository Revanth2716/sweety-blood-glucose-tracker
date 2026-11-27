import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('insights, the context of a reading and the export', () => {
  /** @type {import('supertest').Test} */
  let api;
  /** @type {import('../src/db/index.js').Database} */
  let db;
  let counter = 0;

  beforeAll(async () => {
    const created = await createTestApp();
    db = created.db;
    api = request(created.app);
  });

  afterAll(async () => {
    await db.close();
  });

  /**
   * @returns {Promise<string>}
   */
  async function createUser() {
    counter += 1;
    const { token } = await registerUser(api, { email: `insights-${counter}@example.com` });
    return token;
  }

  describe('the context of a reading', () => {
    it('keeps the note and the tags', async () => {
      const token = await createUser();

      const created = await api
        .post('/api/readings')
        .set(bearer(token))
        .send({
          date: '2026-10-15',
          slot: 'after_lunch',
          value: 155,
          notes: 'Pizza for lunch.',
          tags: ['late meal', 'exercise'],
        });

      expect(created.status).toBe(201);
      expect(created.body.reading.notes).toBe('Pizza for lunch.');
      expect(created.body.reading.tags).toEqual(['late meal', 'exercise']);
    });

    it('cleans up the tags and drops the unknown ones', async () => {
      const token = await createUser();

      const created = await api
        .post('/api/readings')
        .set(bearer(token))
        .send({
          date: '2026-10-16',
          slot: 'morning',
          value: 95,
          tags: ['Exercise', 'exercise', '  ', 'x'.repeat(40)],
        });

      expect(created.body.reading.tags).toEqual(['exercise']);
    });

    it('shortens a very long note', async () => {
      const token = await createUser();

      const created = await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-17', slot: 'morning', value: 95, notes: 'x'.repeat(400) });

      expect(created.body.reading.notes.length).toBe(280);
    });
  });

  describe('adherence', () => {
    it('counts how many slots were filled in', async () => {
      const token = await createUser();

      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'morning', value: 90 });
      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'after_lunch', value: 140 });

      const response = await api
        .get('/api/insights?from=2026-10-15&to=2026-10-15')
        .set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.adherence.days).toBe(1);
      expect(response.body.adherence.loggedSlots).toBe(2);
      expect(response.body.adherence.possibleSlots).toBe(4);
      expect(response.body.adherence.percent).toBe(50);
      expect(response.body.adherence.bySlot.morning.percent).toBe(100);
      expect(response.body.adherence.bySlot.after_dinner.percent).toBe(0);
    });

    it('counts the days in a row with a reading', async () => {
      const token = await createUser();

      for (const date of ['2026-10-13', '2026-10-14', '2026-10-15']) {
        await api
          .post('/api/readings')
          .set(bearer(token))
          .send({ date, slot: 'morning', value: 90 });
      }

      const response = await api
        .get('/api/insights?from=2026-10-13&to=2026-10-15')
        .set(bearer(token));

      expect(response.body.adherence.streak).toBe(3);
    });
  });

  describe('the patterns', () => {
    it('reports the readings below the safe limit', async () => {
      const token = await createUser();

      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'morning', value: 62 });

      const response = await api
        .get('/api/insights?from=2026-10-15&to=2026-10-15')
        .set(bearer(token));

      const pattern = response.body.patterns.find((entry) => entry.id === 'low-readings');
      expect(pattern).toBeDefined();
      expect(pattern.title).toContain('below 70 mg/dl');
      expect(pattern.detail).toContain('62 mg/dl');
    });

    it('compares the morning readings with the readings after a meal', async () => {
      const token = await createUser();

      for (const [date, morning, lunch] of [
        ['2026-10-15', 85, 165],
        ['2026-10-16', 90, 155],
        ['2026-10-17', 88, 150],
      ]) {
        await api
          .post('/api/readings')
          .set(bearer(token))
          .send({ date, slot: 'morning', value: morning });
        await api
          .post('/api/readings')
          .set(bearer(token))
          .send({ date, slot: 'after_lunch', value: lunch });
      }

      const response = await api
        .get('/api/insights?from=2026-10-15&to=2026-10-17')
        .set(bearer(token));

      const pattern = response.body.patterns.find((entry) => entry.id === 'meal-gap');
      expect(pattern).toBeDefined();
      expect(pattern.title).toContain('after a meal');
    });

    it('tells the user that the goal was reached', async () => {
      const token = await createUser();

      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'morning', value: 95 });
      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-15', slot: 'after_lunch', value: 120 });

      const response = await api
        .get('/api/insights?from=2026-10-15&to=2026-10-15')
        .set(bearer(token));

      const pattern = response.body.patterns.find((entry) => entry.id === 'tir-goal-met');
      expect(pattern).toBeDefined();
      expect(pattern.severity).toBe('success');
    });

    it('needs a token', async () => {
      const response = await api.get('/api/insights');

      expect(response.status).toBe(401);
    });
  });

  describe('the CSV export', () => {
    it('returns the readings of the user as a CSV file', async () => {
      const token = await createUser();

      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({
          date: '2026-10-15',
          slot: 'after_lunch',
          value: 155,
          notes: 'Pizza, with a note',
          tags: ['late meal'],
        });

      const response = await api
        .get('/api/readings.csv?from=2026-10-01&to=2026-10-31')
        .set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text.split('\n')[0]).toBe(
        'date,slot,value,status,target,notes,tags,recorded',
      );
      expect(response.text).toContain('2026-10-15');
      expect(response.text).toContain('After lunch');
      expect(response.text).toContain('"Pizza, with a note"');
    });

    it('only exports the readings of the signed in user', async () => {
      const token = await createUser();
      const other = await registerUser(api, { email: 'other-export@example.com' });

      await api
        .post('/api/readings')
        .set(bearer(other.token))
        .send({ date: '2026-10-15', slot: 'morning', value: 100 });

      const response = await api.get('/api/readings.csv').set(bearer(token));

      expect(response.text).not.toContain('2026-10-15');
    });

    it('needs a token', async () => {
      const response = await api.get('/api/readings.csv');

      expect(response.status).toBe(401);
    });
  });
});
