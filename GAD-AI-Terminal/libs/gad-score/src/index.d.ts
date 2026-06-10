export interface GadScoreInput {
    aiScore: number;
    narrativeScore: number;
    hypeScore: number;
    whaleScore: number;
    riskScore: number;
    survivalScore: number;
    rugProbability: number;
}
export interface GadScoreResult {
    gadScore: number;
    breakdown: {
        aiComponent: number;
        narrativeComponent: number;
        hyeComponent: number;
        whaleComponent: number;
        riskComponent: number;
        survivalComponent: number;
        rugComponent: number;
    };
    rating: 'LEGENDARY' | 'STRONG' | 'GOOD' | 'NEUTRAL' | 'WEAK' | 'DANGEROUS';
    explanation: string;
}
declare const WEIGHTS: {
    readonly ai: 0.3;
    readonly narrative: 0.15;
    readonly hype: 0.15;
    readonly whale: 0.15;
    readonly risk: 0.1;
    readonly survival: 0.1;
    readonly rug: 0.05;
};
export declare function calculateGadScore(input: GadScoreInput): GadScoreResult;
export { WEIGHTS as GAD_WEIGHTS };
