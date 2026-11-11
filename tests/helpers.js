import request from 'supertest';
import { createApp } from '../src/app.js';

export const app = createApp();
export const api = () => request(app);

let userCounter = 0;

/** Registers a new user and returns `{ user, token, auth }` where `auth` is the header value. */
export async function registerUser(overrides = {}) {
  userCounter += 1;
  const payload = {
    name: `Test User ${userCounter}`,
    email: `user${userCounter}@example.com`,
    password: 'Password123',
    ...overrides,
  };
  const res = await api().post('/api/v1/auth/register').send(payload).expect(201);
  const { user, token } = res.body.data;
  return { user, token, auth: `Bearer ${token}`, password: payload.password };
}

export async function createTask(auth, data = {}) {
  const res = await api()
    .post('/api/v1/tasks')
    .set('Authorization', auth)
    .send({ title: 'A task', ...data })
    .expect(201);
  return res.body.data;
}
