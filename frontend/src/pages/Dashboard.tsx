import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../components/AuthProvider';
import { formatCents } from '../utils';

interface DashboardResponse {
  totals: {
    marketValueCents: number;
    costBasisCents: number;
    unrealizedCents: number;
    delta24hCents: number;
    delta7dCents: number;
  };
  portfolios: Array<{
    id: number;
    name: string;
    marketValue: number;
    costBasis: number;
    unrealized?: number;
    delta24h: number;
    delta7d: number;
    itemCount: number;
  }>;
}

const Dashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch('/api/dashboard', {}, token);
        setData(response);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    load();
  }, [token]);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!data) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <h1>Portfolio overview</h1>
          <p>Hourly CSFloat snapshots for your CS2 inventory.</p>
        </div>
        <div className="hero__metrics">
          <div className="metric-card">
            <span>Total value</span>
            <strong>{formatCents(data.totals.marketValueCents)}</strong>
          </div>
          <div className="metric-card">
            <span>Cost basis</span>
            <strong>{formatCents(data.totals.costBasisCents)}</strong>
          </div>
          <div className="metric-card">
            <span>Unrealized P/L</span>
            <strong>{formatCents(data.totals.unrealizedCents)}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <header className="card__header">
          <h2>Portfolios</h2>
          <p>24h and 7d deltas are derived from stored snapshots.</p>
        </header>
        <div className="portfolio-grid">
          {data.portfolios.map((portfolio) => (
            <div key={portfolio.id} className="portfolio-card">
              <h3>{portfolio.name}</h3>
              <div className="portfolio-card__row">
                <span>Value</span>
                <strong>{formatCents(portfolio.marketValue)}</strong>
              </div>
              <div className="portfolio-card__row">
                <span>Cost</span>
                <strong>{formatCents(portfolio.costBasis)}</strong>
              </div>
              <div className="portfolio-card__row">
                <span>Unrealized</span>
                <strong>{formatCents(portfolio.marketValue - portfolio.costBasis)}</strong>
              </div>
              <div className="portfolio-card__row">
                <span>24h</span>
                <strong>{formatCents(portfolio.delta24h)}</strong>
              </div>
              <div className="portfolio-card__row">
                <span>7d</span>
                <strong>{formatCents(portfolio.delta7d)}</strong>
              </div>
              <div className="portfolio-card__row">
                <span>Items</span>
                <strong>{portfolio.itemCount}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
