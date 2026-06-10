export interface RiskFactors {
  liquidityChange: number;
  largeSellPressure: number;
  holderConcentration: number;
  whaleActivity: number;
  volatility: number;
}

// Sprint 2 individual risk calculators — each returns 0 (safe) to 100 (extreme risk)

/** Liquidity risk: negative liquidityChangePercent means liquidity dropped */
export function calculateLiquidityRisk(liquidityChangePercent: number): number {
  const drop = Math.max(0, -liquidityChangePercent);
  // -20% drop → 20, -100% drop → 100
  return Math.round(Math.min(100, drop));
}

/** Holder concentration risk: percent of supply held by top wallets */
export function calculateHolderRisk(topHolderConcentrationPercent: number): number {
  // <20% = low risk, >80% = extreme
  const clamped = Math.max(0, Math.min(100, topHolderConcentrationPercent));
  if (clamped < 20) return Math.round(clamped * 0.5);
  if (clamped < 50) return Math.round(10 + (clamped - 20) * 1.5);
  if (clamped < 80) return Math.round(55 + (clamped - 50) * 1.0);
  return Math.round(85 + (clamped - 80) * 0.75);
}

/** Volume anomaly risk: percent spike vs. baseline volume */
export function calculateVolumeRisk(volumeSpikePercent: number): number {
  // 0% normal → 0 risk; 500% spike → ~80 risk; 1000%+ → 100
  const spike = Math.max(0, volumeSpikePercent);
  const score = (spike / 1000) * 100;
  return Math.round(Math.min(100, score));
}

/** Whale risk: percent of recent volume from large wallets selling */
export function calculateWhaleRisk(largeSellsPercentOfVolume: number): number {
  const pct = Math.max(0, Math.min(100, largeSellsPercentOfVolume));
  if (pct < 20) return Math.round(pct * 0.5);
  if (pct < 50) return Math.round(10 + (pct - 20) * 2.0);
  return Math.round(70 + (pct - 50) * 0.6);
}

/** Overall risk — weighted average of all five factors */
export function calculateOverallRisk(factors: RiskFactors): number {
  return calculateRiskScore(factors);
}

// ─── Core weighted scorer (unchanged) ───────────────────────────────────────

export function calculateRiskScore(factors: RiskFactors): number {
  const weights = {
    liquidityChange: 0.28,
    largeSellPressure: 0.22,
    holderConcentration: 0.18,
    whaleActivity: 0.17,
    volatility: 0.15
  };

  const score =
    Math.min(
      100,
      Math.max(
        0,
        weights.liquidityChange * factors.liquidityChange +
          weights.largeSellPressure * factors.largeSellPressure +
          weights.holderConcentration * factors.holderConcentration +
          weights.whaleActivity * factors.whaleActivity +
          weights.volatility * factors.volatility
      )
    );

  return Math.round(score);
}

export function explainRiskScore(factors: RiskFactors): string {
  const parts: string[] = [];

  if (factors.liquidityChange > 70) {
    parts.push('Liquidity dropped sharply — execution risk is high.');
  } else if (factors.liquidityChange > 40) {
    parts.push('Liquidity weakening; monitor order book depth.');
  } else {
    parts.push('Liquidity remains stable.');
  }

  if (factors.largeSellPressure > 60) {
    parts.push('Large sell pressure detected from whale-like trades.');
  }

  if (factors.holderConcentration > 60) {
    parts.push('A few wallets control most of the supply.');
  }

  if (factors.whaleActivity > 50) {
    parts.push('High whale movement suggests unusual risk.');
  }

  if (factors.volatility > 60) {
    parts.push('Price volatility is extreme.');
  }

  return parts.join(' ');
}

/** Map a raw overall score to a human label */
export function riskLabel(score: number): string {
  if (score >= 80) return 'EXTREME';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'SAFE';
}
