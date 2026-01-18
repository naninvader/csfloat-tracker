import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const holdings = await query(
      `SELECT h.id AS holding_id, h.quantity, h.purchase_price_cents, h.item_id,
              i.market_hash_name, i.display_name
       FROM holdings h
       JOIN items i ON i.id = h.item_id
       WHERE h.user_id = $1`,
      [userId],
    );

    const latestPrices = await query(
      `SELECT DISTINCT ON (item_id) item_id, price_cents, ts_utc
       FROM price_history
       WHERE item_id IN (SELECT id FROM items WHERE user_id = $1)
       ORDER BY item_id, ts_utc DESC`,
      [userId],
    );
    const latestMap = new Map(latestPrices.rows.map((row) => [row.item_id, row]));

    const totalCost = holdings.rows.reduce((sum, h) => sum + (h.purchase_price_cents || 0) * h.quantity, 0);
    const totalValue = holdings.rows.reduce(
      (sum, h) => sum + (latestMap.get(h.item_id)?.price_cents || 0) * h.quantity,
      0,
    );
    const totalPnL = totalValue - totalCost;
    const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    const portfolios = await query(
      `SELECT p.id, p.name,
              COUNT(ph.holding_id) AS holding_count
       FROM portfolios p
       LEFT JOIN portfolio_holdings ph ON ph.portfolio_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [userId],
    );

    const portfolioSummaries = [];
    for (const portfolio of portfolios.rows) {
      const summary = await query(
        `SELECT h.item_id, h.quantity, h.purchase_price_cents
         FROM holdings h
         JOIN portfolio_holdings ph ON ph.holding_id = h.id
         WHERE ph.portfolio_id = $1`,
        [portfolio.id],
      );
      const cost = summary.rows.reduce((sum, h) => sum + (h.purchase_price_cents || 0) * h.quantity, 0);
      const value = summary.rows.reduce(
        (sum, h) => sum + (latestMap.get(h.item_id)?.price_cents || 0) * h.quantity,
        0,
      );
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

      const change24h = await query(
        `SELECT SUM((latest.price_cents - prior.price_cents) * h.quantity) AS delta
         FROM holdings h
         JOIN portfolio_holdings ph ON ph.holding_id = h.id
         JOIN LATERAL (
           SELECT price_cents FROM price_history
           WHERE item_id = h.item_id
           ORDER BY ts_utc DESC LIMIT 1
         ) latest ON true
         JOIN LATERAL (
           SELECT price_cents FROM price_history
           WHERE item_id = h.item_id AND ts_utc <= NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours'
           ORDER BY ts_utc DESC LIMIT 1
         ) prior ON true
         WHERE ph.portfolio_id = $1`,
        [portfolio.id],
      );

      const change7d = await query(
        `SELECT SUM((latest.price_cents - prior.price_cents) * h.quantity) AS delta
         FROM holdings h
         JOIN portfolio_holdings ph ON ph.holding_id = h.id
         JOIN LATERAL (
           SELECT price_cents FROM price_history
           WHERE item_id = h.item_id
           ORDER BY ts_utc DESC LIMIT 1
         ) latest ON true
         JOIN LATERAL (
           SELECT price_cents FROM price_history
           WHERE item_id = h.item_id AND ts_utc <= NOW() AT TIME ZONE 'UTC' - INTERVAL '7 days'
           ORDER BY ts_utc DESC LIMIT 1
         ) prior ON true
         WHERE ph.portfolio_id = $1`,
        [portfolio.id],
      );

      portfolioSummaries.push({
        id: portfolio.id,
        name: portfolio.name,
        holdingCount: Number(portfolio.holding_count),
        costCents: cost,
        valueCents: value,
        pnlCents: pnl,
        pnlPct,
        change24hCents: Number(change24h.rows[0]?.delta || 0),
        change7dCents: Number(change7d.rows[0]?.delta || 0),
      });
    }

    res.json({
      totals: {
        costCents: totalCost,
        valueCents: totalValue,
        pnlCents: totalPnL,
        pnlPct: totalPnLPct,
      },
      portfolios: portfolioSummaries,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
