import dotenv from 'dotenv';
import cron from 'node-cron';

import app from './app.js';
import { runPriceUpdate } from './services/priceUpdater.js';

dotenv.config();

const port = process.env.PORT || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${port}`);
});

cron.schedule('0 * * * *', async () => {
  try {
    const result = await runPriceUpdate();
    // eslint-disable-next-line no-console
    console.log('Price update finished', result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Price update error', err);
  }
});
