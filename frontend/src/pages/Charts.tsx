import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { apiFetch } from '../api';
import { useAuth } from '../components/AuthProvider';

interface Holding {
  id: number;
  market_hash_name: string;
}

interface Portfolio {
  id: number;
  name: string;
}

const rangeOptions = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '1y', value: 365 },
  { label: 'Max', value: 0 }
];

const Charts = () => {
  const { token } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [scope, setScope] = useState<'all' | 'portfolio' | 'item'>('all');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [range, setRange] = useState<number>(30);
  const [series, setSeries] = useState<Array<{ ts_utc: string; value_cents?: number; price_cents?: number }>>(
    []
  );

  useEffect(() => {
    const loadOptions = async () => {
      const holdingData = await apiFetch('/api/holdings', {}, token);
      const portfolioData = await apiFetch('/api/portfolios', {}, token);
      setHoldings(holdingData.map((row: Holding) => ({ id: row.id, market_hash_name: row.market_hash_name })));
      setPortfolios(portfolioData);
    };
    loadOptions();
  }, [token]);

  useEffect(() => {
    const loadHistory = async () => {
      const to = new Date().toISOString();
      const from = range ? new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString() : undefined;
      let path = '/api/history/all';
      if (scope === 'portfolio' && selectedPortfolio) {
        path = `/api/history/portfolio/${selectedPortfolio}`;
      }
      if (scope === 'item' && selectedItem) {
        path = `/api/history/item?market_hash_name=${encodeURIComponent(selectedItem)}`;
      }

      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const data = await apiFetch(`${path}${params.toString() ? `&${params}` : ''}`.replace('&', '?'), {}, token);
      setSeries(data);
    };
    if (scope === 'all' || (scope === 'portfolio' && selectedPortfolio) || (scope === 'item' && selectedItem)) {
      loadHistory();
    }
  }, [scope, selectedPortfolio, selectedItem, range, token]);

  const chartOption = useMemo(() => {
    const points = series.map((row) => [row.ts_utc, (row.value_cents ?? row.price_cents ?? 0) / 100]);
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
      series: [
        {
          name: scope === 'item' ? 'Price' : 'Value',
          type: 'line',
          areaStyle: {},
          data: points
        }
      ]
    };
  }, [series, scope]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Historical charts</h1>
          <p>Track hourly CSFloat price snapshots over time.</p>
        </div>
        <div className="filters">
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="all">All items</option>
            <option value="portfolio">Portfolio</option>
            <option value="item">Single item</option>
          </select>
          {scope === 'portfolio' && (
            <select value={selectedPortfolio} onChange={(e) => setSelectedPortfolio(e.target.value)}>
              <option value="">Select portfolio</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
            </select>
          )}
          {scope === 'item' && (
            <select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
              <option value="">Select item</option>
              {holdings.map((holding) => (
                <option key={holding.id} value={holding.market_hash_name}>
                  {holding.market_hash_name}
                </option>
              ))}
            </select>
          )}
          <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
            {rangeOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card">
        <ReactECharts option={chartOption} style={{ height: 420 }} />
      </div>
    </div>
  );
};

export default Charts;
