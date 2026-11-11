import { query } from '../../db/pool.js';

const TASK_COLUMNS = `
  id,
  title,
  description,
  status,
  priority,
  due_date   AS "dueDate",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// API field name -> database column. Column names can't be sent as query
// parameters, so only names from these maps ever reach the SQL string.
const WRITABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
};

const SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  dueDate: 'due_date',
  priority: 'priority',
  title: 'title',
};

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function findTasks({ userId, page, limit, status, priority, search, sortBy, order }) {
  const params = [userId];
  const conditions = ['user_id = $1'];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    conditions.push(`priority = $${params.length}`);
  }
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  const where = conditions.join(' AND ');
  const direction = order === 'asc' ? 'ASC' : 'DESC';
  // Tasks without a due date go last; id breaks ties so pages stay stable.
  const orderBy = `${SORT_COLUMNS[sortBy]} ${direction} NULLS LAST, id ASC`;

  const offset = (page - 1) * limit;
  const listParams = [...params, limit, offset];

  const [list, count] = await Promise.all([
    query(
      `SELECT ${TASK_COLUMNS} FROM tasks
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    ),
    query(`SELECT COUNT(*)::int AS total FROM tasks WHERE ${where}`, params),
  ]);

  return { tasks: list.rows, total: count.rows[0].total };
}

export async function findTaskById(userId, taskId) {
  const { rows } = await query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = $1 AND user_id = $2`, [
    taskId,
    userId,
  ]);
  return rows[0] ?? null;
}

export async function createTask(userId, { title, description, status, priority, dueDate }) {
  const { rows } = await query(
    `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${TASK_COLUMNS}`,
    [userId, title, description, status, priority, dueDate],
  );
  return rows[0];
}

/** Updates only the fields present in `changes`. Returns null if the task isn't found. */
export async function updateTask(userId, taskId, changes) {
  const params = [taskId, userId];
  const assignments = [];

  for (const [field, column] of Object.entries(WRITABLE_COLUMNS)) {
    if (changes[field] !== undefined) {
      params.push(changes[field]);
      assignments.push(`${column} = $${params.length}`);
    }
  }

  if (assignments.length === 0) return findTaskById(userId, taskId);

  const { rows } = await query(
    `UPDATE tasks SET ${assignments.join(', ')}
     WHERE id = $1 AND user_id = $2
     RETURNING ${TASK_COLUMNS}`,
    params,
  );
  return rows[0] ?? null;
}

/** Returns true if a task was deleted. */
export async function deleteTask(userId, taskId) {
  const { rowCount } = await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [
    taskId,
    userId,
  ]);
  return rowCount > 0;
}
