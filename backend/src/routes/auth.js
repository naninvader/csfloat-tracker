import express from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { query } from '../db.js';
import { hashPassword, comparePassword, signToken } from '../utils/auth.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), passwordHash],
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

const forgotSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const result = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt],
    );

    // In production, send token via email. For MVP, return in response.
    return res.json({ ok: true, resetToken: token });
  } catch (err) {
    return next(err);
  }
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
      `SELECT prt.id, prt.user_id
       FROM password_reset_tokens prt
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AT TIME ZONE 'UTC'`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return res.status(400).json({ error: 'Invalid or expired token' });
    const newHash = await hashPassword(password);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, row.user_id]);
    await query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
