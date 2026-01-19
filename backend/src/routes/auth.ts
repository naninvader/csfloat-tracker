import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const { email, password } = result.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const inserted = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    const user = inserted.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
    return res.json({ token });
  } catch (error) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const { email, password } = result.data;
  const user = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [
    email
  ]);
  if (user.rowCount === 0) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const row = user.rows[0];
  const matches = await bcrypt.compare(password, row.password_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign({ id: row.id, email: row.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
  return res.json({ token });
});

const forgotSchema = z.object({
  email: z.string().email()
});

router.post('/forgot-password', async (req, res) => {
  const result = forgotSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const { email } = result.data;
  const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (user.rowCount === 0) {
    return res.json({ ok: true });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.rows[0].id, token, expiresAt]
  );

  console.log(`Password reset token for ${email}: ${token}`);
  return res.json({ ok: true });
});

const resetSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8)
});

router.post('/reset-password', async (req, res) => {
  const result = resetSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const { token, password } = result.data;
  const tokenRow = await pool.query(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  );

  if (tokenRow.rowCount === 0) {
    return res.status(400).json({ error: 'Invalid token.' });
  }
  const row = tokenRow.rows[0];
  if (row.used_at || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Token expired.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    row.user_id
  ]);
  await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [row.id]);
  return res.json({ ok: true });
});

export default router;
