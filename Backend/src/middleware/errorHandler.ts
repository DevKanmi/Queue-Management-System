import { Request, Response, NextFunction } from 'express';

interface Err extends Error {
  statusCode?: number;
}

/**
 * User-friendly message for 500 errors so we never leak raw DB/stack to the client.
 */
function getClientMessage(err: Err, status: number): string {
  if (status !== 500) return err.message || 'Something went wrong';
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('relation') || msg.includes('invocation') || msg.includes('raw query') || msg.includes('prisma')) {
    return 'Something went wrong. Please try again later.';
  }
  return 'Something went wrong. Please try again later.';
}

/**
 * Global error handler middleware.
 * All unhandled errors return clean JSON; 500s get a safe, non-technical message.
 */
export function errorHandler(err: Err, req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', { route: req.path, method: req.method, message: err.message });
  const status = err.statusCode ?? 500;
  const message = getClientMessage(err, status);
  res.status(status).json({
    status: 'error',
    message: message || 'Something went wrong. Please try again later.',
  });
}
