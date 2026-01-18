import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const formatCents = (value) => `$${(value / 100).toFixed(2)}`;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [inventoryJson, setInventoryJson] = useState('');
  const [inventoryFile, setInventoryFile] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const payload = await apiFetch('/api/dashboard');
    setData(payload);
  };

  useEffect(() => {
    load();
  }, []);

  const importInventory = async () => {
    setMessage('');
    try {
      if (inventoryFile) {
        const formData = new FormData();
        formData.append('file', inventoryFile);
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/import-inventory`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Upload failed');
        }
      } else {
        await apiFetch('/api/import-inventory', {
          method: 'POST',
          body: JSON.stringify({ payload: inventoryJson }),
        });
      }
      setMessage('Inventory imported.');
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="grid grid-3">
        <div className="card">
          <h3>Total Value</h3>
          <p>{data ? formatCents(data.totals.valueCents) : '--'}</p>
        </div>
        <div className="card">
          <h3>Total Cost</h3>
          <p>{data ? formatCents(data.totals.costCents) : '--'}</p>
        </div>
        <div className="card">
          <h3>Unrealized P/L</h3>
          <p>{data ? `${formatCents(data.totals.pnlCents)} (${data.totals.pnlPct.toFixed(2)}%)` : '--'}</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Import Steam Inventory JSON</h3>
        <input
          className="input"
          type="file"
          accept="application/json"
          onChange={(e) => setInventoryFile(e.target.files?.[0] || null)}
        />
        <textarea
          className="input"
          rows={6}
          value={inventoryJson}
          onChange={(e) => setInventoryJson(e.target.value)}
        />
        <button className="button" onClick={importInventory}>Import</button>
        {message && <p>{message}</p>}
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Portfolios</h2>
        <div className="grid grid-3">
          {data?.portfolios?.map((portfolio) => (
            <div className="card" key={portfolio.id}>
              <div className="flex-between">
                <h3>{portfolio.name}</h3>
                <span className="badge">{portfolio.holdingCount} holdings</span>
              </div>
              <p>Value: {formatCents(portfolio.valueCents)}</p>
              <p>Cost: {formatCents(portfolio.costCents)}</p>
              <p>P/L: {formatCents(portfolio.pnlCents)} ({portfolio.pnlPct.toFixed(2)}%)</p>
              <p>24h: {formatCents(portfolio.change24hCents)}</p>
              <p>7d: {formatCents(portfolio.change7dCents)}</p>
            </div>
          ))}
          {data?.portfolios?.length === 0 && <p>No portfolios yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
