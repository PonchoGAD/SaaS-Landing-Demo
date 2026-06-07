/**
 * DexScreener Collector
 * Free public API — works from VPS IPs, no auth required.
 * Rate limit: ~300 req/min
 * Docs: https://docs.dexscreener.com/api/reference
 */

import { fetchJson, retry, buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const BASE = 'https://api.dexscreener.com';

interface DexPair {
  chainId?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  volume?: { h1?: number; h24?: number; h6?: number };
  priceChange?: { h1?: number; h24?: number; h6?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  txns?: { h1?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
}

interface DexSearchResponse {
  pairs?: DexPair[];
}

interface DexTokenResponse {
  pairs?: DexPair[];
}

/** Returns mint addresses of trending Solana tokens */
export async function discoverDexScreenerTokens(): Promise<string[]> {
  // Get latest Solana pairs (sorted by volume)
  const res = await retry(() =>
    fetchJson<DexSearchResponse>(
      `${BASE}/latest/dex/pairs/solana`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
    )
  );

  const pairs = res?.pairs ?? [];
  return pairs
    .filter(p => p.chainId === 'solana' && p.baseToken?.address)
    .sort((a, b) => (b.volume?.h1 ?? 0) - (a.volume?.h1 ?? 0))
    .map(p => p.baseToken!.address!)
    .slice(0, 50);
}

/** Get token metrics from DexScreener */
export async function fetchDexScreenerMetrics(mintAddress: string): Promise<TokenMetricsPayload> {
  try {
    const res = await retry(() =>
      fetchJson<DexTokenResponse>(
        `${BASE}/latest/dex/tokens/${mintAddress}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
      )
    );

    // Pick best pair by volume
    const pairs = (res?.pairs ?? []).filter(p => p.chainId === 'solana');
    if (!pairs.length) return buildDefaultMetrics();

    const best = pairs.sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0];

    return {
      volume_5m:        0,
      volume_1h:        Number(best.volume?.h1  ?? 0),
      volume_24h:       Number(best.volume?.h24 ?? 0),
      tx_count_5m:      0,
      tx_count_1h:      (best.txns?.h1?.buys ?? 0) + (best.txns?.h1?.sells ?? 0),
      tx_count_24h:     0,
      liquidity_change: 0,
      price_change_1h:  Number(best.priceChange?.h1  ?? 0),
      price_change_24h: Number(best.priceChange?.h24 ?? 0),
    };
  } catch {
    return buildDefaultMetrics();
  }
}

/** Search for new tokens by keyword/narrative  */
export async function searchDexScreenerTokens(query: string): Promise<string[]> {
  try {
    const res = await retry(() =>
      fetchJson<DexSearchResponse>(
        `${BASE}/latest/dex/search?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }
      )
    );
    const pairs = res?.pairs ?? [];
    return pairs
      .filter(p => p.chainId === 'solana' && p.baseToken?.address)
      .map(p => p.baseToken!.address!)
      .slice(0, 20);
  } catch {
    return [];
  }
}
