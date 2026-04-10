import { Router, Request, Response } from 'express';
import {
  findAllTodos,
  findTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../db/todoRepository';
import {
  validateBody,
  requireTitle,
  validPriority,
  validStatus,
  validDescription,
} from '../middleware/validate';
import type { CreateTodoInput, UpdateTodoInput, TodoFilters } from '../types/todo';

export const todosRouter = Router();

// GET /api/todos?status=&priority=&assignee=
todosRouter.get('/', (req: Request, res: Response): void => {
  const filters: TodoFilters = {
    status: req.query.status as TodoFilters['status'],
    priority: req.query.priority as TodoFilters['priority'],
    assignee: req.query.assignee as string | undefined,
  };
  const todos = findAllTodos(filters);
  res.json(todos);
});

// GET /api/todos/:id
todosRouter.get('/:id', (req: Request, res: Response): void => {
  const todo = findTodoById(req.params.id);
  if (!todo) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  res.json(todo);
});

// POST /api/todos
todosRouter.post(
  '/',
  validateBody([requireTitle, validPriority, validDescription]),
  (req: Request, res: Response): void => {
    const input = req.body as CreateTodoInput;
    const todo = createTodo(input);
    res.status(201).json(todo);
  },
);

// PUT /api/todos/:id
todosRouter.put(
  '/:id',
  validateBody([validStatus, validPriority, validDescription]),
  (req: Request, res: Response): void => {
    const input = req.body as UpdateTodoInput;
    const todo = updateTodo(req.params.id, input);
    if (!todo) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.json(todo);
  },
);

// DELETE /api/todos/:id
todosRouter.delete('/:id', (req: Request, res: Response): void => {
  const deleted = deleteTodo(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Todo not found' });
    return;
  }
  res.status(204).send();
});
