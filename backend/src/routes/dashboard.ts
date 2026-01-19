import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireAuth, async (req: AuthRequest, res) => {
  const holdingsResult = await pool.query(
    `SELECT h.id AS holding_id,
            h.quantity,
            h.purchase_price_cents,
            i.market_hash_name,
            latest.price_cents AS latest_price_cents,
            p24.price_cents AS price_24h_cents,
            p7.price_cents AS price_7d_cents
     FROM holdings h
     JOIN items i ON i.id = h.item_id
     LEFT JOIN LATERAL (
       SELECT price_cents
       FROM price_history
       WHERE item_id = h.item_id
       ORDER BY ts_utc DESC
       LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT price_cents
       FROM price_history
       WHERE item_id = h.item_id AND ts_utc <= NOW() - INTERVAL '24 hours'
       ORDER BY ts_utc DESC
       LIMIT 1
     ) p24 ON true
     LEFT JOIN LATERAL (
       SELECT price_cents
       FROM price_history
       WHERE item_id = h.item_id AND ts_utc <= NOW() - INTERVAL '7 days'
       ORDER BY ts_utc DESC
       LIMIT 1
     ) p7 ON true
     WHERE h.user_id = $1`,
    [req.user?.id]
  );

  const portfolioResult = await pool.query(
    `SELECT p.id, p.name, ph.holding_id
     FROM portfolios p
     LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
     WHERE p.user_id = $1`,
    [req.user?.id]
  );

  const holdings = holdingsResult.rows;
  const totals = holdings.reduce(
    (acc: { marketValue: number; costBasis: number; delta24h: number; delta7d: number }, row: any) => {
      const latest = row.latest_price_cents ?? 0;
      const cost = row.purchase_price_cents ?? 0;
      acc.marketValue += latest * row.quantity;
      acc.costBasis += cost * row.quantity;
      acc.delta24h += row.price_24h_cents ? (latest - row.price_24h_cents) * row.quantity : 0;
      acc.delta7d += row.price_7d_cents ? (latest - row.price_7d_cents) * row.quantity : 0;
      return acc;
    },
    { marketValue: 0, costBasis: 0, delta24h: 0, delta7d: 0 }
  );
  const portfolios: Record<number, { id: number; name: string; holdings: number[] }> = {};
  for (const row of portfolioResult.rows) {
    if (!portfolios[row.id]) {
      portfolios[row.id] = { id: row.id, name: row.name, holdings: [] };
    }
    if (row.holding_id) {
      portfolios[row.id].holdings.push(row.holding_id);
    }
  }

  const holdingsById = new Map<number, typeof holdings[0]>();
  for (const holding of holdings) {
    holdingsById.set(holding.holding_id, holding);
  }

  const portfolioSummaries = Object.values(portfolios).map((portfolio) => {
    const summary = portfolio.holdings.reduce(
      (acc, holdingId) => {
        const row = holdingsById.get(holdingId);
        if (!row) return acc;
        const latest = row.latest_price_cents ?? 0;
        const cost = row.purchase_price_cents ?? 0;
        acc.marketValue += latest * row.quantity;
        acc.costBasis += cost * row.quantity;
        acc.delta24h += row.price_24h_cents ? (latest - row.price_24h_cents) * row.quantity : 0;
        acc.delta7d += row.price_7d_cents ? (latest - row.price_7d_cents) * row.quantity : 0;
        acc.itemCount += row.quantity;
        return acc;
      },
      { marketValue: 0, costBasis: 0, delta24h: 0, delta7d: 0, itemCount: 0 }
    );
    return { ...portfolio, ...summary };
  });

  return res.json({
    totals: {
      marketValueCents: totals.marketValue,
      costBasisCents: totals.costBasis,
      unrealizedCents: totals.marketValue - totals.costBasis,
      delta24hCents: totals.delta24h,
      delta7dCents: totals.delta7d
    },
    portfolios: portfolioSummaries
  });
});

export default router;
