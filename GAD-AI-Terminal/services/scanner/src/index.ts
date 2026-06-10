import dotenv from 'dotenv';
import { startScanner } from './scheduler';

dotenv.config();

startScanner().catch((error) => {
  console.error('Scanner failed to start:', error);
  process.exit(1);
});
