/**
 * PostgreSQL database client.
 *
 * Exports two async helpers used by all API routes:
 *   query(sql, values)    → rows[]
 *   queryOne(sql, values) → row | null
 *
 * Connection string is read from DATABASE_URL (or POSTGRES_URL as fallback,
 * which Vercel Postgres sets automatically).
 *
 * SSL is enabled for all non-localhost connections (required by Neon, Supabase,
 * Railway, Vercel Postgres, etc.).
 */

import { Pool } from 'pg';

// ── Pool singleton ─────────────────────────────────────────────────────────
// Stored on globalThis so Next.js hot-reload in dev doesn't leak connections.

let pool = globalThis.__pgPool;

if (!pool) {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      '[db] DATABASE_URL is not set.\n' +
      'Add it to .env.local for local dev, or to Vercel → Settings → Environment Variables.'
    );
  }

  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('[db] Pool error:', err.message);
  });

  globalThis.__pgPool = pool;
}

// ── Public helpers ─────────────────────────────────────────────────────────

/**
 * Run a parameterised query and return all matching rows.
 * @param {string}   text    SQL with $1 $2 … placeholders
 * @param {any[]}   [values]
 * @returns {Promise<any[]>}
 */
export async function query(text, values) {
  const result = await pool.query(text, values);
  return result.rows;
}

/**
 * Run a parameterised query and return the first row, or null.
 */
export async function queryOne(text, values) {
  const rows = await query(text, values);
  return rows[0] ?? null;
}
