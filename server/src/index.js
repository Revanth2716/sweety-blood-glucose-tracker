import { loadConfig, loadEnvFiles } from './config.js';
import { createDatabase } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { createApp } from './app.js';

loadEnvFiles();

const config = loadConfig();
const db = await createDatabase(config.db);
const appliedMigrations = await runMigrations(db);

if (appliedMigrations.length > 0) {
  console.log(`Applied migrations: ${appliedMigrations.join(', ')}`);
}

const app = createApp({ db, config });

const server = app.listen(config.port, () => {
  console.log(`Sweety API is listening on http://localhost:${config.port} [database: ${db.mode}]`);
});

/**
 * Close the HTTP server and the database connection.
 *
 * @param {string} signal
 */
async function shutdown(signal) {
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
