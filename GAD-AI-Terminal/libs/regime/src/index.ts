// Market Regime Engine
// Detects current market state: BULL | BEAR | SIDEWAYS | EUPHORIA | PANIC
//
// AI Score and Opportunity Score are multiplied by regime to be
// context-aware — a 70 score in PANIC regime means something different
// than the same score in BULL.

export const REGIMES = ['BULL', 'BEAR', 'SIDEWAYS', 'EUPHORIA', 'PANIC'] as const;
export type MarketRegime = typeof REGIMES[number];

export interface RegimeInput {
  // Price momentum
  solPriceChange7d: number;     // % SOL price change last 7 days
  solPriceChange24h: number;    // % SOL price change last 24h
  btcPriceChange7d: number;     // % BTC price change last 7 days

  // Market structure
  totalMarketVolume24h: number; // total Solana DEX volume in USD
  avgVolume7d: number;          // 7-day average volume for baseline

  // Sentiment proxies
  fearGreedIndex: number;       // 0-100 (0=fear, 100=greed)
  newTokensPerHour: number;     // pump.fun new token rate
  rugRatePercent: number;       // % of new tokens that rug in 24h
  avgGadScore: number;          // platform avg GAD score (0-100)
}

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number;           // 0-1
  multiplier: number;           // score multiplier for opportunity engine
  description: string;
  signals: {
    momentum: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
    volume: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
    sentiment: 'GREEDY' | 'NEUTRAL' | 'FEARFUL';
    rugRate: 'EXTREME' | 'HIGH' | 'NORMAL' | 'LOW';
  };
  actionGuide: string;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, v));
}

export function detectMarketRegime(input: RegimeInput): RegimeResult {
  const {
    solPriceChange7d, solPriceChange24h, btcPriceChange7d,
    totalMarketVolume24h, avgVolume7d, fearGreedIndex,
    newTokensPerHour, rugRatePercent, avgGadScore
  } = input;

  // ─── Signal scores ─────────────────────────────────────────────────────────

  // Momentum: positive = bullish
  const momentumScore =
    solPriceChange7d  * 0.4 +
    solPriceChange24h * 0.4 +
    btcPriceChange7d  * 0.2;

  // Volume: > 1.5x avg = expanding
  const volumeRatio = avgVolume7d > 0 ? totalMarketVolume24h / avgVolume7d : 1;

  // Sentiment: fear/greed
  const sentimentScore = fearGreedIndex;

  // New token rate vs rug rate (pump.fun health)
  const ecosystemHealth = Math.max(0, newTokensPerHour - rugRatePercent);

  // ─── Regime scoring ────────────────────────────────────────────────────────
  const regimeScores: Record<MarketRegime, number> = {
    EUPHORIA: 0,
    BULL:     0,
    SIDEWAYS: 0,
    BEAR:     0,
    PANIC:    0
  };

  // EUPHORIA: extreme greed + massive volume + price surge
  regimeScores.EUPHORIA = clamp(
    (fearGreedIndex >= 80 ? 40 : 0) +
    (solPriceChange7d > 30 ? 30 : 0) +
    (volumeRatio > 2 ? 30 : 0)
  );

  // BULL: positive momentum, moderate-high sentiment, expanding volume
  regimeScores.BULL = clamp(
    (momentumScore > 5 ? 40 : momentumScore > 0 ? 20 : 0) +
    (fearGreedIndex >= 55 && fearGreedIndex < 80 ? 30 : 0) +
    (volumeRatio > 1.2 ? 20 : 0) +
    (avgGadScore > 60 ? 10 : 0)
  );

  // SIDEWAYS: flat momentum, neutral sentiment, stable volume
  regimeScores.SIDEWAYS = clamp(
    (Math.abs(momentumScore) < 5 ? 40 : 0) +
    (fearGreedIndex >= 40 && fearGreedIndex < 60 ? 30 : 0) +
    (volumeRatio >= 0.8 && volumeRatio <= 1.2 ? 30 : 0)
  );

  // BEAR: negative momentum, fear, contracting volume
  regimeScores.BEAR = clamp(
    (momentumScore < -5 ? 40 : momentumScore < 0 ? 20 : 0) +
    (fearGreedIndex < 40 && fearGreedIndex >= 20 ? 30 : 0) +
    (volumeRatio < 0.8 ? 20 : 0) +
    (rugRatePercent > 30 ? 10 : 0)
  );

  // PANIC: extreme fear + price crash + volume spike (capitulation)
  regimeScores.PANIC = clamp(
    (fearGreedIndex < 20 ? 40 : 0) +
    (solPriceChange7d < -20 ? 30 : solPriceChange7d < -10 ? 15 : 0) +
    (volumeRatio > 1.5 && momentumScore < -10 ? 20 : 0) +
    (rugRatePercent > 50 ? 10 : 0)
  );

  // ─── Determine winning regime ──────────────────────────────────────────────
  const sorted = (Object.entries(regimeScores) as [MarketRegime, number][])
    .sort((a, b) => b[1] - a[1]);
  const [regime, topScore] = sorted[0];
  const confidence = Math.min(1, (topScore - sorted[1][1]) / 40 + 0.3);

  // ─── Multiplier for opportunity scoring ───────────────────────────────────
  const MULTIPLIERS: Record<MarketRegime, number> = {
    EUPHORIA: 1.3,   // everything scores higher in mania
    BULL:     1.2,   // favorable conditions
    SIDEWAYS: 1.0,   // neutral
    BEAR:     0.7,   // opportunities are real but rare
    PANIC:    0.5    // only the strongest survive
  };
  const multiplier = MULTIPLIERS[regime];

  // ─── Signals ──────────────────────────────────────────────────────────────
  const signals: RegimeResult['signals'] = {
    momentum: momentumScore > 5 ? 'BULLISH' : momentumScore < -5 ? 'BEARISH' : 'NEUTRAL',
    volume:   volumeRatio > 1.2 ? 'EXPANDING' : volumeRatio < 0.8 ? 'CONTRACTING' : 'STABLE',
    sentiment: fearGreedIndex >= 60 ? 'GREEDY' : fearGreedIndex < 35 ? 'FEARFUL' : 'NEUTRAL',
    rugRate:  rugRatePercent > 50 ? 'EXTREME' : rugRatePercent > 30 ? 'HIGH' : rugRatePercent > 10 ? 'NORMAL' : 'LOW'
  };

  // ─── Descriptions ─────────────────────────────────────────────────────────
  const DESCRIPTIONS: Record<MarketRegime, string> = {
    EUPHORIA: `Market in EUPHORIA — extreme greed (F&G ${fearGreedIndex}), volume ${volumeRatio.toFixed(1)}x avg. High-risk high-reward environment.`,
    BULL:     `BULL market — SOL ${solPriceChange7d > 0 ? '+' : ''}${solPriceChange7d.toFixed(0)}% 7d, expanding volume. Good conditions for meme coins.`,
    SIDEWAYS: `SIDEWAYS market — consolidation phase. Select narratives outperform; be picky.`,
    BEAR:     `BEAR market — negative momentum, fear in market. Only the strongest tokens survive.`,
    PANIC:    `PANIC — capitulation in progress. Opportunities exist but extreme risk. F&G ${fearGreedIndex}/100.`
  };

  const ACTION_GUIDES: Record<MarketRegime, string> = {
    EUPHORIA: 'Take profits. Be selective. Easy money already made.',
    BULL:     'Opportunity window is open. Focus on ACCUMULATION stage tokens.',
    SIDEWAYS: 'Wait for clear breakouts. AI + narrative tokens may outperform.',
    BEAR:     'Reduce size. Only highest conviction plays. Exit quickly.',
    PANIC:    'Watch only. If entering: tiny size, highest quality only.'
  };

  return {
    regime,
    confidence: Math.round(confidence * 100) / 100,
    multiplier,
    description: DESCRIPTIONS[regime],
    signals,
    actionGuide: ACTION_GUIDES[regime]
  };
}

/** Get regime from stored DB row */
export function regimeFromDb(row: { regime: string; confidence: number }): {
  regime: MarketRegime;
  multiplier: number;
} {
  const regime = (REGIMES as readonly string[]).includes(row.regime)
    ? row.regime as MarketRegime
    : 'SIDEWAYS';
  const MULTIPLIERS: Record<MarketRegime, number> = {
    EUPHORIA: 1.3, BULL: 1.2, SIDEWAYS: 1.0, BEAR: 0.7, PANIC: 0.5
  };
  return { regime, multiplier: MULTIPLIERS[regime] };
}

export function regimeEmoji(regime: MarketRegime): string {
  const map: Record<MarketRegime, string> = {
    EUPHORIA: '🤑', BULL: '🐂', SIDEWAYS: '😐', BEAR: '🐻', PANIC: '🆘'
  };
  return map[regime];
}
