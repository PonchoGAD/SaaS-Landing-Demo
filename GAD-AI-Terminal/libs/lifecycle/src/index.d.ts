export declare const LIFECYCLE_STAGES: readonly ["BIRTH", "ACCUMULATION", "BREAKOUT", "HYPE", "DISTRIBUTION", "DEATH"];
export type LifecycleStage = typeof LIFECYCLE_STAGES[number];
export interface LifecycleInput {
    ageHours: number;
    volumeAcceleration: number;
    holderGrowthRate: number;
    priceChange1h: number;
    priceChange24h: number;
    whaleNetFlow: number;
    socialAcceleration: number;
    liquidityUsd: number;
    sellBuyRatio: number;
    rugProbability: number;
    holderCount: number;
}
export interface LifecycleResult {
    stage: LifecycleStage;
    stageScore: number;
    nextStage: LifecycleStage | null;
    timeInStageEst: string;
    factors: {
        volumeAcceleration: number;
        holderGrowth: number;
        priceMomentum: number;
        whaleAccumulation: number;
        socialAcceleration: number;
        liquidityDepth: number;
        sellPressure: number;
    };
    explanation: string;
    alert: string | null;
}
export declare function detectLifecycle(input: LifecycleInput): LifecycleResult;
/** Score bonus to apply to GAD/Opportunity score based on lifecycle stage */
export declare function lifecycleBonus(stage: LifecycleStage): number;
/** Visual emoji for stage */
export declare function lifecycleEmoji(stage: LifecycleStage): string;
