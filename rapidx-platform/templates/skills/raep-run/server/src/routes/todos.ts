import { Router, Request, Response } from 'express';

export const todosRouter = Router();

// Placeholder — full implementation in Phase 2
todosRouter.get('/', (_req: Request, res: Response): void => {
  res.json([]);
});
