import React, { useEffect, useState } from 'react';
import type { Todo, UpdateTodoInput, TodoPriority, TodoStatus } from '../types/todo';

// Payload always includes a required title, plus all UpdateTodoInput optional fields.
// Using an intersection keeps both handlers (create and edit) assignable under strictFunctionTypes.
export type TodoFormPayload = UpdateTodoInput & { title: string };

interface TodoFormProps {
  initial?: Todo;
  onSubmit: (input: TodoFormPayload) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  title: string;
  description: string;
  priority: TodoPriority;
  status: TodoStatus;
  assignee: string;
  dueDate: string;
}

export function TodoForm({ initial, onSubmit, onCancel }: TodoFormProps): React.JSX.Element {
  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium',
    status: initial?.status ?? 'pending',
    assignee: initial?.assignee ?? '',
    dueDate: initial?.dueDate ?? '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (form.title.trim().length === 0) {
      setValidationError('Title is required.');
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        status: initial ? form.status : undefined,
        assignee: form.assignee.trim() || undefined,
        dueDate: form.dueDate || undefined,
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="todo-form" onSubmit={(e) => void handleSubmit(e)}>
      <h2 className="todo-form__title">{initial ? 'Edit Todo' : 'New Todo'}</h2>

      {validationError && <p className="todo-form__error">{validationError}</p>}

      <label className="todo-form__label">
        Title *
        <input
          className="todo-form__input"
          type="text"
          value={form.title}
          onChange={set('title')}
          maxLength={200}
          required
          autoFocus
        />
      </label>

      <label className="todo-form__label">
        Description
        <textarea
          className="todo-form__input"
          value={form.description}
          onChange={set('description')}
          maxLength={2000}
          rows={3}
        />
      </label>

      <div className="todo-form__row">
        <label className="todo-form__label">
          Priority
          <select className="todo-form__select" value={form.priority} onChange={set('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        {initial && (
          <label className="todo-form__label">
            Status
            <select className="todo-form__select" value={form.status} onChange={set('status')}>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>
        )}
      </div>

      <div className="todo-form__row">
        <label className="todo-form__label">
          Assignee
          <input
            className="todo-form__input"
            type="text"
            value={form.assignee}
            onChange={set('assignee')}
            placeholder="e.g. Alice"
          />
        </label>

        <label className="todo-form__label">
          Due Date
          <input
            className="todo-form__input"
            type="date"
            value={form.dueDate}
            onChange={set('dueDate')}
          />
        </label>
      </div>

      <div className="todo-form__actions">
        <button className="btn btn--primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Todo'}
        </button>
        <button className="btn" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
