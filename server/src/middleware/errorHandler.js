import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';

/**
 * Catch-all handler for a request that matched no route.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found.`, 'NOT_FOUND'));
}

/**
 * Convert any thrown error into the JSON error envelope.
 *
 * @param {unknown} error
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        code: error.code,
        ...(error.field ? { field: error.field } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    res.status(400).json({
      error: {
        message: issue?.message ?? 'Invalid request.',
        code: 'VALIDATION_ERROR',
        ...(issue?.path?.length ? { field: issue.path.join('.') } : {}),
      },
    });
    return;
  }

  // PostgreSQL unique violation - the safety net behind "one reading per slot per day".
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    res.status(409).json({
      error: { message: 'That reading already exists.', code: 'DUPLICATE_READING' },
    });
    return;
  }

  console.error('Unhandled error:', error);
  res.status(500).json({
    error: { message: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' },
  });
}
