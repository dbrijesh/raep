import React from 'react';
import type { TodoFiltersState } from '../types/todo';

interface TodoFiltersProps {
  filters: TodoFiltersState;
  onChange: (filters: TodoFiltersState) => void;
}

const EMPTY_FILTERS: TodoFiltersState = {
  status: '',
  priority: '',
  assignee: '',
  title: '',
  sortField: 'createdAt',
  sortDir: 'desc',
};

export function TodoFilters({ filters, onChange }: TodoFiltersProps): React.JSX.Element {
  const set =
    (field: keyof TodoFiltersState) =>
    (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
      onChange({ ...filters, [field]: e.target.value });
    };

  const clearAll = (): void => {
    onChange(EMPTY_FILTERS);
  };

  const hasActiveFilter =
    filters.status !== '' ||
    filters.priority !== '' ||
    filters.assignee !== '' ||
    filters.title !== '';

  return (
    <div className="todo-filters">
      <input
        className="todo-filters__input"
        type="text"
        value={filters.title}
        onChange={set('title')}
        placeholder="Search by title…"
      />

      <select className="todo-filters__select" value={filters.status} onChange={set('status')}>
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <select className="todo-filters__select" value={filters.priority} onChange={set('priority')}>
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input
        className="todo-filters__input"
        type="text"
        value={filters.assignee}
        onChange={set('assignee')}
        placeholder="Filter by assignee…"
      />

      <select className="todo-filters__select" value={filters.sortField} onChange={set('sortField')}>
        <option value="createdAt">Sort: Created</option>
        <option value="dueDate">Sort: Due Date</option>
        <option value="priority">Sort: Priority</option>
      </select>

      <select className="todo-filters__select" value={filters.sortDir} onChange={set('sortDir')}>
        <option value="desc">↓ Desc</option>
        <option value="asc">↑ Asc</option>
      </select>

      {hasActiveFilter && (
        <button className="btn todo-filters__clear" onClick={clearAll}>
          Clear filters
        </button>
      )}
    </div>
  );
}
