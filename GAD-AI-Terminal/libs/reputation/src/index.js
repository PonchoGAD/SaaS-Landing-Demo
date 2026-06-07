"use strict";
// Wallet Reputation Engine
// Classifies wallets as: LEGEND | SMART | AVERAGE | TOURIST | EXIT_LIQUIDITY
//
// Goes beyond DNA (which is trading style) — Reputation measures QUALITY over time.
// Key insight: EXIT_LIQUIDITY wallets are the ones regular users buy from at the top.
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPUTATION_TIERS = void 0;
exports.classifyReputation = classifyReputation;
exports.reputationEmoji = reputationEmoji;
exports.reputationWeight = reputationWeight;
exports.REPUTATION_TIERS = [
    'LEGEND',
    'SMART',
    'AVERAGE',
    'TOURIST',
    'EXIT_LIQUIDITY'
];
function clamp(v, lo = 0, hi = 100) {
    return Math.min(hi, Math.max(lo, v));
}
function classifyReputation(input) {
    // ─── Component scores ──────────────────────────────────────────────────────
    // Win rate (0-100): >70% = LEGEND territory
    const winRateScore = clamp(input.winRate >= 70 ? 100 :
        input.winRate >= 55 ? 60 + (input.winRate - 55) * 2.67 :
            input.winRate >= 40 ? 20 + (input.winRate - 40) * 2.67 :
                input.winRate * 0.5);
    // Early entry: buys at BIRTH/ACCUMULATION before the crowd
    const earlyEntryScore = clamp(input.earlyEntryRate * 100 +
        (input.verifiedWins >= 5 ? 15 : input.verifiedWins >= 2 ? 7 : 0));
    // Conviction: holds winners, doesn't paper-hand
    const convictionScore = clamp((input.avgHoldHours > 48 ? 40 : input.avgHoldHours > 6 ? 20 : 5) +
        (input.avgConvictionX > 5 ? 30 : input.avgConvictionX > 2 ? 15 : 0) +
        (input.maxConvictionHoldHours > 168 ? 30 : input.maxConvictionHoldHours > 24 ? 15 : 0));
    // Exit quality: sells near peak, not into decline
    const exitQualityScore = clamp(input.exitQuality);
    // Total return: raw performance
    const totalReturnScore = clamp(input.totalReturn >= 1000 ? 100 :
        input.totalReturn >= 500 ? 80 :
            input.totalReturn >= 200 ? 60 :
                input.totalReturn >= 100 ? 40 :
                    input.totalReturn >= 0 ? 20 : 0);
    // Tenure: older account with history = more trust
    const tenureScore = clamp(input.accountAgedays >= 365 ? 100 :
        input.accountAgedays >= 180 ? 70 :
            input.accountAgedays >= 90 ? 50 :
                input.accountAgedays >= 30 ? 30 : 10);
    // ─── Weighted reputation score ─────────────────────────────────────────────
    const reputationScore = clamp(Math.round(winRateScore * 0.25 +
        earlyEntryScore * 0.20 +
        convictionScore * 0.20 +
        exitQualityScore * 0.15 +
        totalReturnScore * 0.15 +
        tenureScore * 0.05));
    // ─── Rug participation penalty ─────────────────────────────────────────────
    const rugRatio = input.totalTrades > 0
        ? input.verifiedRugs / input.totalTrades
        : 0;
    const penalizedScore = clamp(Math.round(reputationScore * (1 - rugRatio * 0.5)));
    // ─── Tier classification ───────────────────────────────────────────────────
    let tier;
    // EXIT_LIQUIDITY: low win rate, sells to others at peak, high rug ratio
    if (input.winRate < 30 && rugRatio > 0.2) {
        tier = 'EXIT_LIQUIDITY';
    }
    else if (penalizedScore >= 80 && input.verifiedWins >= 3) {
        tier = 'LEGEND';
    }
    else if (penalizedScore >= 60) {
        tier = 'SMART';
    }
    else if (penalizedScore >= 35) {
        tier = 'AVERAGE';
    }
    else if (input.totalTrades < 5 || input.accountAgedays < 14) {
        tier = 'TOURIST';
    }
    else {
        tier = 'EXIT_LIQUIDITY';
    }
    // ─── Badge and description ─────────────────────────────────────────────────
    const BADGES = {
        LEGEND: '👑 LEGEND',
        SMART: '🧠 SMART',
        AVERAGE: '📊 AVERAGE',
        TOURIST: '🧳 TOURIST',
        EXIT_LIQUIDITY: '🚨 EXIT LIQUIDITY'
    };
    const DESCRIPTIONS = {
        LEGEND: `Elite wallet. Win rate ${input.winRate.toFixed(0)}%, ${input.verifiedWins} verified 5x+ wins. Conviction holder.`,
        SMART: `High-quality wallet. Consistent performance, early entries, good exits.`,
        AVERAGE: `Typical active trader. Mixed results, follows trends.`,
        TOURIST: `New or inexperienced wallet. Insufficient track record.`,
        EXIT_LIQUIDITY: `⚠️ This wallet tends to sell to retail at peaks. Win rate ${input.winRate.toFixed(0)}%.`
    };
    const warning = tier === 'EXIT_LIQUIDITY'
        ? `This wallet has sold to retail investors at tops ${(rugRatio * 100).toFixed(0)}% of the time.`
        : tier === 'TOURIST'
            ? 'Limited trading history. Treat with caution.'
            : null;
    return {
        tier,
        reputationScore: penalizedScore,
        components: {
            winRateScore: Math.round(winRateScore),
            earlyEntryScore: Math.round(earlyEntryScore),
            convictionScore: Math.round(convictionScore),
            exitQualityScore: Math.round(exitQualityScore),
            totalReturnScore: Math.round(totalReturnScore),
            tenureScore: Math.round(tenureScore)
        },
        badge: BADGES[tier],
        description: DESCRIPTIONS[tier],
        warning
    };
}
/** Emoji for tier */
function reputationEmoji(tier) {
    const map = {
        LEGEND: '👑', SMART: '🧠', AVERAGE: '📊', TOURIST: '🧳', EXIT_LIQUIDITY: '🚨'
    };
    return map[tier];
}
/** Weight multiplier for smart money signals based on reputation */
function reputationWeight(tier) {
    const weights = {
        LEGEND: 2.0,
        SMART: 1.5,
        AVERAGE: 1.0,
        TOURIST: 0.5,
        EXIT_LIQUIDITY: 0.1
    };
    return weights[tier];
}
