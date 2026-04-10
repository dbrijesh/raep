import { Router } from 'express';
import { todosRouter } from './routes/todos';

export const router = Router();

router.use('/todos', todosRouter);
