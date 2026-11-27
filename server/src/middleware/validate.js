import { badRequest } from '../lib/errors.js';

/**
 * Middleware that validates the request body against a zod schema.
 *
 * The first validation issue is returned to the client so the UI can show one clear message.
 *
 * @param {import('zod').ZodTypeAny} schema
 */
export function validate(schema) {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return function validateBody(req, res, next) {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const issue = result.error.issues[0];
      next(badRequest(issue?.message ?? 'Invalid request.', issue?.path?.join('.'), 'VALIDATION_ERROR'));
      return;
    }

    req.body = result.data;
    next();
  };
}
