import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

export const serverRoot = path.resolve(import.meta.dirname, '..');
export const repoRoot = path.resolve(import.meta.dirname, '..', '..');

/**
 * Load the .env files.
 *
 * The repository root is loaded first, so `/.env` wins over `server/.env`
 * (dotenv never overwrites a variable that is already set).
 */
export function loadEnvFiles() {
  dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });
  dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  DB_MODE: z.enum(['pglite', 'postgres']).optional(),
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().default('./.pglite'),
});

/**
 * Validate the environment and return the typed configuration.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   nodeEnv: string,
 *   port: number,
 *   clientOrigins: string[],
 *   jwtSecret: string,
 *   jwtExpiresIn: string,
 *   bcryptRounds: number,
 *   rateLimitMax: number,
 *   db: { mode: 'pglite' | 'postgres', connectionString?: string, pgliteDataDir: string }
 * }}
 */
export function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration:\n${details}\n\n` +
        'Copy .env.example to .env in the repository root and fill in the values.',
    );
  }

  const raw = result.data;
  const mode = raw.DB_MODE ?? (raw.DATABASE_URL ? 'postgres' : 'pglite');

  return {
    nodeEnv: raw.NODE_ENV,
    port: raw.PORT,
    clientOrigins: raw.CLIENT_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jwtSecret: raw.JWT_SECRET,
    jwtExpiresIn: raw.JWT_EXPIRES_IN,
    bcryptRounds: raw.BCRYPT_ROUNDS,
    rateLimitMax: raw.RATE_LIMIT_MAX,
    db: {
      mode,
      connectionString: raw.DATABASE_URL,
      pgliteDataDir: raw.PGLITE_DATA_DIR,
    },
  };
}
