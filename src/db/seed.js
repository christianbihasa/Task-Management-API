import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { closePool, withTransaction } from './pool.js';

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@example.com',
  password: 'Password123',
};

const DEMO_TASKS = [
  { title: 'Set up project repository', status: 'done', priority: 'high', dueInDays: -3 },
  { title: 'Design database schema', status: 'done', priority: 'high', dueInDays: -1 },
  { title: 'Implement JWT authentication', status: 'in_progress', priority: 'high', dueInDays: 1 },
  { title: 'Write integration tests', status: 'todo', priority: 'medium', dueInDays: 5 },
  { title: 'Document API endpoints', status: 'todo', priority: 'low', dueInDays: null },
];

if (env.isProduction) {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

try {
  await withTransaction(async (client) => {
    // Start fresh: removing the demo user also removes their tasks (ON DELETE CASCADE).
    await client.query('DELETE FROM users WHERE email = $1', [DEMO_USER.email]);

    const passwordHash = await bcrypt.hash(DEMO_USER.password, env.BCRYPT_ROUNDS);
    const { rows } = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [DEMO_USER.name, DEMO_USER.email, passwordHash],
    );
    const userId = rows[0].id;

    for (const task of DEMO_TASKS) {
      const dueDate =
        task.dueInDays === null ? null : new Date(Date.now() + task.dueInDays * 86_400_000);
      await client.query(
        `INSERT INTO tasks (user_id, title, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, task.title, task.status, task.priority, dueDate],
      );
    }
  });

  console.log(
    `Seeded demo user ${DEMO_USER.email} / ${DEMO_USER.password} with ${DEMO_TASKS.length} tasks.`,
  );
} catch (err) {
  console.error('Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
