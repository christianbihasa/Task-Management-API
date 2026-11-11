import { query } from '../../db/pool.js';

// Never select password_hash unless it's needed to check a login.
const PUBLIC_COLUMNS = `id, name, email, created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function createUser({ name, email, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash],
  );
  return rows[0];
}

export async function findUserById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Includes `passwordHash`. Only use this for checking credentials. */
export async function findUserByEmailWithPassword(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS "passwordHash" FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
