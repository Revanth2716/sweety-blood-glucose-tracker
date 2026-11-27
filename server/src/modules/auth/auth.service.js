import bcrypt from 'bcryptjs';
import { conflict, notFound, unauthorized } from '../../lib/errors.js';
import { signToken } from '../../lib/jwt.js';
import { createAuthRepository } from './auth.repository.js';

/**
 * @param {any} row
 * @returns {{ id: string, name: string, email: string, role: string, createdAt: string | null }}
 */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? 'patient',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

/**
 * Business rules for registering, signing in and reading the current user.
 *
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createAuthService({ db, config }) {
  const users = createAuthRepository(db);

  // A hash of a throw-away password. Comparing against it when the email is unknown keeps the
  // response time of a failed login similar for existing and unknown accounts.
  const dummyHash = bcrypt.hash('sweety-timing-equalizer', config.bcryptRounds);

  return {
    /**
     * @param {{ name: string, email: string, password: string }} input
     */
    async register({ name, email, password }) {
      const existing = await users.findByEmail(email);
      if (existing) {
        throw conflict('An account with that email already exists.', 'email', 'EMAIL_TAKEN');
      }

      const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
      const user = await users.create({ name, email, passwordHash });

      return { user: toPublicUser(user), token: signToken(user, config) };
    },

    /**
     * @param {{ email: string, password: string }} input
     */
    async login({ email, password }) {
      const user = await users.findByEmail(email);

      // Compare against a dummy hash when the user does not exist so that the response time
      // does not reveal whether the email is registered.
      const passwordHash = user?.password_hash ?? (await dummyHash);
      const passwordMatches = await bcrypt.compare(password, passwordHash);

      if (!user || !passwordMatches) {
        throw unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
      }

      return { user: toPublicUser(user), token: signToken(user, config) };
    },

    /**
     * @param {string} id
     */
    async getUserById(id) {
      const user = await users.findById(id);
      if (!user) {
        throw notFound('User not found.');
      }
      return toPublicUser(user);
    },
  };
}
