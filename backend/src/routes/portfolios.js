import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';

const router = express.Router();

router.get('/portfolios', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `SELECT p.id, p.name,
              COUNT(ph.holding_id) AS holding_count
       FROM portfolios p
       LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [userId],
    );
    res.json({ portfolios: result.rows });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({ name: z.string().min(1).max(100) });

router.post('/portfolios', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name } = createSchema.parse(req.body);
    const result = await query(
      'INSERT INTO portfolios (user_id, name) VALUES ($1, $2) RETURNING id, name',
      [userId, name],
    );
    res.json({ portfolio: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({ name: z.string().min(1).max(100) });

router.put('/portfolios/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { name } = updateSchema.parse(req.body);
    await query(
      'UPDATE portfolios SET name = $1 WHERE id = $2 AND user_id = $3',
      [name, Number(req.params.id), userId],
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/portfolios/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await query('DELETE FROM portfolios WHERE id = $1 AND user_id = $2', [Number(req.params.id), userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const assignSchema = z.object({ holdingIds: z.array(z.number().int()) });

router.post('/portfolios/:id/assign-holdings', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const portfolioId = Number(req.params.id);
    const { holdingIds } = assignSchema.parse(req.body);
    const portfolio = await query('SELECT id FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, userId]);
    if (!portfolio.rows[0]) return res.status(404).json({ error: 'Portfolio not found' });

    await query('DELETE FROM portfolio_holdings WHERE portfolio_id = $1', [portfolioId]);
    for (const holdingId of holdingIds) {
      await query(
        'INSERT INTO portfolio_holdings (portfolio_id, holding_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [portfolioId, holdingId],
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
