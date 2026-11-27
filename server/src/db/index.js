import path from 'node:path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { serverRoot } from '../config.js';

/**
 * @typedef {object} Database
 * @property {'pglite' | 'postgres'} mode
 * @property {(text: string, params?: unknown[]) => Promise<{ rows: any[] }>} getQuery
 * @property {(text: string) => Promise<void>} exec
 * @property {(fn: (tx: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> }) => Promise<any>) => Promise<any>} transaction
 * @property {() => Promise<void>} close
 */

/**
 * Create the database adapter.
 *
 * The whole application talks to the database through this small interface so the exact same
 * SQL runs against an embedded PGlite database (development and tests) and against a real
 * PostgreSQL server (production / Docker).
 *
 * @param {{ mode: 'pglite' | 'postgres', connectionString?: string, pgliteDataDir?: string }} options
 * @returns {Promise<Database>}
 */
export async function createDatabase({ mode, connectionString, pgliteDataDir }) {
  if (mode === 'postgres') {
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when DB_MODE is "postgres".');
    }
    return createPostgresDatabase(connectionString);
  }
  return createPgliteDatabase(pgliteDataDir);
}

/**
 * Adapter for a real PostgreSQL server, using the `pg` connection pool.
 *
 * @param {string} connectionString
 * @returns {Database}
 */
function createPostgresDatabase(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10 });

  return {
    mode: 'postgres',
    async getQuery(text, params = []) {
      return pool.query(text, params);
    },
    async exec(text) {
      // node-postgres uses the simple query protocol when no parameters are bound, which allows
      // several statements (for example a migration file) to run in one call.
      await pool.query(text);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({
          query: async (text, params = []) => client.query(text, params),
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

/**
 * Adapter for the embedded PGlite database (PostgreSQL compiled to WebAssembly).
 *
 * @param {string} [pgliteDataDir]
 * @returns {Promise<Database>}
 */
async function createPgliteDatabase(pgliteDataDir) {
  const dataDir = resolvePgliteDataDir(pgliteDataDir);
  const client = await PGlite.create(dataDir);

  return {
    mode: 'pglite',
    async getQuery(text, params = []) {
      return client.query(text, params);
    },
    async exec(text) {
      await client.exec(text);
    },
    async transaction(fn) {
      return client.transaction(fn);
    },
    async close() {
      await client.close();
    },
  };
}

/**
 * Turn the configured data directory into an absolute path.
 *
 * `memory://` is kept as-is: it asks PGlite for a throw-away in-memory database.
 *
 * @param {string} [pgliteDataDir]
 * @returns {string}
 */
function resolvePgliteDataDir(pgliteDataDir) {
  if (!pgliteDataDir || pgliteDataDir === 'memory://') {
    return 'memory://';
  }
  if (path.isAbsolute(pgliteDataDir)) {
    return pgliteDataDir;
  }
  return path.resolve(serverRoot, pgliteDataDir);
}
