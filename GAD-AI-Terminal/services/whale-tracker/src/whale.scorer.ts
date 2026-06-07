export interface WhaleScoringInput {
  buyCount: number;
  sellCount: number;
  winRate: number;      // 0-100
  roi: number;          // percent
  avgHoldSeconds: number;
  largestTrade: number; // USD
  totalVolume: number;  // USD
}

/** Returns a Whale Score 0-100 */
export function calculateWhaleScore(input: WhaleScoringInput): number {
  const {
    buyCount, sellCount, winRate, roi, avgHoldSeconds, largestTrade, totalVolume
  } = input;

  const totalTrades = buyCount + sellCount;
  if (totalTrades < 3) return 0;

  // Activity: more trades = more data (log scale), cap at 30 points
  const activityScore = Math.min(30, Math.log10(Math.max(1, totalTrades)) * 15);

  // Win rate: 50% = 0, 100% = 25 points
  const winScore = Math.max(0, (winRate - 50) * 0.5);

  // ROI: 0% = 0, 200% = 25 points
  const roiScore = Math.min(25, Math.max(0, roi * 0.125));

  // Size: large trades = more weight (log scale), cap at 15 points
  const sizeScore = Math.min(15, Math.log10(Math.max(1, largestTrade / 1000)) * 5);

  // Hold time: shorter = more active (memecoin style), up to 5 points
  const holdScore = avgHoldSeconds < 3600 ? 5 : avgHoldSeconds < 86400 ? 3 : 1;

  const raw = activityScore + winScore + roiScore + sizeScore + holdScore;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/** Returns a Smart Money Score 0-100 */
export function calculateSmartMoneyScore(input: {
  roi: number;
  winRate: number;
  totalTrades: number;
}): number {
  const { roi, winRate, totalTrades } = input;
  if (totalTrades < 30) return 0;

  // Baseline: 50% win rate + 50% ROI = 50 points
  const winComponent  = Math.min(40, Math.max(0, (winRate - 50) * 2));
  const roiComponent  = Math.min(40, Math.max(0, roi * 0.4));
  const tradeComponent = Math.min(20, Math.log10(Math.max(1, totalTrades)) * 10);

  return Math.min(100, Math.max(0, Math.round(winComponent + roiComponent + tradeComponent)));
}
