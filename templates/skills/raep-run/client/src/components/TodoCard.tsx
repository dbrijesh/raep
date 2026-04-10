import React from 'react';
import type { Todo, TodoStatus } from '../types/todo';

interface TodoCardProps {
  todo: Todo;
  onEdit: () => void;
  onDelete: () => void;
  onStatusToggle: (id: string, status: TodoStatus) => void;
}

const STATUS_CYCLE: Record<TodoStatus, TodoStatus> = {
  pending: 'in-progress',
  'in-progress': 'done',
  done: 'pending',
};

const STATUS_LABEL: Record<TodoStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  done: 'Done',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function TodoCard({ todo, onEdit, onDelete, onStatusToggle }: TodoCardProps): React.JSX.Element {
  const nextStatus = STATUS_CYCLE[todo.status];
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = todo.dueDate !== null && todo.dueDate < today && todo.status !== 'done';

  return (
    <div className={`todo-card todo-card--${todo.status} todo-card--priority-${todo.priority}${isOverdue ? ' todo-card--overdue' : ''}`}>
      <div className="todo-card__main">
        <button
          className={`todo-card__status-badge todo-card__status-badge--${todo.status}`}
          onClick={() => onStatusToggle(todo.id, nextStatus)}
          title={`Mark as ${STATUS_LABEL[nextStatus]}`}
        >
          {STATUS_LABEL[todo.status]}
        </button>
        <div className="todo-card__content">
          <h3 className="todo-card__title">{todo.title}</h3>
          {todo.description && (
            <p className="todo-card__description">{todo.description}</p>
          )}
          <div className="todo-card__meta">
            <span className={`todo-card__priority todo-card__priority--${todo.priority}`}>
              {PRIORITY_LABEL[todo.priority]}
            </span>
            {todo.assignee && (
              <span className="todo-card__assignee">@ {todo.assignee}</span>
            )}
            {todo.dueDate && (
              <span className="todo-card__due-date">Due {todo.dueDate}</span>
            )}
            {isOverdue && <span className="todo-card__overdue-tag">Overdue</span>}
          </div>
        </div>
      </div>
      <div className="todo-card__actions">
        <button className="btn btn--icon" onClick={onEdit} title="Edit">
          ✏️
        </button>
        <button className="btn btn--icon btn--danger" onClick={onDelete} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  );
}
