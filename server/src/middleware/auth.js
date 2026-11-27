import { verifyToken } from '../lib/jwt.js';
import { unauthorized } from '../lib/errors.js';

/**
 * Middleware that rejects requests without a valid bearer token.
 *
 * @param {{ jwtSecret: string }} config
 */
export function createRequireAuth(config) {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  return function requireAuth(req, res, next) {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (!token || scheme?.toLowerCase() !== 'bearer') {
      next(unauthorized('Authentication required.'));
      return;
    }

    try {
      const payload = verifyToken(token, config);
      req.user = { id: payload.sub, email: payload.email };
      next();
    } catch {
      next(unauthorized('Your session has expired. Please log in again.', 'INVALID_TOKEN'));
    }
  };
}
