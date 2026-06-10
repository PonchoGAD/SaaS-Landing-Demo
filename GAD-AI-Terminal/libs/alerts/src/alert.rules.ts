import { AlertType, AlertInput, TokenAlertContext } from './alert.types';

// ─── Thresholds (overridable via env) ────────────────────────────────────────
export const THRESHOLDS = {
  HIGH_SCORE:         Number(process.env.ALERT_HIGH_SCORE_THRESHOLD      ?? 80),
  HIGH_RISK:          Number(process.env.ALERT_HIGH_RISK_THRESHOLD        ?? 70),
  WHALE_ACTIVITY:     Number(process.env.ALERT_WHALE_ACTIVITY_THRESHOLD   ?? 60),
  VOLUME_SPIKE_RATIO: Number(process.env.ALERT_VOLUME_SPIKE_RATIO         ?? 3.0),
  LIQUIDITY_DROP:     Number(process.env.ALERT_LIQUIDITY_DROP_THRESHOLD   ?? -20),
  AI_SCORE_INCREASE:  Number(process.env.ALERT_AI_SCORE_INCREASE_DELTA    ?? 15),
} as const;

type RuleFn = (ctx: TokenAlertContext) => AlertInput | null;

// ─── Individual rules ─────────────────────────────────────────────────────────

export const ruleNewHighScore: RuleFn = (ctx) => {
  if (ctx.aiScore < THRESHOLDS.HIGH_SCORE) return null;
  return {
    type: AlertType.NEW_HIGH_SCORE,
    subject: ctx.mintAddress,
    payload: { tokenId: ctx.tokenId, aiScore: ctx.aiScore, symbol: ctx.symbol },
    score: ctx.aiScore
  };
};

export const ruleHighRisk: RuleFn = (ctx) => {
  if (ctx.riskScore < THRESHOLDS.HIGH_RISK) return null;
  return {
    type: AlertType.HIGH_RISK,
    subject: ctx.mintAddress,
    payload: { tokenId: ctx.tokenId, riskScore: ctx.riskScore, symbol: ctx.symbol },
    score: ctx.riskScore
  };
};

export const ruleWhaleActivity: RuleFn = (ctx) => {
  const ws = ctx.whaleActivityScore ?? 0;
  if (ws < THRESHOLDS.WHALE_ACTIVITY) return null;
  return {
    type: AlertType.WHALE_ACTIVITY,
    subject: ctx.mintAddress,
    payload: { tokenId: ctx.tokenId, whaleActivityScore: ws, symbol: ctx.symbol },
    score: ws
  };
};

export const ruleVolumeSpike: RuleFn = (ctx) => {
  if (ctx.volume1h <= 0) return null;
  const ratio = (ctx.volume5m * 12) / ctx.volume1h;
  if (ratio < THRESHOLDS.VOLUME_SPIKE_RATIO) return null;
  return {
    type: AlertType.VOLUME_SPIKE,
    subject: ctx.mintAddress,
    payload: {
      tokenId: ctx.tokenId,
      volume5m: ctx.volume5m,
      volume1h: ctx.volume1h,
      spikeRatio: Math.round(ratio * 100) / 100,
      symbol: ctx.symbol
    },
    score: Math.min(100, Math.round(ratio * 20))
  };
};

export const ruleLiquidityDrop: RuleFn = (ctx) => {
  if (ctx.liquidityChange > THRESHOLDS.LIQUIDITY_DROP) return null;
  return {
    type: AlertType.LIQUIDITY_DROP,
    subject: ctx.mintAddress,
    payload: {
      tokenId: ctx.tokenId,
      liquidityChange: ctx.liquidityChange,
      symbol: ctx.symbol
    },
    score: Math.min(100, Math.round(Math.abs(ctx.liquidityChange)))
  };
};

export const ruleNewToken: RuleFn = (ctx) => {
  if (!ctx.isNewToken) return null;
  return {
    type: AlertType.NEW_TOKEN,
    subject: ctx.mintAddress,
    payload: { tokenId: ctx.tokenId, aiScore: ctx.aiScore, symbol: ctx.symbol },
    score: ctx.aiScore
  };
};

export const ruleAiScoreIncrease: RuleFn = (ctx) => {
  if (ctx.previousAiScore === undefined) return null;
  const delta = ctx.aiScore - ctx.previousAiScore;
  if (delta < THRESHOLDS.AI_SCORE_INCREASE) return null;
  return {
    type: AlertType.AI_SCORE_INCREASE,
    subject: ctx.mintAddress,
    payload: {
      tokenId: ctx.tokenId,
      previousScore: ctx.previousAiScore,
      currentScore: ctx.aiScore,
      delta,
      symbol: ctx.symbol
    },
    score: ctx.aiScore
  };
};

// ─── Rule registry ────────────────────────────────────────────────────────────

export const ALL_RULES: RuleFn[] = [
  ruleNewHighScore,
  ruleHighRisk,
  ruleWhaleActivity,
  ruleVolumeSpike,
  ruleLiquidityDrop,
  ruleNewToken,
  ruleAiScoreIncrease
];

/** Evaluate all rules and return every triggered AlertInput */
export function evaluateRules(ctx: TokenAlertContext): AlertInput[] {
  return ALL_RULES.reduce<AlertInput[]>((acc, rule) => {
    const result = rule(ctx);
    if (result) acc.push(result);
    return acc;
  }, []);
}
