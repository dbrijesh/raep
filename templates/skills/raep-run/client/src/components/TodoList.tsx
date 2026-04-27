import React from 'react';
import { TodoCard } from './TodoCard';
import type { Todo, TodoStatus } from '../types/todo';

interface TodoListProps {
  todos: Todo[];
  loading: boolean;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onStatusToggle: (id: string, status: TodoStatus) => void;
}

export function TodoList({ todos, loading, onEdit, onDelete, onStatusToggle }: TodoListProps): React.JSX.Element {
  if (loading) {
    return <div className="todo-list__loading">Loading…</div>;
  }

  if (todos.length === 0) {
    return (
      <div className="todo-list__empty">
        <p>No todos yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id}>
          <TodoCard
            todo={todo}
            onEdit={() => onEdit(todo)}
            onDelete={() => onDelete(todo.id)}
            onStatusToggle={onStatusToggle}
          />
        </li>
      ))}
    </ul>
  );
}
