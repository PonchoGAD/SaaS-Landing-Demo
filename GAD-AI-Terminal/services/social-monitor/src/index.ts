import dotenv from 'dotenv';
import { startSocialMonitor } from './monitor';

dotenv.config();

startSocialMonitor().catch((err) => {
  console.error('[social] Fatal error:', err);
  process.exit(1);
});
