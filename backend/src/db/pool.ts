import pg from 'pg';
import { config } from '../config.js';

const databaseUrl = process.env.NODE_ENV === 'test' ? config.testDatabaseUrl : config.databaseUrl;

export const pool = new pg.Pool({
  connectionString: databaseUrl
});

export type DbClient = pg.PoolClient;
