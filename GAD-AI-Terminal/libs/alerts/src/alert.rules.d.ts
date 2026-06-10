import { AlertInput, TokenAlertContext } from './alert.types';
export declare const THRESHOLDS: {
    readonly HIGH_SCORE: number;
    readonly HIGH_RISK: number;
    readonly WHALE_ACTIVITY: number;
    readonly VOLUME_SPIKE_RATIO: number;
    readonly LIQUIDITY_DROP: number;
    readonly AI_SCORE_INCREASE: number;
};
type RuleFn = (ctx: TokenAlertContext) => AlertInput | null;
export declare const ruleNewHighScore: RuleFn;
export declare const ruleHighRisk: RuleFn;
export declare const ruleWhaleActivity: RuleFn;
export declare const ruleVolumeSpike: RuleFn;
export declare const ruleLiquidityDrop: RuleFn;
export declare const ruleNewToken: RuleFn;
export declare const ruleAiScoreIncrease: RuleFn;
export declare const ALL_RULES: RuleFn[];
/** Evaluate all rules and return every triggered AlertInput */
export declare function evaluateRules(ctx: TokenAlertContext): AlertInput[];
export {};
