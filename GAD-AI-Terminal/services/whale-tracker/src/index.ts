import dotenv from 'dotenv';
import { startWhaleTracker } from './scheduler';

dotenv.config();

startWhaleTracker().catch((err) => {
  console.error('[whale-tracker] Fatal:', err);
  process.exit(1);
});
