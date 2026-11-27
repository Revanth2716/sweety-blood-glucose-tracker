import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, createTestApp, registerUser } from './helpers/testApp.js';

describe('auth', () => {
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

  describe('register', () => {
    it('creates an account and returns a token', async () => {
      const response = await api.post('/api/auth/register').send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'supersecret',
      });

      expect(response.status).toBe(201);
      expect(response.body.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
      expect(response.body.user.id).toBeTruthy();
      expect(response.body.token).toBeTruthy();
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('stores the password as a bcrypt hash, never as plain text', async () => {
      await registerUser(api, { email: 'hash@example.com', password: 'plaintextpassword' });

      const { rows } = await db.getQuery('SELECT password_hash FROM users WHERE email = $1', [
        'hash@example.com',
      ]);

      expect(rows).toHaveLength(1);
      expect(rows[0].password_hash).not.toBe('plaintextpassword');
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('rejects an email that is already registered', async () => {
      await registerUser(api, { email: 'taken@example.com' });

      const response = await api.post('/api/auth/register').send({
        name: 'Someone Else',
        email: 'taken@example.com',
        password: 'supersecret',
      });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toBe('An account with that email already exists.');
    });

    it('treats email addresses case insensitively', async () => {
      await registerUser(api, { email: 'case@example.com' });

      const response = await api.post('/api/auth/register').send({
        name: 'Someone Else',
        email: 'CASE@example.com',
        password: 'supersecret',
      });

      expect(response.status).toBe(409);
    });

    it('rejects an invalid email address', async () => {
      const response = await api
        .post('/api/auth/register')
        .send({ name: 'No Mail', email: 'not-an-email', password: 'supersecret' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Please enter a valid email address.');
    });

    it('rejects a password that is too short', async () => {
      const response = await api
        .post('/api/auth/register')
        .send({ name: 'Short Password', email: 'short@example.com', password: 'abc' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Password must be at least 8 characters long.');
    });

    it('rejects a missing name', async () => {
      const response = await api
        .post('/api/auth/register')
        .send({ email: 'nameless@example.com', password: 'supersecret' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Please enter your name.');
    });
  });

  describe('login', () => {
    it('returns a token for the right credentials', async () => {
      const { user } = await registerUser(api, { email: 'login@example.com' });

      const response = await api
        .post('/api/auth/login')
        .send({ email: user.email, password: 'supersecret' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('rejects a wrong password', async () => {
      await registerUser(api, { email: 'wrongpass@example.com' });

      const response = await api
        .post('/api/auth/login')
        .send({ email: 'wrongpass@example.com', password: 'not-the-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid email or password.');
    });

    it('rejects an unknown email with the same message', async () => {
      const response = await api
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'supersecret' });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid email or password.');
    });
  });

  describe('current user', () => {
    it('returns the signed in user', async () => {
      const { user, token } = await registerUser(api, { email: 'me@example.com' });

      const response = await api.get('/api/auth/me').set(bearer(token));

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(user.id);
      expect(response.body.user.email).toBe('me@example.com');
    });

    it('rejects a request without a token', async () => {
      const response = await api.get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Authentication required.');
    });

    it('rejects a request with an invalid token', async () => {
      const response = await api.get('/api/auth/me').set(bearer('not.a.real.token'));

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('data isolation', () => {
    it('does not let one user read, update or delete another user\'s reading', async () => {
      const owner = await registerUser(api, { email: 'owner@example.com' });
      const stranger = await registerUser(api, { email: 'stranger@example.com' });

      const created = await api
        .post('/api/readings')
        .set(bearer(owner.token))
        .send({ date: '2026-10-15', slot: 'morning', value: 95 });

      expect(created.status).toBe(201);
      const readingId = created.body.reading.id;

      const list = await api.get('/api/readings').set(bearer(stranger.token));
      expect(list.body.data).toHaveLength(0);

      const read = await api.get(`/api/readings/${readingId}`).set(bearer(stranger.token));
      expect(read.status).toBe(404);

      const update = await api
        .put(`/api/readings/${readingId}`)
        .set(bearer(stranger.token))
        .send({ date: '2026-10-15', slot: 'morning', value: 300 });
      expect(update.status).toBe(404);

      const remove = await api.delete(`/api/readings/${readingId}`).set(bearer(stranger.token));
      expect(remove.status).toBe(404);

      // The reading is untouched.
      const stillThere = await api.get(`/api/readings/${readingId}`).set(bearer(owner.token));
      expect(stillThere.status).toBe(200);
      expect(stillThere.body.reading.value).toBe(95);
    });
  });
});
