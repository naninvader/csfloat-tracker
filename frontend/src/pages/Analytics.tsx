import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../components/AuthProvider';
import { formatCents } from '../utils';

interface HoldingRow {
  id: number;
  market_hash_name: string;
  display_name: string | null;
  icon_url: string | null;
  quantity: number;
  purchase_price_cents: number | null;
  purchase_date: string | null;
  notes: string | null;
  tags: string[];
  price_cents: number | null;
  portfolios: string[];
}

const Analytics = () => {
  const { token } = useAuth();
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'value' | 'pl'>('value');

  const load = async () => {
    try {
      const data = await apiFetch('/api/holdings', {}, token);
      setHoldings(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const filtered = useMemo(() => {
    return holdings
      .filter((holding) =>
        holding.market_hash_name.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = (a.price_cents ?? 0) * a.quantity;
        const bValue = (b.price_cents ?? 0) * b.quantity;
        const aPl = aValue - (a.purchase_price_cents ?? 0) * a.quantity;
        const bPl = bValue - (b.purchase_price_cents ?? 0) * b.quantity;
        if (sortKey === 'name') {
          return a.market_hash_name.localeCompare(b.market_hash_name);
        }
        if (sortKey === 'pl') {
          return bPl - aPl;
        }
        return bValue - aValue;
      });
  }, [holdings, query, sortKey]);

  const handleUpdate = async (holding: HoldingRow, updates: Partial<HoldingRow>) => {
    try {
      await apiFetch(
        `/api/holdings/${holding.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            purchase_price_cents: updates.purchase_price_cents ?? holding.purchase_price_cents,
            purchase_date: updates.purchase_date ?? holding.purchase_date,
            notes: updates.notes ?? holding.notes,
            tags: updates.tags ?? holding.tags
          })
        },
        token
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Holdings analytics</h1>
          <p>Review cost basis, tags, and unrealized P/L per item.</p>
        </div>
        <div className="filters">
          <input
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}>
            <option value="value">Sort by value</option>
            <option value="pl">Sort by P/L</option>
            <option value="name">Sort by name</option>
          </select>
        </div>
      </div>

      <div className="table">
        <div className="table__header">
          <span>Item</span>
          <span>Qty</span>
          <span>Portfolios</span>
          <span>Purchase</span>
          <span>Current</span>
          <span>P/L</span>
          <span>Notes</span>
        </div>
        {filtered.map((holding) => {
          const value = (holding.price_cents ?? 0) * holding.quantity;
          const cost = (holding.purchase_price_cents ?? 0) * holding.quantity;
          const pl = value - cost;
          return (
            <div className="table__row" key={holding.id}>
              <div className="table__cell item">
                {holding.icon_url && <img src={holding.icon_url} alt="" />}
                <span>{holding.display_name ?? holding.market_hash_name}</span>
              </div>
              <div className="table__cell">{holding.quantity}</div>
              <div className="table__cell small">
                {holding.portfolios.length ? holding.portfolios.join(', ') : '—'}
              </div>
              <div className="table__cell">
                <input
                  className="inline"
                  type="number"
                  placeholder="Price (cents)"
                  value={holding.purchase_price_cents ?? ''}
                  onChange={(e) =>
                    setHoldings((prev) =>
                      prev.map((row) =>
                        row.id === holding.id
                          ? {
                              ...row,
                              purchase_price_cents:
                                e.target.value === '' ? null : Number(e.target.value)
                            }
                          : row
                      )
                    )
                  }
                  onBlur={() => handleUpdate(holding, { purchase_price_cents: holding.purchase_price_cents })}
                />
                <input
                  className="inline"
                  type="date"
                  value={holding.purchase_date ?? ''}
                  onChange={(e) =>
                    setHoldings((prev) =>
                      prev.map((row) =>
                        row.id === holding.id ? { ...row, purchase_date: e.target.value } : row
                      )
                    )
                  }
                  onBlur={() => handleUpdate(holding, { purchase_date: holding.purchase_date })}
                />
              </div>
              <div className="table__cell">{formatCents(value)}</div>
              <div className="table__cell">{formatCents(pl)}</div>
              <div className="table__cell">
                <input
                  className="inline"
                  placeholder="Notes"
                  value={holding.notes ?? ''}
                  onChange={(e) =>
                    setHoldings((prev) =>
                      prev.map((row) =>
                        row.id === holding.id ? { ...row, notes: e.target.value } : row
                      )
                    )
                  }
                  onBlur={() => handleUpdate(holding, { notes: holding.notes })}
                />
                <input
                  className="inline"
                  placeholder="Tags (comma)"
                  value={holding.tags.join(', ')}
                  onChange={(e) =>
                    setHoldings((prev) =>
                      prev.map((row) =>
                        row.id === holding.id
                          ? { ...row, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }
                          : row
                      )
                    )
                  }
                  onBlur={() => handleUpdate(holding, { tags: holding.tags })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Analytics;
