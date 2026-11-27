import { createUsersRepository } from '../users/users.repository.js';

/**
 * All SQL for the users table lives in the shared users repository.
 *
 * @param {import('../../db/index.js').Database} db
 */
export function createAuthRepository(db) {
  const users = createUsersRepository(db);

  return {
    findByEmail: (email) => users.findByEmail(email),
    findById: (id) => users.findById(id),
    create: (input) => users.create(input),
  };
}
