import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const Analytics = () => {
  const [holdings, setHoldings] = useState([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('market_hash_name');
  const [sortDir, setSortDir] = useState('asc');
  const [message, setMessage] = useState('');

  const load = async () => {
    const data = await apiFetch('/api/holdings');
    setHoldings(data.holdings);
  };

  useEffect(() => {
    load();
  }, []);

  const updateHolding = async (id, updates) => {
    setMessage('');
    try {
      await apiFetch(`/api/holdings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const filtered = useMemo(() => {
    const list = holdings.filter((h) =>
      h.market_hash_name.toLowerCase().includes(search.toLowerCase()),
    );
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return list;
  }, [holdings, search, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div>
      <h1 className="page-title">Analytics</h1>
      <div className="card">
        <div className="flex">
          <input
            className="input"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {message && <p>{message}</p>}
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('market_hash_name')}>Name</th>
              <th onClick={() => toggleSort('quantity')}>Qty</th>
              <th>Portfolios</th>
              <th>Current Price</th>
              <th>P/L</th>
              <th>7d Change</th>
              <th>Purchase Price</th>
              <th>Purchase Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((holding) => (
              <tr key={holding.id}>
                <td>{holding.market_hash_name}</td>
                <td>{holding.quantity}</td>
                <td>{holding.portfolios.join(', ') || '—'}</td>
                <td>{holding.current_price_cents ? `$${(holding.current_price_cents / 100).toFixed(2)}` : '—'}</td>
                <td>
                  {(() => {
                    const cost = (holding.purchase_price_cents || 0) * holding.quantity;
                    const value = (holding.current_price_cents || 0) * holding.quantity;
                    const pnl = value - cost;
                    const pct = cost > 0 ? (pnl / cost) * 100 : 0;
                    return `$${(pnl / 100).toFixed(2)} (${pct.toFixed(2)}%)`;
                  })()}
                </td>
                <td>
                  {holding.price_7d_cents && holding.current_price_cents
                    ? `$${(((holding.current_price_cents - holding.price_7d_cents) * holding.quantity) / 100).toFixed(2)}`
                    : '—'}
                </td>
                <td>
                  <input
                    className="input"
                    value={holding.purchase_price_cents || ''}
                    placeholder="cents"
                    onBlur={(e) => updateHolding(holding.id, { purchase_price_cents: Number(e.target.value) || null })}
                    onChange={() => {}}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    type="datetime-local"
                    value={holding.purchase_date ? holding.purchase_date.slice(0, 16) : ''}
                    onBlur={(e) => updateHolding(holding.id, { purchase_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    onChange={() => {}}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={holding.notes || ''}
                    placeholder="notes"
                    onBlur={(e) => updateHolding(holding.id, { notes: e.target.value || null })}
                    onChange={() => {}}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 16 }}>
        <p>Prices, P/L, and 7d deltas appear after the hourly collector stores history.</p>
      </div>
    </div>
  );
};

export default Analytics;
