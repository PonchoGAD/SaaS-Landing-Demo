/**
 * HypeRadar — detects hype stage using on-chain velocity signals.
 * Enter at hype_score 50-65 (before peak), exit when score > 80 or falling.
 * Uses only on-chain data (no Twitter/Telegram API needed).
 */

export type HypeStage = 'QUIET' | 'EARLY' | 'GROWING' | 'PEAK' | 'FADING';

export interface HypeResult {
  hype_score:         number;      // 0-100
  hype_stage:         HypeStage;
  recommended_action: string;
  estimated_peak_in:  string | null;
  entry_window:       boolean;     // true = good time to enter
  exit_signal:        boolean;     // true = consider exiting
}

export interface HypePairData {
  priceChange?: { m5?: number; h1?: number; h6?: number };
  volume?:      { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?:        {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
  };
  pairCreatedAt?: number;
}

export function detectHype(pair: HypePairData): HypeResult {
  const pc5m  = Number(pair.priceChange?.m5  ?? 0);
  const pc1h  = Number(pair.priceChange?.h1  ?? 0);
  const pc6h  = Number(pair.priceChange?.h6  ?? 0);

  const vol5m  = Number(pair.volume?.m5  ?? 0);
  const vol1h  = Number(pair.volume?.h1  ?? 0);
  const vol6h  = Number(pair.volume?.h6  ?? 0);
  const vol24h = Number(pair.volume?.h24 ?? 0);

  const txm5b = pair.txns?.m5?.buys  ?? 0;
  const txm5s = pair.txns?.m5?.sells ?? 0;
  const txh1b = pair.txns?.h1?.buys  ?? 0;
  const txh1s = pair.txns?.h1?.sells ?? 0;
  const txh6b = pair.txns?.h6?.buys  ?? 0;
  const txh6s = pair.txns?.h6?.sells ?? 0;

  const ageSec = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 1000 : 999999;

  // ── Volume velocity: how fast is activity accelerating? ──
  const vol_pace_5m = vol1h > 0 ? (vol5m * 12) / vol1h : 0;    // 5m pace vs 1h avg
  const vol_pace_1h = vol6h > 0 ? vol1h / (vol6h / 6)  : 0;    // 1h vs 6h avg/h
  const total_txm5 = txm5b + txm5s;
  const total_txh1 = txh1b + txh1s;
  const tx_pace    = total_txh1 > 0 ? (total_txm5 * 12) / total_txh1 : 0;

  // ── Buy/sell ratio ──
  const buy_ratio_5m = total_txm5 > 0 ? txm5b / total_txm5 : 0.5;
  const buy_ratio_1h = total_txh1 > 0 ? txh1b / total_txh1 : 0.5;

  // ── Hype Score ──
  let score = 0;

  // Price velocity (0-30)
  const pv = Math.min(Math.max(pc1h, 0), 50) / 50;
  score += pv * 30;

  // Volume acceleration (0-30)
  score += Math.min(vol_pace_5m, 3) / 3 * 20;
  score += Math.min(vol_pace_1h, 2) / 2 * 10;

  // Transaction pace (0-20)
  score += Math.min(tx_pace, 3) / 3 * 20;

  // Buy dominance (0-20)
  score += buy_ratio_5m * 10;
  score += buy_ratio_1h * 10;

  score = Math.max(0, Math.min(100, score));

  // ── Stage ──
  let stage: HypeStage;
  const is_fading = pc5m < -3 && buy_ratio_5m < 0.4;
  const is_peak   = score > 75 && (vol_pace_5m < vol_pace_1h * 0.8 || pc5m < pc1h * 0.1);

  if (is_fading || score < 10)           stage = 'FADING';
  else if (is_peak || score > 80)         stage = 'PEAK';
  else if (score > 60 && vol_pace_5m > 1.5) stage = 'GROWING';
  else if (score > 35)                    stage = 'EARLY';
  else                                    stage = 'QUIET';

  // ── Timing ──
  const entry_window = stage === 'EARLY' || (stage === 'GROWING' && score < 70);
  const exit_signal  = stage === 'PEAK' || stage === 'FADING' || score > 82;

  let action: string;
  if (entry_window) action = `Enter now — hype building (score ${score.toFixed(0)}/100)`;
  else if (stage === 'GROWING') action = `Consider partial entry — momentum strong`;
  else if (exit_signal) action = `Exit or reduce — ${stage === 'PEAK' ? 'at peak' : 'fading'}`;
  else action = `Wait — no clear signal`;

  let peak_in: string | null = null;
  if (stage === 'EARLY' && vol_pace_5m > 1) peak_in = '10-25 minutes';
  else if (stage === 'GROWING')             peak_in = '5-15 minutes';
  else if (stage === 'PEAK')               peak_in = 'now or imminent';

  return {
    hype_score:         Math.round(score),
    hype_stage:         stage,
    recommended_action: action,
    estimated_peak_in:  peak_in,
    entry_window,
    exit_signal,
  };
}
