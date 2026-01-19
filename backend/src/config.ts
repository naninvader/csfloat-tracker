import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  csfloatApiKey: process.env.CSFLOAT_API_KEY || '',
  csfloatRateLimitMs: Number(process.env.CSFLOAT_RATE_LIMIT_MS || 1000),
  csfloatCacheTtlMs: Number(process.env.CSFLOAT_CACHE_TTL_MS || 300000),
  csfloatEnablePriceList: process.env.CSFLOAT_ENABLE_PRICE_LIST === 'true',
  csfloatPriceListUrl: process.env.CSFLOAT_PRICE_LIST_URL || 'https://csfloat.com/api/v1/price-list',
  priceJobCron: process.env.PRICE_JOB_CRON || '0 * * * *',
  testDatabaseUrl: process.env.TEST_DATABASE_URL || ''
};
