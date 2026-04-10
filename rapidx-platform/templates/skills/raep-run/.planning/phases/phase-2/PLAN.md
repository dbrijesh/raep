# PLAN.md — Phase 2: Core API (CRUD)

> Project: ToDo App
> Phase: 2 of 5
> Goal: Implement all 5 REST endpoints with full validation, error handling, and unit tests.
> Created: 2026-03-21

---

## Exit Criteria

- [ ] `POST /api/todos` creates a todo and returns it with status 201
- [ ] `GET /api/todos` returns all todos; supports `?status`, `?priority`, `?assignee` filters
- [ ] `GET /api/todos/:id` returns a todo or 404
- [ ] `PUT /api/todos/:id` updates any subset of fields and returns updated todo, or 404
- [ ] `DELETE /api/todos/:id` deletes and returns 204, or 404
- [ ] Invalid request bodies return 400 with a descriptive message
- [ ] All public functions have explicit TypeScript return types — no `any`
- [ ] Unit tests cover all 5 routes (happy path + key error paths)

---

## New Files

```
server/src/
├── types/
│   └── todo.ts               # Shared Todo types (DB row, API shape, create/update inputs)
├── db/
│   └── todoRepository.ts     # All SQL — typed queries, no raw SQL in routes
├── middleware/
│   └── validate.ts           # Input validation middleware factory
└── routes/
    └── todos.ts              # REPLACED — full CRUD implementation
```

---

## Task 1 — Shared Types

**File:** `server/src/types/todo.ts`

All types flow from here — repository, routes, and tests all import from this file.

```typescript
export type TodoStatus = 'pending' | 'in-progress' | 'done';
export type TodoPriority = 'low' | 'medium' | 'high';

// Shape as stored in SQLite (snake_case columns)
export interface TodoRow {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// Shape returned from the API (camelCase)
export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  assignee: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Body for POST /api/todos
export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  assignee?: string;
  dueDate?: string;
}

// Body for PUT /api/todos/:id — all fields optional
export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  assignee?: string;
  dueDate?: string;
}

// Query params for GET /api/todos
export interface TodoFilters {
  status?: TodoStatus;
  priority?: TodoPriority;
  assignee?: string;
}
```

---

## Task 2 — Todo Repository

**File:** `server/src/db/todoRepository.ts`

All database access lives here. Routes never touch SQL directly.

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection';
import type {
  Todo,
  TodoRow,
  CreateTodoInput,
  UpdateTodoInput,
  TodoFilters,
} from '../types/todo';

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findAllTodos(filters: TodoFilters): Todo[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    conditions.push('status = @status');
    params.status = filters.status;
  }
  if (filters.priority) {
    conditions.push('priority = @priority');
    params.priority = filters.priority;
  }
  if (filters.assignee) {
    conditions.push('assignee = @assignee');
    params.assignee = filters.assignee;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM todos ${where} ORDER BY created_at DESC`)
    .all(params) as TodoRow[];

  return rows.map(rowToTodo);
}

export function findTodoById(id: string): Todo | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
  return row ? rowToTodo(row) : null;
}

export function createTodo(input: CreateTodoInput): Todo {
  const db = getDb();
  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO todos (id, title, description, status, priority, assignee, due_date, created_at, updated_at)
    VALUES (@id, @title, @description, @status, @priority, @assignee, @dueDate, @createdAt, @updatedAt)
  `).run({
    id,
    title: input.title,
    description: input.description ?? null,
    status: 'pending',
    priority: input.priority ?? 'medium',
    assignee: input.assignee ?? null,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = findTodoById(id);
  if (!created) throw new Error(`[RapidX] Failed to retrieve created todo: ${id}`);
  return created;
}

export function updateTodo(id: string, input: UpdateTodoInput): Todo | null {
  const db = getDb();
  const existing = findTodoById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE todos SET
      title       = @title,
      description = @description,
      status      = @status,
      priority    = @priority,
      assignee    = @assignee,
      due_date    = @dueDate,
      updated_at  = @updatedAt
    WHERE id = @id
  `).run({
    id,
    title: input.title ?? existing.title,
    description: input.description !== undefined ? input.description : existing.description,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    assignee: input.assignee !== undefined ? input.assignee : existing.assignee,
    dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
    updatedAt: now,
  });

  return findTodoById(id);
}

export function deleteTodo(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  return result.changes > 0;
}
```

---

## Task 3 — Validation Middleware

**File:** `server/src/middleware/validate.ts`

A small factory that validates request body fields and returns 400 on failure.

```typescript
import { Request, Response, NextFunction, RequestHandler } from 'express';

export type ValidationRule = (body: Record<string, unknown>) => string | null;

export function validateBody(rules: ValidationRule[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;

    for (const rule of rules) {
      const error = rule(body);
      if (error) {
        res.status(400).json({ error });
        return;
      }
    }

    next();
  };
}

// --- Reusable rules ---

export const requireTitle: ValidationRule = (body) => {
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return 'title is required and must be a non-empty string';
  }
  if (body.title.length > 200) {
    return 'title must be 200 characters or fewer';
  }
  return null;
};

export const validPriority: ValidationRule = (body) => {
  const valid = ['low', 'medium', 'high'];
  if (body.priority !== undefined && !valid.includes(body.priority as string)) {
    return `priority must be one of: ${valid.join(', ')}`;
  }
  return null;
};

export const validStatus: ValidationRule = (body) => {
  const valid = ['pending', 'in-progress', 'done'];
  if (body.status !== undefined && !valid.includes(body.status as string)) {
    return `status must be one of: ${valid.join(', ')}`;
  }
  return null;
};

export const validDescription: ValidationRule = (body) => {
  if (body.description !== undefined && typeof body.description === 'string') {
    if (body.description.length > 2000) {
      return 'description must be 2000 characters or fewer';
    }
  }
  return null;
};
```

---

## Task 4 — Full Todos Router

**File:** `server/src/routes/todos.ts` (replaces placeholder)

```typescript
import { Router, Request, Response } from 'express';
import {
  findAllTodos,
  findTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../db/todoRepository';
import { validateBody, requireTitle, validPriority, validStatus, validDescription } from '../middleware/validate';
import type { CreateTodoInput, UpdateTodoInput, TodoFilters } from '../types/todo';

export const todosRouter = Router();

// GET /api/todos?status=&priority=&assignee=
todosRouter.get('/', (req: Request, res: Response): void => {
  const filters: TodoFilters = {
    status: req.query.status as TodoFilters['status'],
    priority: req.query.priority as TodoFilters['priority'],
    assignee: req.query.assignee as string | undefined,
  };
  const todos = findAllTodos(filters);
  res.json(todos);
});

// GET /api/todos/:id
todosRouter.get('/:id', (req: Request, res: Response): void => {
  const todo = findTodoById(req.params.id);
  if (!todo) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  res.json(todo);
});

// POST /api/todos
todosRouter.post(
  '/',
  validateBody([requireTitle, validPriority, validDescription]),
  (req: Request, res: Response): void => {
    const input = req.body as CreateTodoInput;
    const todo = createTodo(input);
    res.status(201).json(todo);
  },
);

// PUT /api/todos/:id
todosRouter.put(
  '/:id',
  validateBody([validStatus, validPriority, validDescription]),
  (req: Request, res: Response): void => {
    const input = req.body as UpdateTodoInput;
    const todo = updateTodo(req.params.id, input);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  },
);

// DELETE /api/todos/:id
todosRouter.delete('/:id', (req: Request, res: Response): void => {
  const deleted = deleteTodo(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  res.status(204).send();
});
```

---

## Task 5 — Unit Tests

**File:** `server/src/routes/todos.test.ts`

Add `vitest` + `supertest` to dev dependencies, then test all routes.

**Add to `server/package.json` devDependencies:**
```json
"vitest": "^2.0.0",
"supertest": "^7.0.0",
"@types/supertest": "^6.0.0"
```

**Add to `server/package.json` scripts:**
```json
"test": "vitest run"
```

**`server/src/routes/todos.test.ts`:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { todosRouter } from './todos';

// Use an in-memory DB for tests by setting DB_PATH before import
process.env.DB_PATH = ':memory:';

// Re-import after env is set
import { runMigrations } from '../db/migrate';

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/todos', todosRouter);
  return app;
}

beforeEach(() => {
  // Reset DB state between tests via a fresh in-memory instance
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
    expect(res.body.id).toBeDefined();
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(buildApp()).post('/api/todos').send({ priority: 'low' });
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
  });
});

describe('DELETE /api/todos/:id', () => {
  it('deletes a todo and returns 204', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/todos').send({ title: 'Delete me' });
    const res = await request(app).delete(`/api/todos/${create.body.id}`);
    expect(res.status).toBe(204);
  });

  it('returns 404 when todo does not exist', async () => {
    const res = await request(buildApp()).delete('/api/todos/ghost');
    expect(res.status).toBe(404);
  });
});
```

---

## Security Checklist (Phase 2)

- [x] All SQL uses `better-sqlite3` named parameters — no string concatenation
- [x] Filter values from query params are passed as bound parameters only
- [x] Input validation at API boundary before any DB operation
- [x] No `any` types — all inputs explicitly typed via `CreateTodoInput` / `UpdateTodoInput`
- [x] Errors return structured JSON, never raw stack traces

---

## Verification Steps

```bash
# Run tests
npm test --workspace=server

# Manual smoke test (server must be running)
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"My first todo","priority":"high"}'

curl http://localhost:3001/api/todos

curl http://localhost:3001/api/todos/<id-from-above>

curl -X PUT http://localhost:3001/api/todos/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'

curl -X DELETE http://localhost:3001/api/todos/<id>

# Validation check
curl -X POST http://localhost:3001/api/todos \
  -H "Content-Type: application/json" \
  -d '{"priority":"high"}'
# Expected: 400 { "error": "title is required..." }
```

---

**Next step:** Run `/gsd:execute-phase 2` to implement all these files.
