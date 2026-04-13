export type TodoStatus = 'pending' | 'in-progress' | 'done';
export type TodoPriority = 'low' | 'medium' | 'high';

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

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  assignee?: string;
  dueDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  assignee?: string;
  dueDate?: string;
}

export interface TodoFiltersState {
  status: TodoStatus | '';
  priority: TodoPriority | '';
  assignee: string;
  title: string;
  sortField: SortField;
  sortDir: SortDir;
}

export type SortField = 'createdAt' | 'dueDate' | 'priority';
export type SortDir = 'asc' | 'desc';
