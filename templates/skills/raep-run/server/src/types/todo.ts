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
