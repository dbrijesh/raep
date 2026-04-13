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
