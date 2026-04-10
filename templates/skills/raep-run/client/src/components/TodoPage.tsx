import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTodos } from '../hooks/useTodos';
import { useToast } from '../hooks/useToast';
import { TodoList } from './TodoList';
import { TodoForm } from './TodoForm';
import { TodoFilters } from './TodoFilters';
import { ToastStack } from './ToastStack';
import type { Todo, TodoFiltersState, SortField, SortDir } from '../types/todo';
import type { TodoFormPayload } from './TodoForm';

const DEFAULT_FILTERS: TodoFiltersState = {
  status: '',
  priority: '',
  assignee: '',
  title: '',
  sortField: 'createdAt',
  sortDir: 'desc',
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortTodos(arr: Todo[], field: SortField, dir: SortDir): Todo[] {
  return [...arr].sort((a, b) => {
    let cmp = 0;
    if (field === 'priority') {
      cmp = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    } else if (field === 'dueDate') {
      const da = a.dueDate ?? '9999-99-99';
      const db = b.dueDate ?? '9999-99-99';
      cmp = da < db ? -1 : da > db ? 1 : 0;
    } else {
      cmp = a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function TodoPage(): React.JSX.Element {
  const { todos, loading, error, load, create, update, remove } = useTodos();
  const { toasts, addToast, removeToast } = useToast();
  const [filters, setFilters] = useState<TodoFiltersState>(DEFAULT_FILTERS);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const newTodoBtnRef = useRef<HTMLButtonElement>(null);

  // Only refetch when server-side filter fields change; title/sort are client-side only
  useEffect(() => {
    void load({ status: filters.status, priority: filters.priority, assignee: filters.assignee });
  }, [filters.status, filters.priority, filters.assignee, load]);

  // Escape key dismisses delete confirm dialog
  useEffect(() => {
    if (!deleteConfirm) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDeleteConfirm(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deleteConfirm]);

  // Client-side: title filter + sort
  const titleLower = filters.title.toLowerCase();
  const visibleTodos = sortTodos(
    titleLower ? todos.filter((t) => t.title.toLowerCase().includes(titleLower)) : todos,
    filters.sortField,
    filters.sortDir,
  );

  const handleFormCancel = useCallback((): void => {
    setShowForm(false);
    setEditingTodo(null);
    setTimeout(() => newTodoBtnRef.current?.focus(), 0);
  }, []);

  const handleCreate = async (input: TodoFormPayload): Promise<void> => {
    try {
      await create(input);
      setShowForm(false);
      addToast('Todo created');
      setTimeout(() => newTodoBtnRef.current?.focus(), 0);
    } catch {
      addToast('Failed to create todo', 'error');
    }
  };

  const handleUpdate = async (input: TodoFormPayload): Promise<void> => {
    if (!editingTodo) return;
    try {
      await update(editingTodo.id, input);
      setEditingTodo(null);
      setShowForm(false);
      addToast('Todo updated');
      setTimeout(() => newTodoBtnRef.current?.focus(), 0);
    } catch {
      addToast('Failed to update todo', 'error');
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteConfirm) return;
    try {
      await remove(deleteConfirm);
      setDeleteConfirm(null);
      addToast('Todo deleted');
    } catch {
      addToast('Failed to delete todo', 'error');
    }
  };

  const handleEditRequest = (todo: Todo): void => {
    setEditingTodo(todo);
    setShowForm(true);
  };

  return (
    <div className="todo-page">
      <header className="todo-page__header">
        <h1>My Todos</h1>
        {!showForm && (
          <button ref={newTodoBtnRef} className="btn btn--primary" onClick={() => setShowForm(true)}>
            + New Todo
          </button>
        )}
      </header>

      {(showForm || editingTodo) && (
        <TodoForm
          initial={editingTodo ?? undefined}
          onSubmit={editingTodo ? handleUpdate : handleCreate}
          onCancel={handleFormCancel}
        />
      )}

      <TodoFilters filters={filters} onChange={setFilters} />

      {error && <div className="error-banner">{error}</div>}

      {deleteConfirm && (
        <div className="confirm-dialog">
          <p>Delete this todo?</p>
          <button className="btn btn--danger" onClick={() => void handleDeleteConfirm()}>
            Delete
          </button>
          <button className="btn" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </button>
        </div>
      )}

      <TodoList
        todos={visibleTodos}
        loading={loading}
        onEdit={handleEditRequest}
        onDelete={(id) => setDeleteConfirm(id)}
        onStatusToggle={(id, status) => void update(id, { status })}
      />

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
