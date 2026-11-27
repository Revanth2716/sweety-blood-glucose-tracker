import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { createRequireAuth } from '../../middleware/auth.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import { createAuthService } from './auth.service.js';

/**
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createAuthRouter({ db, config }) {
  const router = Router();
  const service = createAuthService({ db, config });
  const requireAuth = createRequireAuth(config);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: { message: 'Too many attempts. Please try again later.', code: 'RATE_LIMITED' },
    },
  });

  router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
    const result = await service.register(req.body);
    res.status(201).json(result);
  });

  router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    const result = await service.login(req.body);
    res.json(result);
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await service.getUserById(req.user.id);
    res.json({ user });
  });

  return router;
}
