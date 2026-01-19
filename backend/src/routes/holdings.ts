import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/holdings', requireAuth, async (req: AuthRequest, res) => {
  const result = await pool.query(
    `SELECT h.id,
            h.quantity,
            h.purchase_price_cents,
            h.purchase_date,
            h.notes,
            h.tags,
            i.market_hash_name,
            i.display_name,
            i.icon_url,
            latest.price_cents,
            COALESCE(array_remove(array_agg(p.name), NULL), ARRAY[]::text[]) AS portfolios
     FROM holdings h
     JOIN items i ON i.id = h.item_id
     LEFT JOIN portfolio_holdings phold ON phold.holding_id = h.id
     LEFT JOIN portfolios p ON p.id = phold.portfolio_id
     LEFT JOIN LATERAL (
       SELECT price_cents
       FROM price_history ph
       WHERE ph.item_id = h.item_id
       ORDER BY ts_utc DESC
       LIMIT 1
     ) latest ON true
     WHERE h.user_id = $1
     GROUP BY h.id, i.id, latest.price_cents
     ORDER BY i.market_hash_name`,
    [req.user?.id]
  );
  return res.json(result.rows);
});

const updateSchema = z.object({
  quantity: z.number().int().positive().optional(),
  purchase_price_cents: z.number().int().nonnegative().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional()
});

router.put('/holdings/:id', requireAuth, async (req: AuthRequest, res) => {
  const payload = updateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const { quantity, purchase_price_cents, purchase_date, notes, tags } = payload.data;
  const updated = await pool.query(
    `UPDATE holdings
     SET quantity = COALESCE($1, quantity),
         purchase_price_cents = COALESCE($2, purchase_price_cents),
         purchase_date = COALESCE($3, purchase_date),
         notes = COALESCE($4, notes),
         tags = COALESCE($5, tags)
     WHERE id = $6 AND user_id = $7
     RETURNING id`,
    [quantity ?? null, purchase_price_cents ?? null, purchase_date ?? null, notes ?? null, tags ?? null, req.params.id, req.user?.id]
  );

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Holding not found.' });
  }

  return res.json({ ok: true });
});

export default router;
