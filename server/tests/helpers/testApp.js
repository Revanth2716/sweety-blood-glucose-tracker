import { createDatabase } from '../../src/db/index.js';
import { runMigrations } from '../../src/db/migrate.js';
import { createApp } from '../../src/app.js';

/**
 * Build an Express app backed by a fresh in-memory PGlite database.
 *
 * Every test file gets its own database, so the tests never share state and never need a
 * PostgreSQL server.
 */
export async function createTestApp() {
  const db = await createDatabase({ mode: 'pglite', pgliteDataDir: 'memory://' });
  await runMigrations(db);

  const config = {
    nodeEnv: 'test',
    clientOrigins: ['http://localhost:5173'],
    jwtSecret: 'test-secret-value-for-sweety-tests',
    jwtExpiresIn: '1h',
    // A low cost factor keeps the tests fast. The hash format stays identical.
    bcryptRounds: 4,
    rateLimitMax: 10000,
  };

  const app = createApp({ db, config });

  return { app, db, config };
}

/**
 * Register a user and return the created account together with its access token.
 *
 * @param {import('supertest').Test} request a supertest instance bound to the app
 * @param {{ name?: string, email?: string, password?: string }} [overrides]
 */
export async function registerUser(request, overrides = {}) {
  const payload = {
    name: 'Test Patient',
    email: 'patient@example.com',
    password: 'supersecret',
    ...overrides,
  };

  const response = await request.post('/api/auth/register').send(payload);

  return {
    response,
    user: response.body.user,
    token: response.body.token,
    password: payload.password,
  };
}

/**
 * The Authorization header for a token.
 *
 * @param {string} token
 * @returns {{ Authorization: string }}
 */
export function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Register a user and turn the account into a doctor.
 *
 * The public registration always creates a patient, so the role is set directly in the database.
 *
 * @param {import('supertest').Test} request
 * @param {import('../../src/db/index.js').Database} db
 * @param {{ name?: string, email?: string, password?: string }} [overrides]
 */
export async function registerDoctor(request, db, overrides = {}) {
  const { user, token } = await registerUser(request, {
    name: 'Dr Chen',
    email: 'doctor@example.com',
    ...overrides,
  });

  await db.getQuery('UPDATE users SET role = $2 WHERE id = $1', [user.id, 'doctor']);

  return { user: { ...user, role: 'doctor' }, token };
}
