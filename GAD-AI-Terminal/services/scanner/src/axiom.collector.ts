import { fetchJson, retry, buildDefaultMetrics, TokenMetricsPayload } from './scanner';

const BASE_URL = process.env.AXIOM_API_BASE || 'https://cloud.axiom.co/api/v1';
const API_TOKEN = process.env.AXIOM_API_TOKEN;
const DATASET = process.env.AXIOM_DATASET || 'solana-token-events';

interface AxiomSearchResponse {
  records?: Array<{ fields: Record<string, unknown> }>;
}

export async function discoverAxiomTokens(): Promise<string[]> {
  if (!API_TOKEN) {
    console.warn('AXIOM_API_TOKEN is not configured; skipping Axiom discovery.');
    return [];
  }

  const url = `${BASE_URL}/datasets/${DATASET}/query`;
  const body = { query: 'fetch dataset | sort -timestamp desc | limit 40' };
  const response = await retry(async () => await axiosPost<AxiomSearchResponse>(url, body));

  const tokenAddresses = response.records?.map((record) => {
    const field = record.fields['mintAddress'] ?? record.fields['mint_address'] ?? record.fields['mint'];
    return typeof field === 'string' ? field : undefined;
  }).filter(Boolean) as string[];

  return tokenAddresses.slice(0, 40);
}

export async function fetchAxiomMetrics(mintAddress: string): Promise<TokenMetricsPayload> {
  if (!API_TOKEN) {
    return buildDefaultMetrics();
  }

  const url = `${BASE_URL}/datasets/${DATASET}/query`;
  const body = {
    query: `fetch dataset | where mintAddress == "${mintAddress}" | summarize volume_24h = sum(volume), tx_count_24h = count() | limit 1`
  };

  const response = await retry(async () => await axiosPost<any>(url, body));
  const row = response.records?.[0]?.fields ?? {};

  return {
    volume_5m: Number(row.volume_5m ?? 0),
    volume_1h: Number(row.volume_1h ?? 0),
    volume_24h: Number(row.volume_24h ?? 0),
    tx_count_5m: Number(row.tx_count_5m ?? 0),
    tx_count_1h: Number(row.tx_count_1h ?? 0),
    tx_count_24h: Number(row.tx_count_24h ?? 0),
    liquidity_change: Number(row.liquidity_change ?? 0),
    price_change_1h: Number(row.price_change_1h ?? 0),
    price_change_24h: Number(row.price_change_24h ?? 0)
  };
}

async function axiosPost<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: body as any
  } as any);
}
