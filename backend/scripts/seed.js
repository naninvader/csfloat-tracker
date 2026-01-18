import dotenv from 'dotenv';
import { hashPassword } from '../src/utils/auth.js';
import { query } from '../src/db.js';

dotenv.config();

const run = async () => {
  const email = process.env.SEED_EMAIL || 'demo@csfloat.local';
  const password = process.env.SEED_PASSWORD || 'Password123!';
  const passwordHash = await hashPassword(password);
  const user = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id',
    [email, passwordHash],
  );
  const userId = user.rows[0]?.id;
  if (!userId) {
    // eslint-disable-next-line no-console
    console.log('Seed user already exists');
    return;
  }
  await query('INSERT INTO portfolios (user_id, name) VALUES ($1, $2)', [userId, 'Demo Portfolio']);
  // eslint-disable-next-line no-console
  console.log(`Seeded user ${email} with password ${password}`);
};

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
