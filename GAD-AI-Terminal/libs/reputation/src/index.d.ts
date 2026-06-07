export declare const REPUTATION_TIERS: readonly ["LEGEND", "SMART", "AVERAGE", "TOURIST", "EXIT_LIQUIDITY"];
export type ReputationTier = typeof REPUTATION_TIERS[number];
export interface ReputationInput {
    winRate: number;
    totalReturn: number;
    verifiedWins: number;
    verifiedRugs: number;
    avgHoldHours: number;
    earlyEntryRate: number;
    exitQuality: number;
    avgConvictionX: number;
    maxConvictionHoldHours: number;
    totalTrades: number;
    avgTradeUsd: number;
    accountAgedays: number;
}
export interface ReputationResult {
    tier: ReputationTier;
    reputationScore: number;
    components: {
        winRateScore: number;
        earlyEntryScore: number;
        convictionScore: number;
        exitQualityScore: number;
        totalReturnScore: number;
        tenureScore: number;
    };
    badge: string;
    description: string;
    warning: string | null;
}
export declare function classifyReputation(input: ReputationInput): ReputationResult;
/** Emoji for tier */
export declare function reputationEmoji(tier: ReputationTier): string;
/** Weight multiplier for smart money signals based on reputation */
export declare function reputationWeight(tier: ReputationTier): number;
