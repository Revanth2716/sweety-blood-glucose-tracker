import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('pagination', () => {
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
    ({ token } = await registerUser(api, { email: 'pagination@example.com' }));

    // 25 readings spread over two months.
    const slots = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
    for (let index = 0; index < 25; index += 1) {
      const day = String(1 + (index % 7)).padStart(2, '0');
      const month = index < 14 ? '02' : '03';
      const response = await api
        .post('/api/readings')
        .set(bearer(token))
        .send({
          date: `2026-${month}-${day}`,
          slot: slots[index % 4],
          value: 100 + index,
        });
      expect(response.status).toBe(201);
    }
  });

  afterAll(async () => {
    await db.close();
  });

  it('defaults to the first page of 20 readings', async () => {
    const response = await api.get('/api/readings').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(20);
    expect(response.body.pagination).toEqual({ page: 1, limit: 20, total: 25, totalPages: 2 });
  });

  it('returns the requested page', async () => {
    const response = await api.get('/api/readings?page=2&limit=20').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(5);
    expect(response.body.pagination.page).toBe(2);
  });

  it('honours a custom limit', async () => {
    const response = await api.get('/api/readings?page=1&limit=5').set(bearer(token));

    expect(response.body.data).toHaveLength(5);
    expect(response.body.pagination).toEqual({ page: 1, limit: 5, total: 25, totalPages: 5 });
  });

  it('caps the limit at 100', async () => {
    const response = await api.get('/api/readings?limit=5000').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.pagination.limit).toBe(100);
  });

  it('rejects a page that is not a positive whole number', async () => {
    const response = await api.get('/api/readings?page=0').set(bearer(token));

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('The page must be a positive whole number.');
  });

  it('rejects a limit that is not a positive whole number', async () => {
    const response = await api.get('/api/readings?limit=abc').set(bearer(token));

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('The limit must be a positive whole number.');
  });

  it('filters the list by date', async () => {
    const response = await api.get('/api/readings?date=2026-02-01').set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data.every((reading) => reading.date === '2026-02-01')).toBe(true);
  });

  it('filters the list by a date range', async () => {
    const response = await api
      .get('/api/readings?from=2026-02-03&to=2026-02-05')
      .set(bearer(token));

    expect(response.status).toBe(200);
    expect(response.body.data.every((reading) => reading.date >= '2026-02-03')).toBe(true);
    expect(response.body.data.every((reading) => reading.date <= '2026-02-05')).toBe(true);
  });
});
