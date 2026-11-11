import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closePool, query, withTransaction } from './pool.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Applies every .sql file in /migrations that hasn't run yet, in filename order.
 * Each migration runs in its own transaction and is recorded in schema_migrations.
 */
export async function runMigrations({ log = console.log } = {}) {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name   TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.name));

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();
  const pending = files.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    });
    log(`Applied migration: ${file}`);
  }

  if (pending.length === 0) log('Database is up to date.');
  return pending;
}

// Allow `node src/db/migrate.js` (npm run migrate).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
