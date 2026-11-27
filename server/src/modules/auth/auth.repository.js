/**
 * All SQL for the users table lives here.
 *
 * @param {import('../../db/index.js').Database} db
 */
export function createUsersRepository(db) {
  return {
    /**
     * @param {string} email
     * @returns {Promise<any | null>}
     */
    async findByEmail(email) {
      const { rows } = await db.getQuery(
        `SELECT id, name, email, password_hash, created_at
           FROM users
          WHERE lower(email) = lower($1)`,
        [email],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {string} id
     * @returns {Promise<any | null>}
     */
    async findById(id) {
      const { rows } = await db.getQuery(
        `SELECT id, name, email, created_at
           FROM users
          WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    /**
     * @param {{ name: string, email: string, passwordHash: string }} input
     * @returns {Promise<any>}
     */
    async create({ name, email, passwordHash }) {
      const { rows } = await db.getQuery(
        `INSERT INTO users (name, email, password_hash)
              VALUES ($1, $2, $3)
           RETURNING id, name, email, created_at`,
        [name, email, passwordHash],
      );
      return rows[0];
    },
  };
}
