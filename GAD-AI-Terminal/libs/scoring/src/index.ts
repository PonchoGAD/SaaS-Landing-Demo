export interface ScoreFactors {
  growth: number;
  liquidity: number;
  volume: number;
  holders: number;
  momentum: number;
  risk: number;
}

// Sprint 3 full result shape
export interface AiScoreResult {
  growthScore: number;
  liquidityScore: number;
  volumeScore: number;
  holderScore: number;
  momentumScore: number;
  riskScore: number;
  aiScore: number;
  explanation: string;
}

export function normalizeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Weights per Sprint 3 spec
const WEIGHTS = {
  growth: 0.25,
  liquidity: 0.20,
  volume: 0.15,
  holders: 0.15,
  momentum: 0.15,
  risk: 0.10
} as const;

export function calculateAiScore(factors: ScoreFactors): number {
  const raw =
    WEIGHTS.growth * factors.growth +
    WEIGHTS.liquidity * factors.liquidity +
    WEIGHTS.volume * factors.volume +
    WEIGHTS.holders * factors.holders +
    WEIGHTS.momentum * factors.momentum +
    WEIGHTS.risk * (100 - factors.risk); // high risk lowers the score
  return normalizeScore(raw);
}

function buildExplanation(f: ScoreFactors, aiScore: number): string {
  const parts: string[] = [];

  if (aiScore >= 80) parts.push('Strong overall signal.');
  else if (aiScore >= 60) parts.push('Moderate signal with upside potential.');
  else if (aiScore >= 40) parts.push('Mixed signal — proceed with caution.');
  else parts.push('Weak signal — high caution advised.');

  if (f.growth >= 70) parts.push('Growth momentum is strong.');
  else if (f.growth < 30) parts.push('Growth is stalling.');

  if (f.liquidity >= 70) parts.push('Liquidity depth is healthy.');
  else if (f.liquidity < 30) parts.push('Low liquidity increases slippage risk.');

  if (f.volume >= 70) parts.push('Volume activity is elevated.');
  else if (f.volume < 30) parts.push('Volume is thin.');

  if (f.holders >= 70) parts.push('Holder base is growing.');
  else if (f.holders < 30) parts.push('Holder distribution is weak.');

  if (f.momentum >= 70) parts.push('Price momentum is bullish.');
  else if (f.momentum < 30) parts.push('Momentum is bearish or flat.');

  if (f.risk >= 70) parts.push('Risk score is critical — large wallets may be exiting.');
  else if (f.risk >= 40) parts.push('Moderate risk factors present.');

  return parts.join(' ');
}

/** Sprint 3: returns full score object with explanation */
export function calculateFullScore(factors: ScoreFactors): AiScoreResult {
  const growthScore = normalizeScore(factors.growth);
  const liquidityScore = normalizeScore(factors.liquidity);
  const volumeScore = normalizeScore(factors.volume);
  const holderScore = normalizeScore(factors.holders);
  const momentumScore = normalizeScore(factors.momentum);
  const riskScore = normalizeScore(factors.risk);
  const aiScore = calculateAiScore(factors);
  const explanation = buildExplanation(factors, aiScore);

  return {
    growthScore,
    liquidityScore,
    volumeScore,
    holderScore,
    momentumScore,
    riskScore,
    aiScore,
    explanation
  };
}

/** Legacy helper kept for backwards compatibility */
export function buildFactorReport(factors: ScoreFactors) {
  return {
    growth: normalizeScore(factors.growth),
    liquidity: normalizeScore(factors.liquidity),
    volume: normalizeScore(factors.volume),
    holders: normalizeScore(factors.holders),
    momentum: normalizeScore(factors.momentum),
    risk: normalizeScore(factors.risk),
    aiScore: calculateAiScore(factors)
  };
}

/**
 * Derive ScoreFactors from raw token metrics.
 * All inputs are 0-100 normalised by the caller.
 */
export function deriveFactors(params: {
  priceChange1h: number;
  priceChange24h: number;
  liquidityChangePercent: number;
  volume1h: number;
  volume24h: number;
  holderCount: number;
  holderCountBaseline: number;
  riskScore: number;
}): ScoreFactors {
  const {
    priceChange1h,
    priceChange24h,
    liquidityChangePercent,
    volume1h,
    volume24h,
    holderCount,
    holderCountBaseline,
    riskScore
  } = params;

  // Growth: weighted price change normalised to 0-100
  const growth = normalizeScore(
    50 +
      priceChange1h * 0.4 +
      priceChange24h * 0.1
  );

  // Liquidity: positive change = high score; negative = low
  const liquidity = normalizeScore(50 + liquidityChangePercent * 0.5);

  // Volume: ratio 1h/24h scaled; high intraday = active
  const volRatio = volume24h > 0 ? (volume1h / volume24h) * 100 : 0;
  const volume = normalizeScore(volRatio * 1.5);

  // Holders: % growth vs baseline
  const holderGrowthPct =
    holderCountBaseline > 0
      ? ((holderCount - holderCountBaseline) / holderCountBaseline) * 100
      : 0;
  const holders = normalizeScore(50 + holderGrowthPct * 0.5);

  // Momentum: 24h price change
  const momentum = normalizeScore(50 + priceChange24h * 0.3);

  return { growth, liquidity, volume, holders, momentum, risk: riskScore };
}
