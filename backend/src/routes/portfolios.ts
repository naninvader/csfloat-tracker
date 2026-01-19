import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/portfolios', requireAuth, async (req: AuthRequest, res) => {
  const result = await pool.query('SELECT id, name FROM portfolios WHERE user_id = $1 ORDER BY name', [
    req.user?.id
  ]);
  return res.json(result.rows);
});

const createSchema = z.object({
  name: z.string().min(1)
});

router.post('/portfolios', requireAuth, async (req: AuthRequest, res) => {
  const payload = createSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const result = await pool.query(
    'INSERT INTO portfolios (user_id, name) VALUES ($1, $2) RETURNING id, name',
    [req.user?.id, payload.data.name]
  );
  return res.status(201).json(result.rows[0]);
});

router.put('/portfolios/:id', requireAuth, async (req: AuthRequest, res) => {
  const payload = createSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const result = await pool.query(
    'UPDATE portfolios SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name',
    [payload.data.name, req.params.id, req.user?.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Portfolio not found.' });
  }
  return res.json(result.rows[0]);
});

router.delete('/portfolios/:id', requireAuth, async (req: AuthRequest, res) => {
  const result = await pool.query('DELETE FROM portfolios WHERE id = $1 AND user_id = $2', [
    req.params.id,
    req.user?.id
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Portfolio not found.' });
  }
  return res.json({ ok: true });
});

const assignSchema = z.object({
  holdingIds: z.array(z.number().int())
});

router.post('/portfolios/:id/assign-holdings', requireAuth, async (req: AuthRequest, res) => {
  const payload = assignSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const portfolioId = Number(req.params.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM portfolio_holdings WHERE portfolio_id = $1', [portfolioId]);
    for (const holdingId of payload.data.holdingIds) {
      await client.query(
        'INSERT INTO portfolio_holdings (portfolio_id, holding_id) VALUES ($1, $2)',
        [portfolioId, holdingId]
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Assignment failed.' });
  } finally {
    client.release();
  }
});

export default router;
