import { fetchJson, retry, buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const API_KEY = process.env.HELIUS_API_KEY;
const BASE_URL = 'https://api.helius.xyz/v0';

interface HeliusTokenMetadata {
  mint: string;
  symbol?: string;
  name?: string;
  supply?: string;
}

export async function discoverHeliusTokens(): Promise<string[]> {
  if (!API_KEY) {
    console.warn('HELIUS_API_KEY is not configured; skipping Helius discovery.');
    return [];
  }

  const url = `${BASE_URL}/token-metadata?api-key=${API_KEY}`;
  const response = await retry(async () => await fetchJson<HeliusTokenMetadata[]>(url));
  return response.map((item) => item.mint).filter(Boolean).slice(0, 50);
}

export async function fetchHeliusMetrics(mintAddress: string): Promise<TokenMetricsPayload> {
  if (!API_KEY) {
    return buildDefaultMetrics();
  }

  const url = `${BASE_URL}/tokens/${mintAddress}/prices?api-key=${API_KEY}`;
  const historical = await retry(async () => await fetchJson<any>(url));

  const volume24h = Number(historical?.volume_24h ?? 0);
  const txCount24h = Number(historical?.tx_count_24h ?? 0);
  const volume1h = Number(historical?.volume_1h ?? 0);
  const txCount1h = Number(historical?.tx_count_1h ?? 0);

  return {
    volume_5m: 0,
    volume_1h: volume1h,
    volume_24h: volume24h,
    tx_count_5m: 0,
    tx_count_1h: Number(historical?.tx_count_1h ?? 0),
    tx_count_24h: txCount24h,
    liquidity_change: Number(historical?.liquidity_change ?? 0),
    price_change_1h: Number(historical?.price_change_1h ?? 0),
    price_change_24h: Number(historical?.price_change_24h ?? 0)
  };
}
