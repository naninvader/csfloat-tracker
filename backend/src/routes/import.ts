import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { parseInventoryPayload } from '../utils/inventory.js';

const router = Router();

const payloadSchema = z.object({
  inventory: z.any()
});

router.post('/import-inventory', requireAuth, async (req: AuthRequest, res) => {
  const result = payloadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const { counts, metadata, skipped } = parseInventoryPayload(result.data.inventory);
  if (Object.keys(counts).length === 0) {
    return res.status(400).json({ error: 'No items found in inventory.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedHoldings: number[] = [];

    for (const [marketHashName, quantity] of Object.entries(counts)) {
      const meta = metadata[marketHashName] || {};
      const itemResult = await client.query(
        `INSERT INTO items (user_id, market_hash_name, display_name, icon_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, market_hash_name)
         DO UPDATE SET display_name = COALESCE(items.display_name, EXCLUDED.display_name),
                       icon_url = COALESCE(items.icon_url, EXCLUDED.icon_url)
         RETURNING id`,
        [req.user?.id, marketHashName, meta.displayName ?? null, meta.iconUrl ?? null]
      );
      const itemId = itemResult.rows[0].id;
      const holdingResult = await client.query(
        `INSERT INTO holdings (user_id, item_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [req.user?.id, itemId, quantity]
      );
      insertedHoldings.push(holdingResult.rows[0].id);
    }

    await client.query('COMMIT');
    return res.json({ imported: insertedHoldings.length, skipped });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Import failed.' });
  } finally {
    client.release();
  }
});

export default router;
