import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { runMigrations } from '../db/migrate';
import { closeDb } from '../db/connection';
import { todosRouter } from './todos';

// Use an isolated in-memory SQLite database for all tests.
// Must be set before any call to getDb() — closeDb() in beforeEach ensures
// each test gets a fresh connection against ':memory:'.
process.env.DB_PATH = ':memory:';

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/todos', todosRouter);
  return app;
}

beforeEach(() => {
  // Reset singleton so a fresh :memory: DB is created for each test.
  closeDb();
  runMigrations();
});

describe('GET /api/todos', () => {
  it('returns empty array when no todos exist', async () => {
    const res = await request(buildApp()).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/todos', () => {
  it('creates a todo and returns 201 with the new todo', async () => {
    const res = await request(buildApp())
      .post('/api/todos')
      .send({ title: 'Buy groceries', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('pending');
    expect(typeof res.body.id).toBe('string');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(buildApp()).post('/api/todos').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  it('returns 400 when title is empty string', async () => {
    const res = await request(buildApp()).post('/api/todos').send({ title: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  it('returns 400 when priority is invalid', async () => {
    const res = await request(buildApp())
      .post('/api/todos')
      .send({ title: 'Test', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/priority/);
  });
});

describe('GET /api/todos/:id', () => {
  it('returns the todo when it exists', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Find me' });
    const res = await request(app).get(`/api/todos/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Find me');
  });

  it('returns 404 when todo does not exist', async () => {
    const res = await request(buildApp()).get('/api/todos/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Todo not found');
  });
});

describe('PUT /api/todos/:id', () => {
  it('updates fields and returns the updated todo', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Original' });
    const res = await request(app)
      .put(`/api/todos/${create.body.id}`)
      .send({ title: 'Updated', status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('done');
  });

  it('preserves unchanged fields on partial update', async () => {
    const app = buildApp();
    const create = await request(app)
      .post('/api/todos')
      .send({ title: 'My Task', priority: 'high', assignee: 'Alice' });
    const res = await request(app)
      .put(`/api/todos/${create.body.id}`)
      .send({ status: 'in-progress' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.status).toBe('in-progress');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(buildApp()).put('/api/todos/nope').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid status', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Test' });
    const res = await request(app)
      .put(`/api/todos/${create.body.id}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/);
  });
});

describe('DELETE /api/todos/:id', () => {
  it('deletes a todo and returns 204', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Delete me' });
    const res = await request(app).delete(`/api/todos/${create.body.id}`);
    expect(res.status).toBe(204);
  });

  it('confirms the todo is gone after deletion', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Gone soon' });
    await request(app).delete(`/api/todos/${create.body.id}`);
    const res = await request(app).get(`/api/todos/${create.body.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when todo does not exist', async () => {
    const res = await request(buildApp()).delete('/api/todos/ghost');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/todos (filters)', () => {
  it('filters by status', async () => {
    const app = buildApp();
    await request(app).post('/api/todos').send({ title: 'Pending task' });
    const created = await request(app).post('/api/todos').send({ title: 'Done task' });
    await request(app).put(`/api/todos/${created.body.id}`).send({ status: 'done' });

    const res = await request(app).get('/api/todos?status=done');
    expect(res.status).toBe(200);
    expect(res.body.every((t: { status: string }) => t.status === 'done')).toBe(true);
  });

  it('filters by priority', async () => {
    const app = buildApp();
    await request(app).post('/api/todos').send({ title: 'Low task', priority: 'low' });
    await request(app).post('/api/todos').send({ title: 'High task', priority: 'high' });

    const res = await request(app).get('/api/todos?priority=high');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].priority).toBe('high');
  });
});
