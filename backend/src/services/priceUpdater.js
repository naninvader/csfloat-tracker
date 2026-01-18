import { getClient, query } from '../db.js';
import { getPricesForItems } from './csfloatService.js';

const ADVISORY_LOCK_KEY = 424242; // arbitrary

export const runPriceUpdate = async () => {
  const client = await getClient();
  let locked = false;
  try {
    const lockResult = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [ADVISORY_LOCK_KEY]);
    locked = lockResult.rows[0].locked;
    if (!locked) {
      return { skipped: true };
    }

    const items = await client.query(
      'SELECT id, market_hash_name FROM items ORDER BY id',
    );
    const names = items.rows.map((row) => row.market_hash_name);
    if (names.length === 0) {
      return { skipped: false, inserted: 0 };
    }

    const prices = await getPricesForItems(names);
    let inserted = 0;
    for (const entry of prices) {
      if (entry.priceCents == null) continue;
      const item = items.rows.find((row) => row.market_hash_name === entry.marketHashName);
      if (!item) continue;
      await client.query(
        'INSERT INTO price_history (item_id, ts_utc, price_cents) VALUES ($1, NOW() AT TIME ZONE \'UTC\', $2)',
        [item.id, entry.priceCents],
      );
      inserted += 1;
    }
    return { skipped: false, inserted };
  } finally {
    if (locked) {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }
    client.release();
  }
};

export const getLatestPricesByItemId = async (itemIds) => {
  if (itemIds.length === 0) return new Map();
  const result = await query(
    `SELECT DISTINCT ON (item_id) item_id, price_cents, ts_utc
     FROM price_history
     WHERE item_id = ANY($1)
     ORDER BY item_id, ts_utc DESC`,
    [itemIds],
  );
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.item_id, row);
  }
  return map;
};
