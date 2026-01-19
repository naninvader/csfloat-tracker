import fs from 'fs';
import path from 'path';
import { pool } from './pool.js';

const migrationsDir = path.resolve('migrations');

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }

    await client.query('COMMIT');
    console.log('Migrations applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
