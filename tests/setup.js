import { afterAll, beforeAll, beforeEach } from 'vitest';
import { closePool, query } from '../src/db/pool.js';
import { runMigrations } from '../src/db/migrate.js';

beforeAll(async () => {
  await runMigrations({ log: () => {} });
});

beforeEach(async () => {
  await query('TRUNCATE tasks, users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});
