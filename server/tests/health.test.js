import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/testApp.js';

describe('health endpoint', () => {
  /** @type {import('supertest').Test} */
  let api;
  /** @type {import('../src/db/index.js').Database} */
  let db;

  beforeAll(async () => {
    const created = await createTestApp();
    db = created.db;
    api = request(created.app);
  });

  afterAll(async () => {
    await db.close();
  });

  it('reports that the API is up', async () => {
    const response = await api.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'pglite' });
  });

  it('returns a 404 in the error envelope for an unknown route', async () => {
    const response = await api.get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
