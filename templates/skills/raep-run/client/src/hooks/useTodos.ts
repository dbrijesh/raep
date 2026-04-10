import { useState, useCallback } from 'react';
import * as api from '../api/todos';
import type { Todo, CreateTodoInput, UpdateTodoInput, TodoFiltersState } from '../types/todo';

interface UseTodosReturn {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  load: (filters?: Partial<TodoFiltersState>) => Promise<void>;
  create: (input: CreateTodoInput) => Promise<void>;
  update: (id: string, input: UpdateTodoInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filters: Partial<TodoFiltersState> = {}): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchTodos(filters);
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (input: CreateTodoInput): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const newTodo = await api.createTodo(input);
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateTodoInput): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateTodo(id, input);
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    } finally {
      setLoading(false);
    }
  }, []);

  return { todos, loading, error, load, create, update, remove };
}
