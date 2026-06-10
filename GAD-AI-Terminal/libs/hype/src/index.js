"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectHype = detectHype;
function detectHype(pair) {
  const pc5m  = Number(pair.priceChange?.m5  ?? 0);
  const pc1h  = Number(pair.priceChange?.h1  ?? 0);
  const vol5m  = Number(pair.volume?.m5  ?? 0);
  const vol1h  = Number(pair.volume?.h1  ?? 0);
  const vol6h  = Number(pair.volume?.h6  ?? 0);
  const txm5b = pair.txns?.m5?.buys  ?? 0;
  const txm5s = pair.txns?.m5?.sells ?? 0;
  const txh1b = pair.txns?.h1?.buys  ?? 0;
  const txh1s = pair.txns?.h1?.sells ?? 0;
  const vol_pace_5m = vol1h > 0 ? (vol5m * 12) / vol1h : 0;
  const vol_pace_1h = vol6h > 0 ? vol1h / (vol6h / 6) : 0;
  const total_txm5 = txm5b + txm5s;
  const total_txh1 = txh1b + txh1s;
  const tx_pace = total_txh1 > 0 ? (total_txm5 * 12) / total_txh1 : 0;
  const buy_ratio_5m = total_txm5 > 0 ? txm5b / total_txm5 : 0.5;
  const buy_ratio_1h = total_txh1 > 0 ? txh1b / total_txh1 : 0.5;
  let score = 0;
  score += Math.min(Math.max(pc1h, 0), 50) / 50 * 30;
  score += Math.min(vol_pace_5m, 3) / 3 * 20;
  score += Math.min(vol_pace_1h, 2) / 2 * 10;
  score += Math.min(tx_pace, 3) / 3 * 20;
  score += buy_ratio_5m * 10;
  score += buy_ratio_1h * 10;
  score = Math.max(0, Math.min(100, score));
  const is_fading = pc5m < -3 && buy_ratio_5m < 0.4;
  const is_peak   = score > 75 && (vol_pace_5m < vol_pace_1h * 0.8 || pc5m < pc1h * 0.1);
  let stage;
  if (is_fading || score < 10)           stage = 'FADING';
  else if (is_peak || score > 80)         stage = 'PEAK';
  else if (score > 60 && vol_pace_5m > 1.5) stage = 'GROWING';
  else if (score > 35)                    stage = 'EARLY';
  else                                    stage = 'QUIET';
  const entry_window = stage === 'EARLY' || (stage === 'GROWING' && score < 70);
  const exit_signal  = stage === 'PEAK' || stage === 'FADING' || score > 82;
  let action;
  if (entry_window) action = `Enter now — hype building (${score.toFixed(0)}/100)`;
  else if (stage === 'GROWING') action = 'Consider partial entry';
  else if (exit_signal) action = `Exit — ${stage === 'PEAK' ? 'at peak' : 'fading'}`;
  else action = 'Wait — no clear signal';
  const peak_in = stage === 'EARLY' && vol_pace_5m > 1 ? '10-25 minutes'
    : stage === 'GROWING' ? '5-15 minutes'
    : stage === 'PEAK' ? 'now or imminent' : null;
  return { hype_score: Math.round(score), hype_stage: stage, recommended_action: action, estimated_peak_in: peak_in, entry_window, exit_signal };
}
