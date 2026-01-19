import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import importRoutes from './routes/import.js';
import holdingsRoutes from './routes/holdings.js';
import portfoliosRoutes from './routes/portfolios.js';
import historyRoutes from './routes/history.js';
import dashboardRoutes from './routes/dashboard.js';
import healthRoutes from './routes/health.js';
import { config } from './config.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api', importRoutes);
app.use('/api', holdingsRoutes);
app.use('/api', portfoliosRoutes);
app.use('/api', historyRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', healthRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

export default app;
