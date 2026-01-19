import cron from 'node-cron';
import app from './app.js';
import { config } from './config.js';
import { runPriceJob } from './services/priceJob.js';

app.listen(config.port, () => {
  console.log(`API running on port ${config.port}`);
});

cron.schedule(config.priceJobCron, async () => {
  try {
    await runPriceJob();
  } catch (error) {
    console.error('Price job failed', error);
  }
});
