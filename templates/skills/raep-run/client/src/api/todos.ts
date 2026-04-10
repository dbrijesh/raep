import type { Todo, CreateTodoInput, UpdateTodoInput, TodoFiltersState } from '../types/todo';

const BASE = '/api/todos';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTodos(filters: Partial<TodoFiltersState> = {}): Promise<Todo[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assignee) params.set('assignee', filters.assignee);
  const qs = params.toString();
  const res = await fetch(`${BASE}${qs ? `?${qs}` : ''}`);
  return handleResponse<Todo[]>(res);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Todo>(res);
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleResponse<Todo>(res);
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
}
