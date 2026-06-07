"use strict";
// Meme Lifecycle Engine
// Determines which stage a memecoin is in:
// BIRTH → ACCUMULATION → BREAKOUT → HYPE → DISTRIBUTION → DEATH
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIFECYCLE_STAGES = void 0;
exports.detectLifecycle = detectLifecycle;
exports.lifecycleBonus = lifecycleBonus;
exports.lifecycleEmoji = lifecycleEmoji;
exports.LIFECYCLE_STAGES = [
    'BIRTH',
    'ACCUMULATION',
    'BREAKOUT',
    'HYPE',
    'DISTRIBUTION',
    'DEATH'
];
function clamp(v, lo = 0, hi = 100) {
    return Math.min(hi, Math.max(lo, v));
}
// Stage scores: higher score = more likely in that stage
function computeStageScores(input) {
    const { ageHours, volumeAcceleration, holderGrowthRate, priceChange1h, priceChange24h, whaleNetFlow, socialAcceleration, liquidityUsd, sellBuyRatio, rugProbability, holderCount } = input;
    const volAcc = clamp(volumeAcceleration * 20, 0, 100); // 0 = no accel, 5x = 100
    const holderGrowth = clamp(holderGrowthRate / 50 * 100); // 50 new/h = max
    const priceMom = clamp((priceChange1h + 50) * 1); // -50 to 150%
    const socialAcc = clamp(socialAcceleration);
    const whaleBuy = clamp(whaleNetFlow);
    const sellPressure = clamp(sellBuyRatio * 50); // 2x ratio = high
    const liqScore = clamp(Math.log10(Math.max(100, liquidityUsd)) / 5 * 100);
    const scores = {
        BIRTH: 0,
        ACCUMULATION: 0,
        BREAKOUT: 0,
        HYPE: 0,
        DISTRIBUTION: 0,
        DEATH: 0
    };
    // BIRTH: very new, low volume, low holders, low social
    scores.BIRTH = clamp((ageHours < 1 ? 60 : ageHours < 6 ? 30 : 0) +
        (holderCount < 50 ? 20 : holderCount < 200 ? 10 : 0) +
        (liquidityUsd < 10000 ? 10 : 0) +
        (volAcc < 30 ? 10 : 0));
    // ACCUMULATION: steady holder growth, moderate volume, quiet social
    scores.ACCUMULATION = clamp((holderGrowthRate > 5 && holderGrowthRate < 100 ? 35 : 0) +
        (volumeAcceleration > 0.2 && volumeAcceleration < 2 ? 25 : 0) +
        (priceChange24h > 0 && priceChange24h < 50 ? 20 : 0) +
        (socialAcc < 60 ? 10 : 0) +
        (whaleBuy > 50 ? 10 : 0));
    // BREAKOUT: volume explosion, price surge, whale buying
    scores.BREAKOUT = clamp((volumeAcceleration > 2 ? 40 : volumeAcceleration > 1 ? 20 : 0) +
        (priceChange1h > 20 ? 30 : priceChange1h > 10 ? 15 : 0) +
        (whaleBuy > 60 ? 20 : 0) +
        (holderGrowthRate > 50 ? 10 : 0));
    // HYPE: extreme social, price near peak, volume high but slowing
    scores.HYPE = clamp((socialAcc > 70 ? 40 : socialAcc > 50 ? 20 : 0) +
        (priceChange24h > 100 ? 30 : priceChange24h > 50 ? 15 : 0) +
        (volumeAcceleration < 1.5 && volumeAcceleration > 0.5 ? 15 : 0) +
        (holderCount > 500 ? 15 : 0));
    // DISTRIBUTION: high sell pressure, whale exits, price falling from peak
    scores.DISTRIBUTION = clamp((sellBuyRatio > 1.3 ? 40 : sellBuyRatio > 1.1 ? 20 : 0) +
        (priceChange1h < -5 ? 20 : 0) +
        (whaleNetFlow < 30 ? 20 : 0) +
        (priceChange24h < 0 && priceChange24h > -50 ? 15 : 0) +
        (socialAcc < 40 && holderCount > 300 ? 5 : 0));
    // DEATH: liquidity gone, rug or collapse
    scores.DEATH = clamp((rugProbability > 60 ? 40 : 0) +
        (liquidityUsd < 1000 ? 30 : liquidityUsd < 5000 ? 15 : 0) +
        (priceChange24h < -70 ? 20 : priceChange24h < -50 ? 10 : 0) +
        (holderGrowthRate < 0 ? 10 : 0));
    return scores;
}
const STAGE_NEXT = {
    BIRTH: 'ACCUMULATION',
    ACCUMULATION: 'BREAKOUT',
    BREAKOUT: 'HYPE',
    HYPE: 'DISTRIBUTION',
    DISTRIBUTION: 'DEATH',
    DEATH: null
};
const STAGE_EST_TIME = {
    BIRTH: '0–6 hours',
    ACCUMULATION: '6–48 hours',
    BREAKOUT: '1–6 hours',
    HYPE: '2–24 hours',
    DISTRIBUTION: '1–12 hours',
    DEATH: 'permanent'
};
const STAGE_ALERTS = {
    BIRTH: 'NEW TOKEN — Early entry window. High risk, high reward.',
    ACCUMULATION: 'SMART MONEY WINDOW — Accumulation detected. Watch for breakout.',
    BREAKOUT: 'BREAKOUT DETECTED — Volume explosion. Momentum entry.',
    HYPE: 'HYPE PEAK — Social frenzy. Consider taking profits.',
    DISTRIBUTION: 'WARNING — Whales distributing. Exit risk increasing.',
    DEATH: 'DANGER — Token collapsing. Avoid or exit immediately.'
};
function detectLifecycle(input) {
    const scores = computeStageScores(input);
    // Winning stage = highest score
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);
    const [stage, stageScore] = sorted[0];
    const nextStage = STAGE_NEXT[stage];
    const factors = {
        volumeAcceleration: clamp(input.volumeAcceleration * 20, 0, 100),
        holderGrowth: clamp(input.holderGrowthRate / 50 * 100),
        priceMomentum: clamp((input.priceChange1h + 50)),
        whaleAccumulation: clamp(input.whaleNetFlow),
        socialAcceleration: clamp(input.socialAcceleration),
        liquidityDepth: clamp(Math.log10(Math.max(100, input.liquidityUsd)) / 5 * 100),
        sellPressure: clamp(input.sellBuyRatio * 50)
    };
    const explanation = buildExplanation(stage, stageScore, input, sorted);
    return {
        stage,
        stageScore: Math.round(stageScore),
        nextStage,
        timeInStageEst: STAGE_EST_TIME[stage],
        factors,
        explanation,
        alert: STAGE_ALERTS[stage] ?? null
    };
}
function buildExplanation(stage, score, input, sorted) {
    const second = sorted[1];
    const confidence = score - second[1];
    const parts = [`Stage: ${stage} (confidence ${Math.round(score)}/100).`];
    switch (stage) {
        case 'BIRTH':
            parts.push(`Token is ${input.ageHours.toFixed(1)}h old, ${input.holderCount} holders.`);
            break;
        case 'ACCUMULATION':
            parts.push(`+${input.holderGrowthRate.toFixed(0)} new holders/h. Smart money building position.`);
            break;
        case 'BREAKOUT':
            parts.push(`Volume ${input.volumeAcceleration.toFixed(1)}x surge. Price +${input.priceChange1h.toFixed(0)}% last hour.`);
            break;
        case 'HYPE':
            parts.push(`Social velocity ${input.socialAcceleration.toFixed(0)}/100. Price +${input.priceChange24h.toFixed(0)}% 24h.`);
            break;
        case 'DISTRIBUTION':
            parts.push(`Sell/buy ratio ${input.sellBuyRatio.toFixed(2)}x. Whale flow dropping.`);
            break;
        case 'DEATH':
            parts.push(`Liquidity $${(input.liquidityUsd / 1000).toFixed(1)}k. Rug probability ${input.rugProbability}%.`);
            break;
    }
    if (confidence < 20) {
        parts.push(`Transitioning toward ${second[0]}.`);
    }
    return parts.join(' ');
}
/** Score bonus to apply to GAD/Opportunity score based on lifecycle stage */
function lifecycleBonus(stage) {
    const bonuses = {
        BIRTH: +15, // high risk, high reward bonus
        ACCUMULATION: +20, // best entry window
        BREAKOUT: +10, // momentum bonus
        HYPE: -5, // late entry penalty
        DISTRIBUTION: -20, // danger penalty
        DEATH: -40 // avoid
    };
    return bonuses[stage];
}
/** Visual emoji for stage */
function lifecycleEmoji(stage) {
    const emojis = {
        BIRTH: '🐣',
        ACCUMULATION: '🌱',
        BREAKOUT: '🚀',
        HYPE: '🔥',
        DISTRIBUTION: '⚠️',
        DEATH: '💀'
    };
    return emojis[stage];
}
