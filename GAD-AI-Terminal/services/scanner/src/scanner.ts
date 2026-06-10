import axios, { AxiosRequestConfig } from 'axios';
import { query } from '@lib/db';
import { getTokenMetadata } from '@lib/solana';
import {
  calculateLiquidityRisk,
  calculateWhaleRisk,
  calculateHolderRisk,
  calculateRiskScore,
  explainRiskScore,
  riskLabel,
  RiskFactors
} from '@lib/risk';
import { deriveFactors, calculateFullScore } from '@lib/scoring';
import { processTokenAlerts } from '@lib/alerts';
import { runIntelligenceEngines } from './intelligence';

export interface TokenMetricsPayload {
  volume_5m: number;
  volume_1h: number;
  volume_24h: number;
  tx_count_5m: number;
  tx_count_1h: number;
  tx_count_24h: number;
  liquidity_change: number;
  price_change_1h: number;
  price_change_24h: number;
}

export interface Collector {
  source: string;
  discoverNewTokens(): Promise<string[]>;
  fetchTokenMetrics(mintAddress: string): Promise<TokenMetricsPayload>;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 800): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      const backoff = delayMs * Math.pow(2, attempt - 1);
      console.warn(`Retry ${attempt}/${retries} failed: ${error instanceof Error ? error.message : String(error)}; waiting ${backoff}ms`);
      await sleep(backoff);
    }
  }

  throw lastError;
}

export class RateLimiter {
  private lastExecution = 0;
  private minIntervalMs: number;

  constructor(requestsPerMinute: number) {
    this.minIntervalMs = Math.max(100, Math.floor((60_000 / requestsPerMinute)));
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const waitMs = Math.max(0, this.minIntervalMs - (now - this.lastExecution));
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    const result = await fn();
    this.lastExecution = Date.now();
    return result;
  }
}

export async function fetchJson<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
  return retry(async () => {
    const response = await axios.request<T>({ url, ...config });
    return response.data;
  });
}

export async function upsertToken(mintAddress: string, metadata: { symbol?: string; name?: string; totalSupply?: number; marketCap?: number | null } = {}) {
  const result = await query<{ id: string }>(
    `INSERT INTO tokens (mint_address, symbol, name, total_supply, market_cap, last_updated)
      VALUES ($1,$2,$3,$4,$5,now())
      ON CONFLICT (mint_address)
      DO UPDATE SET symbol = COALESCE(EXCLUDED.symbol, tokens.symbol), name = COALESCE(EXCLUDED.name, tokens.name), total_supply = COALESCE(EXCLUDED.total_supply, tokens.total_supply), market_cap = COALESCE(EXCLUDED.market_cap, tokens.market_cap), last_updated = now()
      RETURNING id`,
    [mintAddress, metadata.symbol || null, metadata.name || null, metadata.totalSupply ?? null, metadata.marketCap ?? null]
  );
  return result.rows[0].id;
}

export async function insertTokenMetrics(tokenId: string, metrics: TokenMetricsPayload) {
  await query(
    `INSERT INTO token_metrics (token_id, volume_5m, volume_1h, volume_24h, tx_count_5m, tx_count_1h, tx_count_24h, liquidity_change, price_change_1h, price_change_24h)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [tokenId, metrics.volume_5m, metrics.volume_1h, metrics.volume_24h, metrics.tx_count_5m, metrics.tx_count_1h, metrics.tx_count_24h, metrics.liquidity_change, metrics.price_change_1h, metrics.price_change_24h]
  );
}

const rateLimiter = new RateLimiter(Number(process.env.SCANNER_API_RATE_PER_MINUTE || '40'));

export async function safeFetchTokenMetadata(mintAddress: string) {
  try {
    const metadata = await retry(async () => {
      const tokenData = await getTokenMetadata(mintAddress);
      const accountInfo = tokenData.accountInfo as any;
      return {
        symbol: accountInfo?.parsed?.info?.symbol ?? accountInfo?.symbol ?? null,
        name: accountInfo?.parsed?.info?.name ?? accountInfo?.name ?? null,
        totalSupply: accountInfo?.parsed?.info?.supply ? Number(accountInfo.parsed.info.supply) : undefined,
        marketCap: null
      };
    });
    return metadata;
  } catch (error) {
    console.error(`Metadata lookup failed for ${mintAddress}:`, error);
    return { symbol: undefined, name: undefined, totalSupply: undefined, marketCap: null };
  }
}

const RISK_ALERT_THRESHOLD = Number(process.env.RISK_ALERT_THRESHOLD || '65');

/** Compute risk + AI score from metrics, persist to score_history + alerts */
async function scoreToken(tokenId: string, metrics: TokenMetricsPayload): Promise<void> {
  // Build risk factors from raw metrics
  const liquidityRisk = calculateLiquidityRisk(metrics.liquidity_change);
  // Approximate sell pressure and whale activity from price changes
  const sellPressure = metrics.price_change_1h < 0
    ? Math.min(100, Math.abs(metrics.price_change_1h) * 2)
    : 0;
  const whaleRisk = calculateWhaleRisk(sellPressure);
  // Volume anomaly used as part of volatility proxy
  const volumeAnomalyPct = metrics.volume_1h > 0
    ? Math.max(0, ((metrics.volume_5m * 12) / metrics.volume_1h - 1) * 100)
    : 0;
  const volumeVolatilityBoost = Math.min(30, volumeAnomalyPct * 0.1);
  // Holder concentration: use placeholder unless DB has real data
  const holderRow = await query<{ holder_count: number }>(
    'SELECT holder_count FROM tokens WHERE id = $1', [tokenId]
  );
  const holderCount = holderRow.rows[0]?.holder_count ?? 0;
  const holderConcentration = holderCount > 0 ? Math.max(0, 100 - Math.log10(holderCount) * 25) : 70;
  const holderRisk = calculateHolderRisk(holderConcentration);

  const riskFactors: RiskFactors = {
    liquidityChange: liquidityRisk,
    largeSellPressure: sellPressure,
    holderConcentration: holderRisk,
    whaleActivity: whaleRisk,
    volatility: Math.min(100, Math.abs(metrics.price_change_24h) + volumeVolatilityBoost)
  };

  const overallRisk = calculateRiskScore(riskFactors);
  const explanation = explainRiskScore(riskFactors);

  // Derive AI scoring factors
  const scoreFactors = deriveFactors({
    priceChange1h: metrics.price_change_1h,
    priceChange24h: metrics.price_change_24h,
    liquidityChangePercent: metrics.liquidity_change,
    volume1h: metrics.volume_1h,
    volume24h: metrics.volume_24h,
    holderCount,
    holderCountBaseline: holderCount,
    riskScore: overallRisk
  });

  const scores = calculateFullScore(scoreFactors);

  await query(
    `INSERT INTO score_history
       (token_id, growth_score, liquidity_score, volume_score, holder_score, momentum_score, risk_score, ai_score, explanation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      tokenId,
      scores.growthScore,
      scores.liquidityScore,
      scores.volumeScore,
      scores.holderScore,
      scores.momentumScore,
      scores.riskScore,
      scores.aiScore,
      scores.explanation
    ]
  );

  // ─── Alert engine ────────────────────────────────────────────────────────
  const tokenRow = await query<{
    mint_address: string; symbol: string | null; first_seen: Date
  }>('SELECT mint_address, symbol, first_seen FROM tokens WHERE id = $1', [tokenId]);
  const tok = tokenRow.rows[0];

  // Fetch previous AI score for delta detection
  const prevRow = await query<{ ai_score: number }>(
    `SELECT ai_score FROM score_history WHERE token_id = $1
     ORDER BY created_at DESC LIMIT 1 OFFSET 1`,
    [tokenId]
  );

  const ageMinutes = tok
    ? (Date.now() - new Date(tok.first_seen).getTime()) / 60_000
    : 999;

  await processTokenAlerts({
    tokenId,
    mintAddress: tok?.mint_address ?? tokenId,
    symbol: tok?.symbol ?? undefined,
    aiScore: scores.aiScore,
    previousAiScore: prevRow.rows[0]?.ai_score,
    riskScore: scores.riskScore,
    whaleActivityScore: whaleRisk,
    volume5m: metrics.volume_5m,
    volume1h: metrics.volume_1h,
    volume24h: metrics.volume_24h,
    liquidityChange: metrics.liquidity_change,
    isNewToken: ageMinutes < 30
  });
}

export async function processToken(
  collectorSource: string,
  mintAddress: string,
  collectorMetrics: TokenMetricsPayload,
  knownMetadata?: { symbol?: string; name?: string; totalSupply?: number; marketCap?: number | null }
) {
  // Use known metadata (e.g. from PumpPortal) first, fall back to on-chain lookup
  const meta = knownMetadata?.name
    ? knownMetadata
    : await safeFetchTokenMetadata(mintAddress);
  const tokenId = await upsertToken(mintAddress, meta);
  await insertTokenMetrics(tokenId, collectorMetrics);
  await scoreToken(tokenId, collectorMetrics);
  runIntelligenceEngines(tokenId, collectorMetrics).catch((err) =>
    console.warn('[intelligence] engine error:', err?.message)
  );
  console.info(`Processed ${mintAddress} from ${collectorSource}`);
}

export async function runCollectors(collectors: Collector[]) {
  const discovered = new Map<string, string>();

  for (const collector of collectors) {
    try {
      console.info(`Discovering tokens from ${collector.source}`);
      const tokenMints = await collector.discoverNewTokens();
      tokenMints.forEach((mint) => discovered.set(mint, collector.source));
    } catch (error) {
      console.error(`Discovery failed for ${collector.source}:`, error);
    }
  }

  const tokens = Array.from(discovered.entries()).slice(0, 120);
  if (!tokens.length) {
    console.info('No new tokens discovered in this cycle.');
    return;
  }

  for (const [mintAddress, source] of tokens) {
    try {
      await rateLimiter.schedule(async () => {
        const metrics = await retry(() => collectors.find((collector) => collector.source === source)!.fetchTokenMetrics(mintAddress));
        await processToken(source, mintAddress, metrics);
      });
    } catch (error) {
      console.error(`Token processing failed for ${mintAddress} from ${source}:`, error);
    }
  }
}

export function buildDefaultMetrics(): TokenMetricsPayload {
  return {
    volume_5m: 0,
    volume_1h: 0,
    volume_24h: 0,
    tx_count_5m: 0,
    tx_count_1h: 0,
    tx_count_24h: 0,
    liquidity_change: 0,
    price_change_1h: 0,
    price_change_24h: 0
  };
}
