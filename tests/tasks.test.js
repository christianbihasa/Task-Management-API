import { beforeEach, describe, expect, it } from 'vitest';
import { api, createTask, registerUser } from './helpers.js';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

let alice;
let bob;

beforeEach(async () => {
  alice = await registerUser();
  bob = await registerUser();
});

describe('auth on task routes', () => {
  it('requires a token on every task route', async () => {
    await api().get('/api/v1/tasks').expect(401);
    await api().post('/api/v1/tasks').send({ title: 'x' }).expect(401);
    await api().get(`/api/v1/tasks/${MISSING_ID}`).expect(401);
    await api().patch(`/api/v1/tasks/${MISSING_ID}`).send({ title: 'x' }).expect(401);
    await api().delete(`/api/v1/tasks/${MISSING_ID}`).expect(401);
  });
});

describe('POST /api/v1/tasks', () => {
  it('creates a task with defaults', async () => {
    const res = await api()
      .post('/api/v1/tasks')
      .set('Authorization', alice.auth)
      .send({ title: '  Write README  ' })
      .expect(201);

    expect(res.headers.location).toBe(`/api/v1/tasks/${res.body.data.id}`);
    expect(res.body.data).toMatchObject({
      title: 'Write README',
      description: null,
      status: 'todo',
      priority: 'medium',
      dueDate: null,
    });
    expect(res.body.data).not.toHaveProperty('userId');
  });

  it('accepts all fields', async () => {
    const task = await createTask(alice.auth, {
      title: 'Ship v1',
      description: 'Release the first version',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-12-31T17:00:00+08:00',
    });
    expect(task).toMatchObject({ status: 'in_progress', priority: 'high' });
    expect(new Date(task.dueDate).toISOString()).toBe('2026-12-31T09:00:00.000Z');
  });

  it('validates input', async () => {
    const res = await api()
      .post('/api/v1/tasks')
      .set('Authorization', alice.auth)
      .send({ title: '', status: 'finished', dueDate: 'tomorrow' })
      .expect(400);

    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'status', 'dueDate']));
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('returns the task', async () => {
    const task = await createTask(alice.auth);
    const res = await api()
      .get(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .expect(200);
    expect(res.body.data).toEqual(task);
  });

  it("returns 404 for another user's task", async () => {
    const task = await createTask(alice.auth);
    const res = await api()
      .get(`/api/v1/tasks/${task.id}`)
      .set('Authorization', bob.auth)
      .expect(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Task not found' });
  });

  it('returns 404 for a task that does not exist', async () => {
    await api().get(`/api/v1/tasks/${MISSING_ID}`).set('Authorization', alice.auth).expect(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await api().get('/api/v1/tasks/123').set('Authorization', alice.auth).expect(400);
    expect(res.body.error.details[0]).toMatchObject({ location: 'params', field: 'id' });
  });
});

describe('PUT /api/v1/tasks/:id', () => {
  it('replaces the task, resetting omitted fields to defaults', async () => {
    const task = await createTask(alice.auth, {
      description: 'old',
      priority: 'high',
      dueDate: '2026-12-01T00:00:00Z',
    });
    const res = await api()
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .send({ title: 'Replaced', status: 'done' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      id: task.id,
      title: 'Replaced',
      status: 'done',
      description: null,
      priority: 'medium',
      dueDate: null,
    });
  });

  it('requires a title', async () => {
    const task = await createTask(alice.auth);
    await api()
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .send({ status: 'done' })
      .expect(400);
  });
});

describe('PATCH /api/v1/tasks/:id', () => {
  it('updates only the given fields', async () => {
    const task = await createTask(alice.auth, { description: 'keep me', priority: 'high' });
    const res = await api()
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .send({ status: 'done' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      title: task.title,
      description: 'keep me',
      priority: 'high',
      status: 'done',
    });
    expect(new Date(res.body.data.updatedAt) >= new Date(task.updatedAt)).toBe(true);
  });

  it('can clear nullable fields with null', async () => {
    const task = await createTask(alice.auth, {
      description: 'temp',
      dueDate: '2026-12-01T00:00:00Z',
    });
    const res = await api()
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .send({ description: null, dueDate: null })
      .expect(200);
    expect(res.body.data).toMatchObject({ description: null, dueDate: null });
  });

  it('rejects an empty body', async () => {
    const task = await createTask(alice.auth);
    const res = await api()
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .send({})
      .expect(400);
    expect(res.body.error.details[0].message).toBe('Provide at least one field to update');
  });

  it("cannot update another user's task", async () => {
    const task = await createTask(alice.auth);
    await api()
      .patch(`/api/v1/tasks/${task.id}`)
      .set('Authorization', bob.auth)
      .send({ title: 'hacked' })
      .expect(404);

    const res = await api().get(`/api/v1/tasks/${task.id}`).set('Authorization', alice.auth);
    expect(res.body.data.title).toBe(task.title);
  });
});

describe('DELETE /api/v1/tasks/:id', () => {
  it('deletes the task and returns 204', async () => {
    const task = await createTask(alice.auth);
    const res = await api()
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', alice.auth)
      .expect(204);
    expect(res.text).toBe('');

    await api().get(`/api/v1/tasks/${task.id}`).set('Authorization', alice.auth).expect(404);
  });

  it("cannot delete another user's task", async () => {
    const task = await createTask(alice.auth);
    await api().delete(`/api/v1/tasks/${task.id}`).set('Authorization', bob.auth).expect(404);
    await api().get(`/api/v1/tasks/${task.id}`).set('Authorization', alice.auth).expect(200);
  });
});

describe('GET /api/v1/tasks', () => {
  beforeEach(async () => {
    // Created one at a time so createdAt order is predictable.
    await createTask(alice.auth, { title: 'Buy milk', priority: 'low', status: 'done' });
    await createTask(alice.auth, {
      title: 'Fix login bug',
      description: 'Users see a 500 on bad passwords',
      priority: 'high',
      dueDate: '2026-12-01T00:00:00Z',
    });
    await createTask(alice.auth, {
      title: 'Plan sprint',
      priority: 'medium',
      status: 'in_progress',
      dueDate: '2026-11-20T00:00:00Z',
    });
    await createTask(alice.auth, { title: 'Discount 50% off', priority: 'medium' });
    await createTask(bob.auth, { title: "Bob's private task" });
  });

  it("lists only the current user's tasks with pagination meta", async () => {
    const res = await api().get('/api/v1/tasks').set('Authorization', alice.auth).expect(200);

    expect(res.body.data).toHaveLength(4);
    expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 4, totalPages: 1 });
    expect(res.body.data.map((t) => t.title)).not.toContain("Bob's private task");
  });

  it('paginates', async () => {
    const page1 = await api().get('/api/v1/tasks?limit=3&page=1').set('Authorization', alice.auth);
    const page2 = await api().get('/api/v1/tasks?limit=3&page=2').set('Authorization', alice.auth);

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toEqual({ page: 2, limit: 3, total: 4, totalPages: 2 });

    const ids = [...page1.body.data, ...page2.body.data].map((t) => t.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('filters by status and priority', async () => {
    const byStatus = await api().get('/api/v1/tasks?status=done').set('Authorization', alice.auth);
    expect(byStatus.body.data.map((t) => t.title)).toEqual(['Buy milk']);

    const byPriority = await api()
      .get('/api/v1/tasks?priority=medium&sortBy=title&order=asc')
      .set('Authorization', alice.auth);
    expect(byPriority.body.data.map((t) => t.title)).toEqual(['Discount 50% off', 'Plan sprint']);
  });

  it('searches title and description, case-insensitively', async () => {
    const byTitle = await api().get('/api/v1/tasks?search=LOGIN').set('Authorization', alice.auth);
    expect(byTitle.body.data.map((t) => t.title)).toEqual(['Fix login bug']);

    const byDescription = await api()
      .get('/api/v1/tasks?search=passwords')
      .set('Authorization', alice.auth);
    expect(byDescription.body.data.map((t) => t.title)).toEqual(['Fix login bug']);
  });

  it('treats % in a search as literal text', async () => {
    const res = await api()
      .get(`/api/v1/tasks?search=${encodeURIComponent('50%')}`)
      .set('Authorization', alice.auth);
    expect(res.body.data.map((t) => t.title)).toEqual(['Discount 50% off']);
  });

  it('sorts by priority and by due date (nulls last)', async () => {
    const byPriority = await api()
      .get('/api/v1/tasks?sortBy=priority&order=desc')
      .set('Authorization', alice.auth);
    expect(byPriority.body.data.map((t) => t.priority)).toEqual([
      'high',
      'medium',
      'medium',
      'low',
    ]);

    const byDue = await api()
      .get('/api/v1/tasks?sortBy=dueDate&order=asc')
      .set('Authorization', alice.auth);
    expect(byDue.body.data.slice(0, 2).map((t) => t.title)).toEqual([
      'Plan sprint',
      'Fix login bug',
    ]);
    expect(byDue.body.data.slice(2).every((t) => t.dueDate === null)).toBe(true);
  });

  it('rejects invalid query parameters', async () => {
    const res = await api()
      .get('/api/v1/tasks?limit=500&sortBy=password_hash&status=nope')
      .set('Authorization', alice.auth)
      .expect(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['limit', 'sortBy', 'status']));
  });
});
