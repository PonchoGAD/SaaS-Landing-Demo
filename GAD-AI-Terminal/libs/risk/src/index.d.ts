export interface RiskFactors {
    liquidityChange: number;
    largeSellPressure: number;
    holderConcentration: number;
    whaleActivity: number;
    volatility: number;
}
/** Liquidity risk: negative liquidityChangePercent means liquidity dropped */
export declare function calculateLiquidityRisk(liquidityChangePercent: number): number;
/** Holder concentration risk: percent of supply held by top wallets */
export declare function calculateHolderRisk(topHolderConcentrationPercent: number): number;
/** Volume anomaly risk: percent spike vs. baseline volume */
export declare function calculateVolumeRisk(volumeSpikePercent: number): number;
/** Whale risk: percent of recent volume from large wallets selling */
export declare function calculateWhaleRisk(largeSellsPercentOfVolume: number): number;
/** Overall risk — weighted average of all five factors */
export declare function calculateOverallRisk(factors: RiskFactors): number;
export declare function calculateRiskScore(factors: RiskFactors): number;
export declare function explainRiskScore(factors: RiskFactors): string;
/** Map a raw overall score to a human label */
export declare function riskLabel(score: number): string;
