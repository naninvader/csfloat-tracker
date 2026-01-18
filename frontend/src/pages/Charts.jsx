import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { apiFetch } from '../lib/api.js';

const Charts = () => {
  const [scope, setScope] = useState('all');
  const [itemName, setItemName] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [range, setRange] = useState('30d');
  const [holdings, setHoldings] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    const load = async () => {
      const holdingsData = await apiFetch('/api/holdings');
      const portfoliosData = await apiFetch('/api/portfolios');
      setHoldings(holdingsData.holdings);
      setPortfolios(portfoliosData.portfolios);
      if (holdingsData.holdings.length > 0) {
        setItemName(holdingsData.holdings[0].market_hash_name);
      }
      if (portfoliosData.portfolios.length > 0) {
        setPortfolioId(portfoliosData.portfolios[0].id);
      }
    };
    load();
  }, []);

  const rangeToDates = () => {
    const now = new Date();
    if (range === 'max') return { from: null, to: now.toISOString() };
    const days = Number(range.replace('d', '').replace('y', ''));
    const ms = range.endsWith('y') ? days * 365 : days;
    const from = new Date(now.getTime() - ms * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: now.toISOString() };
  };

  const loadHistory = async () => {
    const { from, to } = rangeToDates();
    let endpoint = '/api/history/all';
    if (scope === 'item') {
      endpoint = `/api/history/item?market_hash_name=${encodeURIComponent(itemName)}`;
    }
    if (scope === 'portfolio') {
      endpoint = `/api/history/portfolio/${portfolioId}`;
    }
    const query = new URLSearchParams();
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    const data = await apiFetch(`${endpoint}${query.toString() ? `&${query.toString()}` : ''}`);
    setSeries(data.history || []);
  };

  useEffect(() => {
    if (scope === 'item' && !itemName) return;
    if (scope === 'portfolio' && !portfolioId) return;
    loadHistory();
  }, [scope, itemName, portfolioId, range]);

  return (
    <div>
      <h1 className="page-title">Charts</h1>
      <div className="card">
        <div className="flex">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All Items</option>
            <option value="portfolio">Portfolio</option>
            <option value="item">Single Item</option>
          </select>
          {scope === 'portfolio' && (
            <select value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          )}
          {scope === 'item' && (
            <select value={itemName} onChange={(e) => setItemName(e.target.value)}>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.market_hash_name}>{holding.market_hash_name}</option>
              ))}
            </select>
          )}
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="1y">1y</option>
            <option value="max">max</option>
          </select>
        </div>
        <Plot
          data={[
            {
              x: series.map((point) => point.ts_utc),
              y: series.map((point) => point.value_cents || point.price_cents),
              type: 'scatter',
              mode: 'lines',
              line: { color: '#818cf8' },
              fill: 'tozeroy',
            },
          ]}
          layout={{
            paper_bgcolor: '#1a2033',
            plot_bgcolor: '#1a2033',
            font: { color: '#e2e8f0' },
            xaxis: { title: 'Time' },
            yaxis: { title: 'Cents' },
            height: 420,
          }}
        />
      </div>
    </div>
  );
};

export default Charts;
