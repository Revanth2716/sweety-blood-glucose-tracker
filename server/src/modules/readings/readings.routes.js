import { Router } from 'express';
import { createRequireAuth } from '../../middleware/auth.js';
import { createReadingsService } from './readings.service.js';

/**
 * @param {{ db: import('../../db/index.js').Database, config: any }} deps
 */
export function createReadingsRouter({ db, config }) {
  const router = Router();
  const service = createReadingsService({ db });

  router.use(createRequireAuth(config));

  router.get('/', async (req, res) => {
    const result = await service.list(req.user.id, req.query);
    res.json(result);
  });

  router.get('/:id', async (req, res) => {
    const reading = await service.getById(req.user.id, req.params.id);
    res.json({ reading });
  });

  router.post('/', async (req, res) => {
    const reading = await service.create(req.user.id, req.body);
    res.status(201).json({ reading });
  });

  router.put('/:id', async (req, res) => {
    const reading = await service.update(req.user.id, req.params.id, req.body);
    res.json({ reading });
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(req.user.id, req.params.id);
    res.status(204).end();
  });

  return router;
}
