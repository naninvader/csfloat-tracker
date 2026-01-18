import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import holdingsRoutes from './routes/holdings.js';
import portfolioRoutes from './routes/portfolios.js';
import historyRoutes from './routes/history.js';
import dashboardRoutes from './routes/dashboard.js';
import healthRoutes from './routes/health.js';
import { authMiddleware, errorHandler } from './utils/middleware.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api', healthRoutes);

app.use('/api', authMiddleware, holdingsRoutes);
app.use('/api', authMiddleware, portfolioRoutes);
app.use('/api', authMiddleware, historyRoutes);
app.use('/api', authMiddleware, dashboardRoutes);

app.use(errorHandler);

export default app;
