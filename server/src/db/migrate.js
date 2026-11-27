import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from '../config.js';
import { createDatabase } from './index.js';

const migrationsDir = path.join(import.meta.dirname, 'migrations');

/**
 * Apply every migration that has not been applied yet.
 *
 * @param {import('./index.js').Database} db
 * @returns {Promise<string[]>} the names of the migrations that were applied
 */
export async function runMigrations(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  const applied = [];

  for (const file of files) {
    const { rows } = await db.getQuery('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await db.exec(sql);
    await db.getQuery('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    applied.push(file);
  }

  return applied;
}

// Allow `npm run migrate` to run this file directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = loadConfig();
  const db = await createDatabase(config.db);
  try {
    const applied = await runMigrations(db);
    console.log(
      applied.length > 0
        ? `Applied migrations: ${applied.join(', ')}`
        : 'Database is already up to date.',
    );
  } finally {
    await db.close();
  }
}
