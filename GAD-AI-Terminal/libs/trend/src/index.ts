export type TrendSignal = 'BUY' | 'WAIT' | 'SELL';
export type TrendConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type TrendStage = 'EARLY' | 'GROWING' | 'PEAK' | 'FADING' | 'DEAD';

export interface TrendResult {
  trend_score: number;
  signal: TrendSignal;
  confidence: TrendConfidence;
  stage: TrendStage;
  reason: string;
}

export interface PairData {
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?:      { m5?: number; h1?: number; h24?: number };
  txns?:        { m5?: { buys?: number; sells?: number }; h1?: { buys?: number; sells?: number } };
}

export function analyzeTrend(pair: PairData): TrendResult {
  const pc5m  = Number(pair.priceChange?.m5  ?? 0);
  const pc1h  = Number(pair.priceChange?.h1  ?? 0);
  const pc6h  = Number(pair.priceChange?.h6  ?? 0);
  const vol5m  = Number(pair.volume?.m5  ?? 0);
  const vol1h  = Number(pair.volume?.h1  ?? 0);
  const buys5m  = pair.txns?.m5?.buys  ?? 0;
  const sells5m = pair.txns?.m5?.sells ?? 0;
  const buys1h  = pair.txns?.h1?.buys  ?? 0;
  const sells1h = pair.txns?.h1?.sells ?? 0;

  const tf_positive  = [pc5m > 0, pc1h > 0, pc6h > -5].filter(Boolean).length;
  const delta5m      = buys5m + sells5m > 0 ? (buys5m - sells5m) / (buys5m + sells5m) : 0;
  const delta1h      = buys1h + sells1h > 0 ? (buys1h - sells1h) / (buys1h + sells1h) : 0;
  const vol_accel    = vol1h > 0 ? (vol5m * 12) / vol1h : 0;
  const overextended = pc1h > 25 || (pc5m > 10 && vol_accel < 0.8);

  let stage: TrendStage;
  if (pc5m < -3 && delta5m < -0.3)                             stage = 'FADING';
  else if (pc5m > 0 && vol_accel > 2 && delta5m > 0.2)         stage = 'PEAK';
  else if (pc5m > 0 && pc1h > 0 && vol_accel > 1.2)            stage = 'GROWING';
  else if (pc5m > 0 && pc1h < 8)                               stage = 'EARLY';
  else if (pc6h < -20 || (pc5m < 0 && pc1h < -15))             stage = 'DEAD';
  else                                                          stage = 'EARLY';

  let score = (tf_positive / 3) * 0.35
    + Math.min(vol_accel, 3) / 3 * 0.25
    + ((delta5m + 1) / 2) * 0.10
    + ((delta1h + 1) / 2) * 0.10
    + Math.min(Math.max(pc5m, 0), 5) / 5 * 0.20;
  if (overextended) score *= 0.6;
  if (pc6h < -10)   score *= 0.7;
  score = Math.max(0, Math.min(1, score));

  const signal: TrendSignal =
    score >= 0.55 && !overextended && stage !== 'FADING' && stage !== 'DEAD' ? 'BUY' :
    stage === 'FADING' || stage === 'DEAD' || score < 0.3 ? 'SELL' : 'WAIT';

  const confidence: TrendConfidence =
    vol_accel > 1.5 && tf_positive >= 2 && delta5m > 0.2 ? 'HIGH' :
    vol_accel > 0.8 && tf_positive >= 2 ? 'MEDIUM' : 'LOW';

  const reasons: string[] = [];
  if (stage === 'EARLY')   reasons.push('early momentum');
  if (stage === 'GROWING') reasons.push('vol accelerating');
  if (stage === 'PEAK')    reasons.push('near peak — caution');
  if (stage === 'FADING')  reasons.push('momentum reversing');
  if (stage === 'DEAD')    reasons.push('dead trend');
  if (delta5m > 0.3)  reasons.push(`buys dominating +${(delta5m*100).toFixed(0)}%`);
  if (delta5m < -0.3) reasons.push(`sells dominating ${(delta5m*100).toFixed(0)}%`);
  if (overextended)   reasons.push('overextended — skip');
  if (vol_accel > 1.5) reasons.push(`vol pace ${vol_accel.toFixed(1)}x avg`);

  return {
    trend_score: parseFloat(score.toFixed(3)),
    signal, confidence, stage,
    reason: reasons.join('; ') || 'neutral',
  };
}
