import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers.js';

describe('general API behaviour', () => {
  it('GET /api/v1 lists the available endpoints', async () => {
    const res = await api().get('/api/v1').expect(200);
    expect(res.body.data.name).toBe('Task Management API');
    expect(res.body.data.endpoints).toContain('POST   /api/v1/auth/login');
  });

  it('GET /api/v1/health reports the database as connected', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'connected' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await api().get('/api/v1/does-not-exist').expect(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route GET /api/v1/does-not-exist not found' },
    });
  });

  it('returns 400 INVALID_JSON for a malformed body', async () => {
    const res = await api()
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@b.com",')
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 for an oversized body', async () => {
    const { auth } = await registerUser();
    const res = await api()
      .post('/api/v1/tasks')
      .set('Authorization', auth)
      .send({ title: 'big', description: 'x'.repeat(20_000) })
      .expect(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('sets security headers', async () => {
    const res = await api().get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});
