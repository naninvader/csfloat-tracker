import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { query } from '../db.js';
import { parseInventory } from '../utils/inventoryParser.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/import-inventory', upload.single('file'), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    let payload = req.body?.payload;
    if (req.file) {
      payload = req.file.buffer.toString('utf8');
    }
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    if (!payload) {
      return res.status(400).json({ error: 'Missing payload' });
    }

    const items = parseInventory(payload);
    const results = [];

    for (const entry of items) {
      const itemResult = await query(
        `INSERT INTO items (user_id, market_hash_name, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, market_hash_name)
         DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id`,
        [userId, entry.marketHashName, entry.marketHashName],
      );
      const itemId = itemResult.rows[0].id;
      const holdingResult = await query(
        `SELECT id FROM holdings
         WHERE user_id = $1 AND item_id = $2 AND is_bulk = true`,
        [userId, itemId],
      );
      if (holdingResult.rows[0]) {
        await query(
          'UPDATE holdings SET quantity = $1 WHERE id = $2',
          [entry.quantity, holdingResult.rows[0].id],
        );
        results.push({ marketHashName: entry.marketHashName, quantity: entry.quantity, updated: true });
      } else {
        await query(
          `INSERT INTO holdings (user_id, item_id, quantity, is_bulk)
           VALUES ($1, $2, $3, true)`,
          [userId, itemId, entry.quantity],
        );
        results.push({ marketHashName: entry.marketHashName, quantity: entry.quantity, created: true });
      }
    }

    return res.json({ imported: results.length, results });
  } catch (err) {
    return next(err);
  }
});

router.get('/holdings', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const result = await query(
      `SELECT h.id, h.quantity, h.purchase_price_cents, h.purchase_date, h.notes, h.tags, h.is_bulk,
              i.market_hash_name, i.display_name, i.icon_url,
              latest.price_cents AS current_price_cents,
              latest.ts_utc AS current_price_ts,
              prior.price_cents AS price_7d_cents,
              COALESCE(ARRAY_AGG(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') AS portfolios
       FROM holdings h
       JOIN items i ON i.id = h.item_id
       LEFT JOIN LATERAL (
         SELECT price_cents, ts_utc FROM price_history
         WHERE item_id = h.item_id
         ORDER BY ts_utc DESC LIMIT 1
       ) latest ON true
       LEFT JOIN LATERAL (
         SELECT price_cents FROM price_history
         WHERE item_id = h.item_id AND ts_utc <= NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days'
         ORDER BY ts_utc DESC LIMIT 1
       ) prior ON true
       LEFT JOIN portfolio_holdings ph ON ph.holding_id = h.id
       LEFT JOIN portfolios p ON p.id = ph.portfolio_id
       WHERE h.user_id = $1
       GROUP BY h.id, i.market_hash_name, i.display_name, i.icon_url, latest.price_cents, latest.ts_utc, prior.price_cents
       ORDER BY i.market_hash_name`,
      [userId],
    );
    return res.json({ holdings: result.rows });
  } catch (err) {
    return next(err);
  }
});

const updateSchema = z.object({
  quantity: z.number().int().positive().optional(),
  purchase_price_cents: z.number().int().nonnegative().nullable().optional(),
  purchase_date: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().max(40)).optional(),
});

router.put('/holdings/:id', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const holdingId = Number(req.params.id);
    const data = updateSchema.parse(req.body);
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
    if (fields.length === 0) return res.json({ ok: true });
    values.push(userId, holdingId);
    await query(
      `UPDATE holdings SET ${fields.join(', ')} WHERE user_id = $${idx} AND id = $${idx + 1}`,
      values,
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
