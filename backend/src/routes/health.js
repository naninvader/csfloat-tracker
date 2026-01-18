import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default router;
