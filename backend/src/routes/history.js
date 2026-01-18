import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';

const router = express.Router();

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

router.get('/history/item', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { market_hash_name: marketHashName } = req.query;
    const { from, to } = rangeSchema.parse(req.query);
    if (!marketHashName) return res.status(400).json({ error: 'Missing market_hash_name' });
    const itemResult = await query(
      'SELECT id FROM items WHERE user_id = $1 AND market_hash_name = $2',
      [userId, marketHashName],
    );
    if (!itemResult.rows[0]) return res.json({ history: [] });
    const itemId = itemResult.rows[0].id;
    const result = await query(
      `SELECT ts_utc, price_cents
       FROM price_history
       WHERE item_id = $1
       AND ($2::timestamptz IS NULL OR ts_utc >= $2)
       AND ($3::timestamptz IS NULL OR ts_utc <= $3)
       ORDER BY ts_utc`,
      [itemId, from || null, to || null],
    );
    return res.json({ history: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.get('/history/portfolio/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const portfolioId = Number(req.params.id);
    const { from, to } = rangeSchema.parse(req.query);

    const result = await query(
      `SELECT ph.ts_utc,
              SUM(ph.price_cents * h.quantity) AS value_cents
       FROM price_history ph
       JOIN holdings h ON h.item_id = ph.item_id
       JOIN portfolio_holdings pth ON pth.holding_id = h.id
       JOIN portfolios p ON p.id = pth.portfolio_id
       WHERE p.id = $1 AND p.user_id = $2
       AND ($3::timestamptz IS NULL OR ph.ts_utc >= $3)
       AND ($4::timestamptz IS NULL OR ph.ts_utc <= $4)
       GROUP BY ph.ts_utc
       ORDER BY ph.ts_utc`,
      [portfolioId, userId, from || null, to || null],
    );
    return res.json({ history: result.rows });
  } catch (err) {
    return next(err);
  }
});

router.get('/history/all', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { from, to } = rangeSchema.parse(req.query);
    const result = await query(
      `SELECT ph.ts_utc,
              SUM(ph.price_cents * h.quantity) AS value_cents
       FROM price_history ph
       JOIN holdings h ON h.item_id = ph.item_id
       WHERE h.user_id = $1
       AND ($2::timestamptz IS NULL OR ph.ts_utc >= $2)
       AND ($3::timestamptz IS NULL OR ph.ts_utc <= $3)
       GROUP BY ph.ts_utc
       ORDER BY ph.ts_utc`,
      [userId, from || null, to || null],
    );
    return res.json({ history: result.rows });
  } catch (err) {
    return next(err);
  }
});

export default router;
