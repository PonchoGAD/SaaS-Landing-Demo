export interface SurvivalInput {
    ageHours: number;
    liquidityUsd: number;
    volume24hUsd: number;
    holderCount: number;
    top10HolderPct: number;
    rugProbability: number;
    aiScore: number;
    priceChange1h: number;
    txCount1h: number;
}
export interface SurvivalResult {
    survival1h: number;
    survival6h: number;
    survival24h: number;
    survival7d: number;
    overall: number;
    explanation: string;
}
export declare function calculateSurvivalScore(input: SurvivalInput): SurvivalResult;
