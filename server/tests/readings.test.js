import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('readings CRUD', () => {
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
    ({ token } = await registerUser(api, { email: 'crud@example.com' }));
  });

  afterAll(async () => {
    await db.close();
  });

  it('creates a reading and returns the stored values', async () => {
    const response = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-15', slot: 'after_breakfast', value: 118 });

    expect(response.status).toBe(201);
    expect(response.body.reading).toMatchObject({
      date: '2026-10-15',
      slot: 'after_breakfast',
      slotLabel: 'After breakfast',
      value: 118,
    });
    expect(response.body.reading.id).toBeTruthy();
  });

  it('lists the readings of the user with the slot order of the day', async () => {
    for (const [slot, value] of [
      ['morning', 90],
      ['after_lunch', 140],
      ['after_breakfast', 110],
    ]) {
      await api
        .post('/api/readings')
        .set(bearer(token))
        .send({ date: '2026-10-20', slot, value });
    }

    const response = await api.get('/api/readings?date=2026-10-20').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data.map((reading) => reading.slot)).toEqual([
      'morning',
      'after_breakfast',
      'after_lunch',
    ]);
  });

  it('returns a single reading', async () => {
    const created = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-16', slot: 'morning', value: 95 });

    const response = await api.get(`/api/readings/${created.body.reading.id}`).set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.reading.value).toBe(95);
  });

  it('returns 404 for a reading that does not exist', async () => {
    const response = await api
      .get('/api/readings/2b1a9d1e-0000-4000-8000-000000000000')
      .set(bearer(token));

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Reading not found.');
  });

  it('updates a reading', async () => {
    const created = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-17', slot: 'morning', value: 95 });

    const response = await api
      .put(`/api/readings/${created.body.reading.id}`)
      .set(bearer(token))
      .send({ date: '2026-10-17', slot: 'morning', value: 88 });

    expect(response.status).toBe(200);
    expect(response.body.reading.value).toBe(88);
  });

  it('lets a reading keep its own slot when it is edited', async () => {
    const created = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-18', slot: 'morning', value: 95 });

    const response = await api
      .put(`/api/readings/${created.body.reading.id}`)
      .set(bearer(token))
      .send({ date: '2026-10-18', slot: 'morning', value: 101 });

    expect(response.status).toBe(200);
    expect(response.body.reading.value).toBe(101);
  });

  it('rejects an edit that moves a reading onto a slot that is already taken', async () => {
    await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-19', slot: 'morning', value: 95 });

    const lunch = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-19', slot: 'after_lunch', value: 140 });

    const response = await api
      .put(`/api/readings/${lunch.body.reading.id}`)
      .set(bearer(token))
      .send({ date: '2026-10-19', slot: 'morning', value: 140 });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe('You already have a Morning (fasting) reading for this date.');
  });

  it('moves a reading to another date', async () => {
    const created = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-21', slot: 'after_dinner', value: 130 });

    const response = await api
      .put(`/api/readings/${created.body.reading.id}`)
      .set(bearer(token))
      .send({ date: '2026-10-22', slot: 'after_dinner', value: 132 });

    expect(response.status).toBe(200);
    expect(response.body.reading.date).toBe('2026-10-22');
  });

  it('deletes a reading', async () => {
    const created = await api
      .post('/api/readings')
      .set(bearer(token))
      .send({ date: '2026-10-23', slot: 'morning', value: 95 });

    const response = await api
      .delete(`/api/readings/${created.body.reading.id}`)
      .set(bearer(token));

    expect(response.status).toBe(204);

    const afterwards = await api.get('/api/readings?date=2026-10-23').set(bearer(token));
    expect(afterwards.body.data).toHaveLength(0);
  });

  it('requires a token for every readings endpoint', async () => {
    const response = await api.get('/api/readings');

    expect(response.status).toBe(401);
  });
});
