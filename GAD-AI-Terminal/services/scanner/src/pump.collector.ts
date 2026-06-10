/**
 * Pump.fun Collector
 *
 * Uses the real pump.fun frontend API — no API key required.
 * Endpoint: https://frontend-api.pump.fun/coins
 *
 * PUMP_FUN_API_KEY в .env не нужен — pump.fun не имеет официального
 * платного API с Bearer-токеном. Коллектор работает без него.
 */
import { fetchJson, retry, buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const BASE_URL = 'https://frontend-api.pump.fun';

interface PumpCoin {
  mint:              string;
  symbol?:           string;
  name?:             string;
  usd_market_cap?:   number;
  volume_24h?:       number;
  virtual_sol_reserves?: number;
  virtual_token_reserves?: number;
  bonding_curve?:    string;
  last_trade_unix_time?: number;
  reply_count?:      number;
}

export async function discoverPumpTokens(): Promise<string[]> {
  try {
    const coins = await retry(() =>
      fetchJson<PumpCoin[]>(
        `${BASE_URL}/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false`,
        { headers: { 'User-Agent': 'GAD-AI-Terminal/1.0' } }
      )
    );
    const mints = (Array.isArray(coins) ? coins : [])
      .map(c => c.mint)
      .filter(Boolean);
    console.info(`[pump.fun] discovered ${mints.length} tokens`);
    return mints;
  } catch (err: any) {
    console.warn('[pump.fun] discovery failed:', err.message);
    return [];
  }
}

export async function fetchPumpMetrics(mintAddress: string): Promise<TokenMetricsPayload> {
  try {
    const coin = await retry(() =>
      fetchJson<PumpCoin>(
        `${BASE_URL}/coins/${mintAddress}`,
        { headers: { 'User-Agent': 'GAD-AI-Terminal/1.0' } }
      )
    );

    const liqSol = (Number(coin?.virtual_sol_reserves ?? 0)) / 1e9;
    // Rough SOL price proxy — replace with real price if available
    const solPriceUsd = 150;
    const liquidityUsd = liqSol * solPriceUsd;

    // pump.fun doesn't expose granular volume breakdown — use available fields
    const volume24h = Number(coin?.volume_24h ?? 0);

    return {
      volume_5m:        0,           // not available from pump.fun
      volume_1h:        volume24h / 24,
      volume_24h:       volume24h,
      tx_count_5m:      0,
      tx_count_1h:      Math.round(Number(coin?.reply_count ?? 0) / 24),
      tx_count_24h:     Number(coin?.reply_count ?? 0),
      liquidity_change: 0,
      price_change_1h:  0,
      price_change_24h: 0
    };
  } catch {
    return buildDefaultMetrics();
  }
}
