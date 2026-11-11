import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// An idle client can error (e.g. the server restarts). Log it instead of crashing.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Runs `fn` inside a transaction. Commits if it resolves, rolls back if it throws.
 * `fn` receives a client; use `client.query(...)` for every statement in the transaction.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function closePool() {
  return pool.end();
}
