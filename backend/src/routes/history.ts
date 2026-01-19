import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

router.get('/history/item', requireAuth, async (req: AuthRequest, res) => {
  const range = rangeSchema.safeParse(req.query);
  if (!range.success) {
    return res.status(400).json({ error: 'Invalid range.' });
  }
  const { market_hash_name } = req.query;
  if (typeof market_hash_name !== 'string') {
    return res.status(400).json({ error: 'Missing market_hash_name.' });
  }

  const item = await pool.query(
    'SELECT id FROM items WHERE user_id = $1 AND market_hash_name = $2',
    [req.user?.id, market_hash_name]
  );
  if (item.rowCount === 0) {
    return res.json([]);
  }

  const result = await pool.query(
    `SELECT ts_utc, price_cents
     FROM price_history
     WHERE item_id = $1
       AND ($2::timestamptz IS NULL OR ts_utc >= $2)
       AND ($3::timestamptz IS NULL OR ts_utc <= $3)
     ORDER BY ts_utc`,
    [item.rows[0].id, range.data.from ?? null, range.data.to ?? null]
  );
  return res.json(result.rows);
});

router.get('/history/portfolio/:id', requireAuth, async (req: AuthRequest, res) => {
  const range = rangeSchema.safeParse(req.query);
  if (!range.success) {
    return res.status(400).json({ error: 'Invalid range.' });
  }
  const result = await pool.query(
    `SELECT ph.ts_utc,
            SUM(ph.price_cents * h.quantity)::bigint AS value_cents
     FROM portfolio_holdings phold
     JOIN holdings h ON h.id = phold.holding_id
     JOIN price_history ph ON ph.item_id = h.item_id
     WHERE phold.portfolio_id = $1
       AND h.user_id = $2
       AND ($3::timestamptz IS NULL OR ph.ts_utc >= $3)
       AND ($4::timestamptz IS NULL OR ph.ts_utc <= $4)
     GROUP BY ph.ts_utc
     ORDER BY ph.ts_utc`,
    [req.params.id, req.user?.id, range.data.from ?? null, range.data.to ?? null]
  );
  return res.json(result.rows);
});

router.get('/history/all', requireAuth, async (req: AuthRequest, res) => {
  const range = rangeSchema.safeParse(req.query);
  if (!range.success) {
    return res.status(400).json({ error: 'Invalid range.' });
  }
  const result = await pool.query(
    `SELECT ph.ts_utc,
            SUM(ph.price_cents * h.quantity)::bigint AS value_cents
     FROM holdings h
     JOIN price_history ph ON ph.item_id = h.item_id
     WHERE h.user_id = $1
       AND ($2::timestamptz IS NULL OR ph.ts_utc >= $2)
       AND ($3::timestamptz IS NULL OR ph.ts_utc <= $3)
     GROUP BY ph.ts_utc
     ORDER BY ph.ts_utc`,
    [req.user?.id, range.data.from ?? null, range.data.to ?? null]
  );
  return res.json(result.rows);
});

export default router;
