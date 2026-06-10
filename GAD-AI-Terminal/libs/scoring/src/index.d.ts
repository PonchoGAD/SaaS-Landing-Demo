export interface ScoreFactors {
    growth: number;
    liquidity: number;
    volume: number;
    holders: number;
    momentum: number;
    risk: number;
}
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
export declare function normalizeScore(value: number): number;
export declare function calculateAiScore(factors: ScoreFactors): number;
/** Sprint 3: returns full score object with explanation */
export declare function calculateFullScore(factors: ScoreFactors): AiScoreResult;
/** Legacy helper kept for backwards compatibility */
export declare function buildFactorReport(factors: ScoreFactors): {
    growth: number;
    liquidity: number;
    volume: number;
    holders: number;
    momentum: number;
    risk: number;
    aiScore: number;
};
/**
 * Derive ScoreFactors from raw token metrics.
 * All inputs are 0-100 normalised by the caller.
 */
export declare function deriveFactors(params: {
    priceChange1h: number;
    priceChange24h: number;
    liquidityChangePercent: number;
    volume1h: number;
    volume24h: number;
    holderCount: number;
    holderCountBaseline: number;
    riskScore: number;
}): ScoreFactors;
