import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { query } from '../src/db/pool.js';
import { api, registerUser } from './helpers.js';

describe('POST /api/v1/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Ada Lovelace', email: '  Ada@Example.COM ', password: 'Password123' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    await registerUser({ email: 'hash@example.com', password: 'Password123' });
    const { rows } = await query('SELECT password_hash FROM users WHERE email = $1', [
      'hash@example.com',
    ]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain('Password123');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser({ email: 'dupe@example.com' });
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Someone', email: 'DUPE@example.com', password: 'Password123' })
      .expect(409);

    expect(res.body).toEqual({
      success: false,
      error: { code: 'CONFLICT', message: 'Email is already registered' },
    });
  });

  it('returns field-level validation errors', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('rejects unknown fields', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'a@example.com', password: 'Password123', isAdmin: true })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const { user, password } = await registerUser();
    const res = await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email.toUpperCase(), password })
      .expect(200);

    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    const { user } = await registerUser();

    const wrongPassword = await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'WrongPassword1' })
      .expect(401);
    const unknownEmail = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' })
      .expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user', async () => {
    const { user, auth } = await registerUser();
    const res = await api().get('/api/v1/auth/me').set('Authorization', auth).expect(200);
    expect(res.body.data.user).toEqual(user);
  });

  it('requires a token', async () => {
    const res = await api().get('/api/v1/auth/me').expect(401);
    expect(res.body.error.code).toBe('TOKEN_MISSING');
  });

  it('rejects an invalid token', async () => {
    const res = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejects a token signed with a different secret', async () => {
    const { user } = await registerUser();
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough-123', { subject: user.id });
    const res = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejects an expired token', async () => {
    const { user } = await registerUser();
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, env.JWT_SECRET, {
      subject: user.id,
    });
    const res = await api()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects a valid token for a deleted user', async () => {
    const { user, auth } = await registerUser();
    await query('DELETE FROM users WHERE id = $1', [user.id]);
    await api().get('/api/v1/auth/me').set('Authorization', auth).expect(401);
  });
});
