export interface TokenSnapshot {
    aiScore: number;
    riskScore: number;
    rugProbability: number;
    narrativeTag: string;
    hypeScore: number;
    whaleScore: number;
    holderCount: number;
    liquidityUsd: number;
    volume24hUsd: number;
    ageHours: number;
    lifecycleStage: string;
}
export interface HistoricalRecord extends TokenSnapshot {
    outcome: 'WINNER_10X' | 'WINNER_50X' | 'WINNER_100X' | 'NEUTRAL' | 'RUG' | 'DEAD';
    peakGainX: number;
    mintAddress?: string;
}
export interface SimilarityResult {
    similarityScore: number;
    matchedWinners: number;
    avgWinnerGainX: number;
    topMatchOutcome: string | null;
    rugSimilarity: number;
    explanation: string;
}
declare function cosineSimilarity(a: number[], b: number[]): number;
export declare function calculateAlphaSimilarity(current: TokenSnapshot, history: HistoricalRecord[]): SimilarityResult;
/** Record a token's current state for future ML comparison */
export declare function buildTokenSnapshot(params: {
    aiScore: number;
    riskScore: number;
    rugProbability: number;
    narrativeTag: string;
    hypeScore: number;
    whaleScore: number;
    holderCount: number;
    liquidityUsd: number;
    volume24hUsd: number;
    ageHours: number;
    lifecycleStage: string;
}): TokenSnapshot;
/** Determine outcome label given peak gain */
export declare function labelOutcome(peakGainX: number): HistoricalRecord['outcome'];
/** Simple cosine distance for external use */
export { cosineSimilarity };
