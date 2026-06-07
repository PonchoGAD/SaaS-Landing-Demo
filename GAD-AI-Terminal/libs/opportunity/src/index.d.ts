import { LifecycleStage } from '@lib/lifecycle';
export interface OpportunityInput {
    narrativeMomentum: number;
    whaleAccumulation: number;
    volumeBreakoutScore: number;
    socialVelocity: number;
    alphaSimilarity: number;
    lifecycleStage: LifecycleStage;
    riskScore: number;
    rugProbability: number;
    aiScore: number;
    survivalScore: number;
    regimeMultiplier: number;
    priceAlreadyUp24h: number;
    marketCapUsd: number;
}
export interface OpportunityResult {
    opportunityScore: number;
    confidence: number;
    components: {
        narrativeMomentum: number;
        whaleAccumulation: number;
        volumeBreakout: number;
        socialVelocity: number;
        alphaSimilarity: number;
        lifecycleBonus: number;
        riskPenalty: number;
        chasePenalty: number;
    };
    recommendation: 'STRONG_BUY' | 'BUY' | 'WATCH' | 'NEUTRAL' | 'AVOID';
    reason: string;
    regimeAdjusted: boolean;
    estimatedUpsideX: number | null;
}
export declare function calculateOpportunityScore(input: OpportunityInput): OpportunityResult;
/** Calculate volume breakout score: volume rising faster than price is a pre-pump signal */
export declare function calculateVolumeBreakout(params: {
    volume5m: number;
    volume1h: number;
    volume24h: number;
    priceChange1h: number;
}): number;
/** Calculate narrative momentum: is this narrative tag trending up? */
export declare function calculateNarrativeMomentum(params: {
    narrativeTag: string;
    narrativeStrength: number;
    narrativeRotationRank: number;
    narrativeMomentumDir: 'RISING' | 'FALLING' | 'STABLE' | 'PEAK' | 'DEAD';
}): number;
