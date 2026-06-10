/**
 * BotShield — protects trades from sandwich/front-run bots.
 * Uses randomized slippage, random delays, and wash-trade detection.
 */

export interface BotShieldResult {
  threat_level:      'NONE' | 'LOW' | 'HIGH';
  bot_type:          string;
  recommended_delay: number;   // seconds to wait before trading
  safe_to_trade:     boolean;
  slippage_bps:      number;   // recommended slippage (randomized)
}

export interface TxData {
  txns?: { m5?: { buys?: number; sells?: number } };
  volume?: { m5?: number };
  priceChange?: { m5?: number };
}

/** Detect suspicious trading patterns that indicate bot activity */
export function detectBotActivity(pair: TxData): BotShieldResult {
  const buys5m  = pair.txns?.m5?.buys  ?? 0;
  const sells5m = pair.txns?.m5?.sells ?? 0;
  const vol5m   = Number(pair.volume?.m5 ?? 0);
  const pc5m    = Number(pair.priceChange?.m5 ?? 0);

  const total_txs = buys5m + sells5m;
  const avg_usd_per_tx = total_txs > 0 ? vol5m / total_txs : 0;

  let threat: 'NONE' | 'LOW' | 'HIGH' = 'NONE';
  let bot_type = 'none';
  const issues: string[] = [];

  // Sandwich detection: huge price move on very few transactions
  if (total_txs > 0 && total_txs <= 3 && Math.abs(pc5m) > 5) {
    threat = 'HIGH';
    bot_type = 'sandwich';
    issues.push(`${total_txs} txns moved price ${pc5m.toFixed(1)}%`);
  }

  // Wash-trade: many tiny transactions with minimal price impact
  if (total_txs > 20 && avg_usd_per_tx < 5 && Math.abs(pc5m) < 0.5) {
    threat = threat === 'HIGH' ? 'HIGH' : 'LOW';
    bot_type = bot_type !== 'none' ? bot_type : 'wash_trade';
    issues.push(`${total_txs} micro-txns avg $${avg_usd_per_tx.toFixed(1)}`);
  }

  // Sniper: extreme buy ratio in first 5m (might be sniper exiting)
  const buy_ratio = total_txs > 0 ? buys5m / total_txs : 0;
  if (buy_ratio > 0.9 && total_txs > 5 && pc5m > 15) {
    threat = threat === 'HIGH' ? 'HIGH' : 'LOW';
    bot_type = bot_type !== 'none' ? bot_type : 'sniper_exit';
    issues.push(`${(buy_ratio * 100).toFixed(0)}% buy ratio + ${pc5m.toFixed(1)}% spike`);
  }

  // Recommended delay: pause before entering to let bots finish
  const delay = threat === 'HIGH' ? 5 : threat === 'LOW' ? 2 : 0;

  return {
    threat_level:      threat,
    bot_type,
    recommended_delay: delay,
    safe_to_trade:     threat !== 'HIGH',
    slippage_bps:      getRandomizedSlippage(threat),
  };
}

/** Returns randomized slippage to prevent front-running on predictable values */
export function getRandomizedSlippage(threat: 'NONE' | 'LOW' | 'HIGH' = 'NONE'): number {
  const base = threat === 'HIGH' ? 150 : threat === 'LOW' ? 120 : 100;
  const jitter = Math.floor(Math.random() * 30); // ±0-30 bps random
  return base + jitter;
}

/** Random delay before executing a trade (defeats time-based front-run) */
export async function randomTradeDelay(minMs = 0, maxMs = 2000): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  if (ms > 0) await new Promise(r => setTimeout(r, ms));
}
