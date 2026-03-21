// Typed API client — placeholder for Phase 3 implementation
// All fetch calls proxy through Vite to http://localhost:3001

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

const BASE = '/api/todos';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[RapidX] API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(BASE);
  return handleResponse<Todo[]>(res);
}
