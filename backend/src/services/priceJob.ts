import { pool } from '../db/pool.js';
import { CsfloatService } from './csfloatService.js';
import { config } from '../config.js';

const LOCK_ID = 987654;

export const runPriceJob = async () => {
  const client = await pool.connect();
  let locked = false;
  try {
    const lockResult = await client.query('SELECT pg_try_advisory_lock($1) as locked', [LOCK_ID]);
    locked = Boolean(lockResult.rows[0]?.locked);
    if (!locked) {
      return;
    }

    const items = await client.query(
      'SELECT id, market_hash_name FROM items'
    );
    if (items.rowCount === 0) {
      return;
    }

    const service = new CsfloatService(config.csfloatApiKey);
    let priceList: Record<string, number> | null = null;
    if (config.csfloatEnablePriceList) {
      try {
        priceList = await service.getPriceList();
      } catch (error) {
        priceList = null;
      }
    }

    const now = new Date();

    for (const item of items.rows) {
      const price = priceList?.[item.market_hash_name]
        ? priceList[item.market_hash_name]
        : await service.getPriceCents(item.market_hash_name);

      await client.query(
        'INSERT INTO price_history (item_id, ts_utc, price_cents) VALUES ($1, $2, $3)',
        [item.id, now, price]
      );
    }
  } finally {
    if (locked) {
      await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]);
    }
    client.release();
  }
};
