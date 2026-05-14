import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, req: { method: req.method, url: req.url } }, 'Non-operational error');
    }

    const body: Record<string, unknown> = {
      success: false,
      error: err.message,
    };

    if (err instanceof ValidationError && err.details) {
      body['details'] = err.details;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unhandled / unexpected error
  logger.error(
    { err, req: { method: req.method, url: req.url, body: req.body } },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err as Error).message,
  });
}
