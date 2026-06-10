"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_RULES = exports.ruleAiScoreIncrease = exports.ruleNewToken = exports.ruleLiquidityDrop = exports.ruleVolumeSpike = exports.ruleWhaleActivity = exports.ruleHighRisk = exports.ruleNewHighScore = exports.THRESHOLDS = void 0;
exports.evaluateRules = evaluateRules;
const alert_types_1 = require("./alert.types");
// ─── Thresholds (overridable via env) ────────────────────────────────────────
exports.THRESHOLDS = {
    HIGH_SCORE: Number(process.env.ALERT_HIGH_SCORE_THRESHOLD ?? 80),
    HIGH_RISK: Number(process.env.ALERT_HIGH_RISK_THRESHOLD ?? 70),
    WHALE_ACTIVITY: Number(process.env.ALERT_WHALE_ACTIVITY_THRESHOLD ?? 60),
    VOLUME_SPIKE_RATIO: Number(process.env.ALERT_VOLUME_SPIKE_RATIO ?? 3.0),
    LIQUIDITY_DROP: Number(process.env.ALERT_LIQUIDITY_DROP_THRESHOLD ?? -20),
    AI_SCORE_INCREASE: Number(process.env.ALERT_AI_SCORE_INCREASE_DELTA ?? 15),
};
// ─── Individual rules ─────────────────────────────────────────────────────────
const ruleNewHighScore = (ctx) => {
    if (ctx.aiScore < exports.THRESHOLDS.HIGH_SCORE)
        return null;
    return {
        type: alert_types_1.AlertType.NEW_HIGH_SCORE,
        subject: ctx.mintAddress,
        payload: { tokenId: ctx.tokenId, aiScore: ctx.aiScore, symbol: ctx.symbol },
        score: ctx.aiScore
    };
};
exports.ruleNewHighScore = ruleNewHighScore;
const ruleHighRisk = (ctx) => {
    if (ctx.riskScore < exports.THRESHOLDS.HIGH_RISK)
        return null;
    return {
        type: alert_types_1.AlertType.HIGH_RISK,
        subject: ctx.mintAddress,
        payload: { tokenId: ctx.tokenId, riskScore: ctx.riskScore, symbol: ctx.symbol },
        score: ctx.riskScore
    };
};
exports.ruleHighRisk = ruleHighRisk;
const ruleWhaleActivity = (ctx) => {
    const ws = ctx.whaleActivityScore ?? 0;
    if (ws < exports.THRESHOLDS.WHALE_ACTIVITY)
        return null;
    return {
        type: alert_types_1.AlertType.WHALE_ACTIVITY,
        subject: ctx.mintAddress,
        payload: { tokenId: ctx.tokenId, whaleActivityScore: ws, symbol: ctx.symbol },
        score: ws
    };
};
exports.ruleWhaleActivity = ruleWhaleActivity;
const ruleVolumeSpike = (ctx) => {
    if (ctx.volume1h <= 0)
        return null;
    const ratio = (ctx.volume5m * 12) / ctx.volume1h;
    if (ratio < exports.THRESHOLDS.VOLUME_SPIKE_RATIO)
        return null;
    return {
        type: alert_types_1.AlertType.VOLUME_SPIKE,
        subject: ctx.mintAddress,
        payload: {
            tokenId: ctx.tokenId,
            volume5m: ctx.volume5m,
            volume1h: ctx.volume1h,
            spikeRatio: Math.round(ratio * 100) / 100,
            symbol: ctx.symbol
        },
        score: Math.min(100, Math.round(ratio * 20))
    };
};
exports.ruleVolumeSpike = ruleVolumeSpike;
const ruleLiquidityDrop = (ctx) => {
    if (ctx.liquidityChange > exports.THRESHOLDS.LIQUIDITY_DROP)
        return null;
    return {
        type: alert_types_1.AlertType.LIQUIDITY_DROP,
        subject: ctx.mintAddress,
        payload: {
            tokenId: ctx.tokenId,
            liquidityChange: ctx.liquidityChange,
            symbol: ctx.symbol
        },
        score: Math.min(100, Math.round(Math.abs(ctx.liquidityChange)))
    };
};
exports.ruleLiquidityDrop = ruleLiquidityDrop;
const ruleNewToken = (ctx) => {
    if (!ctx.isNewToken)
        return null;
    return {
        type: alert_types_1.AlertType.NEW_TOKEN,
        subject: ctx.mintAddress,
        payload: { tokenId: ctx.tokenId, aiScore: ctx.aiScore, symbol: ctx.symbol },
        score: ctx.aiScore
    };
};
exports.ruleNewToken = ruleNewToken;
const ruleAiScoreIncrease = (ctx) => {
    if (ctx.previousAiScore === undefined)
        return null;
    const delta = ctx.aiScore - ctx.previousAiScore;
    if (delta < exports.THRESHOLDS.AI_SCORE_INCREASE)
        return null;
    return {
        type: alert_types_1.AlertType.AI_SCORE_INCREASE,
        subject: ctx.mintAddress,
        payload: {
            tokenId: ctx.tokenId,
            previousScore: ctx.previousAiScore,
            currentScore: ctx.aiScore,
            delta,
            symbol: ctx.symbol
        },
        score: ctx.aiScore
    };
};
exports.ruleAiScoreIncrease = ruleAiScoreIncrease;
// ─── Rule registry ────────────────────────────────────────────────────────────
exports.ALL_RULES = [
    exports.ruleNewHighScore,
    exports.ruleHighRisk,
    exports.ruleWhaleActivity,
    exports.ruleVolumeSpike,
    exports.ruleLiquidityDrop,
    exports.ruleNewToken,
    exports.ruleAiScoreIncrease
];
/** Evaluate all rules and return every triggered AlertInput */
function evaluateRules(ctx) {
    return exports.ALL_RULES.reduce((acc, rule) => {
        const result = rule(ctx);
        if (result)
            acc.push(result);
        return acc;
    }, []);
}
