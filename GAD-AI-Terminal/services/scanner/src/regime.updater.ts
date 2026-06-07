/**
 * Market Regime Updater
 * Fetches real market data every 5 minutes and stores regime in DB.
 * Data sources: CoinGecko (SOL/BTC prices) + alternative.me (Fear & Greed Index)
 */
import axios from 'axios';
import { query } from '@lib/db';
import { detectMarketRegime } from '@lib/regime';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price';
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1';

interface PriceData {
  solana: { usd: number; usd_7d_change?: number; usd_24h_change?: number };
  bitcoin: { usd: number; usd_7d_change?: number; usd_24h_change?: number };
}

interface FearGreedData {
  data: Array<{ value: string; value_classification: string }>;
}

async function fetchPrices(): Promise<{ solPrice: number; solChange7d: number; solChange24h: number; btcChange7d: number }> {
  try {
    const res = await axios.get<PriceData>(COINGECKO_URL, {
      params: {
        ids: 'solana,bitcoin',
        vs_currencies: 'usd',
        include_7d_change: true,
        include_24hr_change: true
      },
      timeout: 8000
    });
    const sol = res.data.solana;
    const btc = res.data.bitcoin;
    return {
      solPrice:    sol.usd,
      solChange7d:  sol.usd_7d_change  ?? 0,
      solChange24h: sol.usd_24h_change ?? 0,
      btcChange7d:  btc.usd_7d_change  ?? 0
    };
  } catch {
    return { solPrice: 0, solChange7d: 0, solChange24h: 0, btcChange7d: 0 };
  }
}

async function fetchFearGreed(): Promise<number> {
  try {
    const res = await axios.get<FearGreedData>(FEAR_GREED_URL, { timeout: 6000 });
    return parseInt(res.data.data[0]?.value ?? '50', 10);
  } catch {
    return 50; // neutral default
  }
}

async function fetchSolanaVolume(): Promise<{ current: number; avg7d: number; newTokensPerHour: number; rugRate: number }> {
  // Pull from our own DB — use token discovery rate as proxy
  try {
    const [volQ, newQ] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(volume_24h), 0) AS total FROM token_metrics WHERE timestamp > now() - interval '1 hour'`
      ),
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt FROM tokens WHERE first_seen > now() - interval '1 hour'`
      )
    ]);

    const recentVol = Number(volQ.rows[0]?.total ?? 0);
    const newPerHour = Number(newQ.rows[0]?.cnt ?? 30);

    // Pull 7-day avg volume from metric history
    const avgQ = await query<{ avg_vol: string }>(
      `SELECT AVG(v.total) AS avg_vol FROM (
         SELECT SUM(volume_24h) AS total
         FROM token_metrics
         WHERE timestamp > now() - interval '7 days'
         GROUP BY date_trunc('hour', timestamp)
       ) v`
    );
    const avg7d = Number(avgQ.rows[0]?.avg_vol ?? recentVol);

    // Rough rug rate from rug_scores
    const rugQ = await query<{ rug_cnt: string; total_cnt: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE rug_probability > 70) AS rug_cnt,
         COUNT(*) AS total_cnt
       FROM rug_scores
       WHERE checked_at > now() - interval '24 hours'`
    );
    const rugRate = rugQ.rows[0]?.total_cnt !== '0'
      ? Math.round((Number(rugQ.rows[0]?.rug_cnt) / Number(rugQ.rows[0]?.total_cnt)) * 100)
      : 15;

    return { current: recentVol * 24, avg7d: avg7d * 24, newTokensPerHour: newPerHour, rugRate };
  } catch {
    return { current: 2_000_000_000, avg7d: 2_000_000_000, newTokensPerHour: 50, rugRate: 15 };
  }
}

async function fetchAvgGadScore(): Promise<number> {
  try {
    const { rows } = await query<{ avg_score: string }>(
      `SELECT AVG(gad_score) AS avg_score FROM gad_scores WHERE computed_at > now() - interval '1 hour'`
    );
    return Math.round(Number(rows[0]?.avg_score ?? 50));
  } catch {
    return 50;
  }
}

export async function updateMarketRegime(): Promise<void> {
  const [prices, fearGreed, volumeData, avgGad] = await Promise.all([
    fetchPrices(),
    fetchFearGreed(),
    fetchSolanaVolume(),
    fetchAvgGadScore()
  ]);

  const result = detectMarketRegime({
    solPriceChange7d:    prices.solChange7d,
    solPriceChange24h:   prices.solChange24h,
    btcPriceChange7d:    prices.btcChange7d,
    totalMarketVolume24h: volumeData.current,
    avgVolume7d:          volumeData.avg7d,
    fearGreedIndex:       fearGreed,
    newTokensPerHour:     volumeData.newTokensPerHour,
    rugRatePercent:       volumeData.rugRate,
    avgGadScore:          avgGad
  });

  await query(
    `INSERT INTO market_regime
       (regime, confidence, sol_price, fear_greed_index, total_volume_24h, explanation)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      result.regime,
      result.confidence,
      prices.solPrice,
      fearGreed,
      volumeData.current,
      result.description
    ]
  );

  // Keep only last 200 regime records
  await query(
    `DELETE FROM market_regime WHERE id NOT IN (
       SELECT id FROM market_regime ORDER BY computed_at DESC LIMIT 200
     )`
  ).catch(() => {});

  console.info(
    `[regime] ${result.regime} (confidence ${result.confidence}) | SOL $${prices.solPrice} | F&G ${fearGreed} | Action: ${result.actionGuide}`
  );
}
