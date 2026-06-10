// ─── Wallet DNA ───────────────────────────────────────────────────────────────
// Classifies a wallet's trading style based on its on-chain activity

export const DNA_TYPES = ['SNIPER', 'WHALE', 'INSIDER', 'HOLDER', 'SCALPER', 'SWING', 'DEGENERATE', 'UNKNOWN'] as const;
export type DnaType = typeof DNA_TYPES[number];

export interface WalletActivity {
  totalTrades: number;
  avgHoldMinutes: number;     // average position hold time
  avgPositionUsd: number;     // average trade size
  winRate: number;            // 0-100
  earlyBuyRatio: number;      // 0-1: how often buys in first 5min of token
  insiderSignals: number;     // # times bought <1min before pump
  sniperTradeCount: number;   // # trades within first 5 blocks
  roi: number;                // overall ROI %
}

export interface DnaResult {
  dnaType: DnaType;
  scores: Record<DnaType, number>;
  confidence: number;
  explanation: string;
}

export function classifyWalletDna(a: WalletActivity): DnaResult {
  if (a.totalTrades < 3) {
    return {
      dnaType: 'UNKNOWN',
      scores: buildEmptyScores(),
      confidence: 0,
      explanation: 'Insufficient trade history for DNA classification.'
    };
  }

  const scores: Record<DnaType, number> = buildEmptyScores();

  // SNIPER: fast buys, early entry, short holds
  scores.SNIPER = Math.min(100, Math.round(
    a.earlyBuyRatio * 50 +
    (a.sniperTradeCount / Math.max(1, a.totalTrades)) * 30 +
    (a.avgHoldMinutes < 10 ? 20 : a.avgHoldMinutes < 60 ? 10 : 0)
  ));

  // WHALE: large positions
  scores.WHALE = Math.min(100, Math.round(
    Math.log10(Math.max(1, a.avgPositionUsd)) / Math.log10(100000) * 100
  ));

  // INSIDER: buys before pumps
  scores.INSIDER = Math.min(100, Math.round(
    (a.insiderSignals / Math.max(1, a.totalTrades)) * 150
  ));

  // HOLDER: long average hold
  scores.HOLDER = Math.min(100, Math.round(
    a.avgHoldMinutes > 10080 ? 100 :    // >7 days
    a.avgHoldMinutes > 1440 ? 75 :       // >1 day
    a.avgHoldMinutes > 360 ? 50 : 20
  ));

  // SCALPER: many small trades, short holds
  scores.SCALPER = Math.min(100, Math.round(
    (a.totalTrades > 100 ? 40 : a.totalTrades > 30 ? 20 : 5) +
    (a.avgHoldMinutes < 5 ? 40 : a.avgHoldMinutes < 30 ? 20 : 0) +
    (a.avgPositionUsd < 500 ? 20 : 0)
  ));

  // SWING: medium holds, decent win rate
  scores.SWING = Math.min(100, Math.round(
    (a.avgHoldMinutes >= 60 && a.avgHoldMinutes <= 10080 ? 40 : 0) +
    (a.winRate >= 55 ? 30 : a.winRate >= 45 ? 15 : 0) +
    (a.roi > 20 ? 30 : a.roi > 0 ? 15 : 0)
  ));

  // DEGENERATE: high risk, many trades, volatile
  scores.DEGENERATE = Math.min(100, Math.round(
    (a.totalTrades > 200 ? 40 : a.totalTrades > 50 ? 20 : 0) +
    (a.avgHoldMinutes < 60 ? 30 : 0) +
    (a.winRate < 40 ? 30 : 0)
  ));

  // Top type
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as [DnaType, number][];
  const [topType, topScore] = sorted[0];
  const confidence = Math.min(100, Math.round(topScore - (sorted[1]?.[1] ?? 0)));

  const explanations: Partial<Record<DnaType, string>> = {
    SNIPER:     `Early buyer — enters within first blocks. ${a.earlyBuyRatio > 0.5 ? 'High' : 'Moderate'} snipe ratio.`,
    WHALE:      `Large position trader. Avg $${a.avgPositionUsd.toLocaleString()}/trade.`,
    INSIDER:    `Suspected insider — ${a.insiderSignals} pre-pump entries.`,
    HOLDER:     `Long-term holder. Avg hold ${a.avgHoldMinutes > 1440 ? (a.avgHoldMinutes / 1440).toFixed(0) + 'd' : a.avgHoldMinutes + 'min'}.`,
    SCALPER:    `High-frequency scalper. ${a.totalTrades} trades, short holds.`,
    SWING:      `Swing trader. Win rate ${a.winRate.toFixed(0)}%, ROI ${a.roi.toFixed(0)}%.`,
    DEGENERATE: `Degen — many trades, volatile.`,
  };

  return {
    dnaType: topType,
    scores,
    confidence,
    explanation: explanations[topType] ?? 'Mixed trading style.'
  };
}

function buildEmptyScores(): Record<DnaType, number> {
  return { SNIPER: 0, WHALE: 0, INSIDER: 0, HOLDER: 0, SCALPER: 0, SWING: 0, DEGENERATE: 0, UNKNOWN: 0 };
}

/** Aggregate DNA breakdown for a token's buyer list */
export function aggregateTokenDna(buyerDna: DnaType[]): Array<{ dnaType: DnaType; count: number; pct: number }> {
  const totals: Partial<Record<DnaType, number>> = {};
  for (const d of buyerDna) totals[d] = (totals[d] ?? 0) + 1;
  const total = buyerDna.length || 1;
  return Object.entries(totals).map(([t, c]) => ({
    dnaType: t as DnaType,
    count: c as number,
    pct: Math.round(((c as number) / total) * 100)
  })).sort((a, b) => b.pct - a.pct);
}
