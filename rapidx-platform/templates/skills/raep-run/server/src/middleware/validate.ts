import { Request, Response, NextFunction, RequestHandler } from 'express';

export type ValidationRule = (body: Record<string, unknown>) => string | null;

export function validateBody(rules: ValidationRule[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body as Record<string, unknown>;

    for (const rule of rules) {
      const error = rule(body);
      if (error) {
        res.status(400).json({ error });
        return;
      }
    }

    next();
  };
}

export const requireTitle: ValidationRule = (body) => {
  if (typeof body.title !== 'string' || body.title.trim().length === 0) {
    return 'title is required and must be a non-empty string';
  }
  if (body.title.length > 200) {
    return 'title must be 200 characters or fewer';
  }
  return null;
};

export const validPriority: ValidationRule = (body) => {
  const valid = ['low', 'medium', 'high'];
  if (body.priority !== undefined && !valid.includes(body.priority as string)) {
    return `priority must be one of: ${valid.join(', ')}`;
  }
  return null;
};

export const validStatus: ValidationRule = (body) => {
  const valid = ['pending', 'in-progress', 'done'];
  if (body.status !== undefined && !valid.includes(body.status as string)) {
    return `status must be one of: ${valid.join(', ')}`;
  }
  return null;
};

export const validDescription: ValidationRule = (body) => {
  if (typeof body.description === 'string' && body.description.length > 2000) {
    return 'description must be 2000 characters or fewer';
  }
  return null;
};
