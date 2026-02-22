import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Validate req.body against a Zod schema. On failure returns 400 with first error message.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
      return;
    }
    const first = result.error.flatten().formErrors[0] || result.error.message;
    res.status(400).json({ status: 'error', message: first });
  };
}

/**
 * Validate req.params against a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (result.success) {
      req.params = { ...req.params, ...result.data } as typeof req.params;
      next();
      return;
    }
    const first = result.error.flatten().formErrors[0] || result.error.message;
    res.status(400).json({ status: 'error', message: first });
  };
}
