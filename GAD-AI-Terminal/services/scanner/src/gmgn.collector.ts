/**
 * GMGN Collector
 *
 * GMGN имеет два уровня API:
 *
 * 1. Публичный price API (без ключа):
 *    https://gmgn.ai/defi/quotation/v1/tokens/sol/{mint}
 *    Возвращает цену, объём, изменение цены.
 *
 * 2. Trading/Agent API (требует GMGN_API_KEY):
 *    Для получения ключа: gmgn.ai → "GMGN OpenAPI" или написать им напрямую.
 *    Если ключ не задан — используем публичный API (уровень 1).
 *
 * GMGN_API_KEY = ключ от gmgn.ai/openapi (see README for instructions)
 */
import { fetchJson, retry, buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const GMGN_API_KEY = process.env.GMGN_API_KEY ?? '';

// Public quotation API — works without key
const PUBLIC_BASE = 'https://gmgn.ai/defi/quotation/v1';
// Agent/Trading API — requires key
const AGENT_BASE  = process.env.GMGN_API_BASE || 'https://gmgn.ai/api/v1';

interface GmgnPublicToken {
  address?:           string;
  symbol?:            string;
  price?:             number;
  price_change_1h?:   number;
  price_change_24h?:  number;
  volume_24h?:        number;
  liquidity?:         number;
  market_cap?:        number;
  holder_count?:      number;
}

interface GmgnTrendingResponse {
  code?: number;
  data?: { rank?: Array<{ address?: string }> };
}

/** Discovery via public GMGN trending endpoint */
async function discoverViaPublicApi(): Promise<string[]> {
  // GMGN public trending — Solana chain, rank by 1h volume
  const res = await fetchJson<GmgnTrendingResponse>(
    `${PUBLIC_BASE}/rank/sol/swaps/1h?orderby=swaps&direction=desc&filters[]=not_wash_trading`,
    { headers: { 'User-Agent': 'GAD-AI-Terminal/1.0' } }
  );
  const rank = res?.data?.rank ?? [];
  return rank
    .map((r: any) => r.address ?? r.mint)
    .filter(Boolean)
    .slice(0, 40);
}

/** Discovery via authenticated Agent API (if key configured) */
async function discoverViaAgentApi(): Promise<string[]> {
  const res = await fetchJson<any>(
    `${AGENT_BASE}/tokens/recent`,
    { headers: { Authorization: `Bearer ${GMGN_API_KEY}`, 'User-Agent': 'GAD-AI-Terminal/1.0' } }
  );
  const tokens: any[] = res?.data ?? res?.tokens ?? res?.mints ?? [];
  return (Array.isArray(tokens) ? tokens : [])
    .map((t: any) => t.address ?? t.mint)
    .filter(Boolean)
    .slice(0, 40);
}

export async function discoverGmgnTokens(): Promise<string[]> {
  try {
    const mints = GMGN_API_KEY
      ? await retry(discoverViaAgentApi)
      : await retry(discoverViaPublicApi);
    console.info(`[gmgn] discovered ${mints.length} tokens (${GMGN_API_KEY ? 'agent' : 'public'} API)`);
    return mints;
  } catch (err: any) {
    console.warn('[gmgn] discovery failed:', err.message);
    return [];
  }
}

export async function fetchGmgnMetrics(mintAddress: string): Promise<TokenMetricsPayload> {
  try {
    const token = await retry(() =>
      fetchJson<GmgnPublicToken>(
        `${PUBLIC_BASE}/tokens/sol/${mintAddress}`,
        { headers: { 'User-Agent': 'GAD-AI-Terminal/1.0' } }
      )
    );

    return {
      volume_5m:        0,
      volume_1h:        Number(token?.volume_24h ?? 0) / 24,
      volume_24h:       Number(token?.volume_24h ?? 0),
      tx_count_5m:      0,
      tx_count_1h:      0,
      tx_count_24h:     0,
      liquidity_change: 0,
      price_change_1h:  Number(token?.price_change_1h  ?? 0),
      price_change_24h: Number(token?.price_change_24h ?? 0)
    };
  } catch {
    return buildDefaultMetrics();
  }
}
