"use strict";
// Opportunity Engine
// Finds FUTURE winners — tokens about to move, not tokens that already moved.
// Key insight: narrative + whales + volume pre-breakout + social velocity
// = early opportunity window
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOpportunityScore = calculateOpportunityScore;
exports.calculateVolumeBreakout = calculateVolumeBreakout;
exports.calculateNarrativeMomentum = calculateNarrativeMomentum;
const lifecycle_1 = require("@lib/lifecycle");
function clamp(v, lo = 0, hi = 100) {
    return Math.min(hi, Math.max(lo, v));
}
// Weights for each opportunity signal
const WEIGHTS = {
    narrativeMomentum: 0.22,
    whaleAccumulation: 0.20,
    volumeBreakout: 0.18,
    socialVelocity: 0.15,
    alphaSimilarity: 0.15,
    aiScore: 0.10,
};
function calculateOpportunityScore(input) {
    // ─── Component scores ──────────────────────────────────────────────────────
    // Narrative momentum: is this narrative in rotation right now?
    const narrativeMomentum = clamp(input.narrativeMomentum);
    // Whale accumulation: smart wallets entering quietly
    const whaleAccumulation = clamp(input.whaleAccumulation);
    // Volume breakout: volume rising faster than price (pre-pump signal)
    const volumeBreakout = clamp(input.volumeBreakoutScore);
    // Social velocity: mention acceleration (not peak, but rising)
    const socialVelocity = clamp(input.socialVelocity);
    // Alpha similarity: how much does this look like past winners?
    const alphaSimilarity = clamp(input.alphaSimilarity);
    // ─── Lifecycle bonus/penalty ───────────────────────────────────────────────
    const lcBonus = (0, lifecycle_1.lifecycleBonus)(input.lifecycleStage);
    // ─── Risk penalty ──────────────────────────────────────────────────────────
    const riskPenalty = Math.round((input.riskScore * 0.4 + input.rugProbability * 0.3) * 0.4);
    // ─── Chase penalty: already pumped = less opportunity ─────────────────────
    const chasePenalty = input.priceAlreadyUp24h > 200 ? 25 :
        input.priceAlreadyUp24h > 100 ? 15 :
            input.priceAlreadyUp24h > 50 ? 8 : 0;
    // ─── Market cap bonus: low cap = more potential ───────────────────────────
    const mcapBonus = input.marketCapUsd < 100000 ? 10 :
        input.marketCapUsd < 500000 ? 7 :
            input.marketCapUsd < 2000000 ? 4 : 0;
    // ─── Raw score calculation ─────────────────────────────────────────────────
    const rawScore = narrativeMomentum * WEIGHTS.narrativeMomentum +
        whaleAccumulation * WEIGHTS.whaleAccumulation +
        volumeBreakout * WEIGHTS.volumeBreakout +
        socialVelocity * WEIGHTS.socialVelocity +
        alphaSimilarity * WEIGHTS.alphaSimilarity +
        input.aiScore * WEIGHTS.aiScore;
    // Apply modifiers
    const adjustedScore = rawScore + lcBonus + mcapBonus - riskPenalty - chasePenalty;
    // Apply market regime multiplier
    const regimeScore = adjustedScore * input.regimeMultiplier;
    const opportunityScore = clamp(Math.round(regimeScore));
    // ─── Confidence: how many signals agree? ──────────────────────────────────
    const strongSignals = [
        narrativeMomentum > 60,
        whaleAccumulation > 60,
        volumeBreakout > 60,
        socialVelocity > 60,
        alphaSimilarity > 60,
        ['BIRTH', 'ACCUMULATION', 'BREAKOUT'].includes(input.lifecycleStage)
    ].filter(Boolean).length;
    const confidence = Math.min(1, strongSignals / 4);
    // ─── Recommendation ───────────────────────────────────────────────────────
    const recommendation = opportunityScore >= 80 && confidence >= 0.75 ? 'STRONG_BUY' :
        opportunityScore >= 65 && confidence >= 0.5 ? 'BUY' :
            opportunityScore >= 50 ? 'WATCH' :
                opportunityScore >= 30 ? 'NEUTRAL' : 'AVOID';
    // ─── Estimated upside ─────────────────────────────────────────────────────
    const estimatedUpsideX = alphaSimilarity > 70 ? Math.round(5 + (alphaSimilarity - 70) * 0.5) :
        alphaSimilarity > 50 ? 3 :
            null;
    // ─── Reason string ────────────────────────────────────────────────────────
    const reasonParts = [];
    if (narrativeMomentum > 65)
        reasonParts.push(`narrative in rotation (${narrativeMomentum})`);
    if (whaleAccumulation > 65)
        reasonParts.push(`smart whales accumulating (${whaleAccumulation})`);
    if (volumeBreakout > 65)
        reasonParts.push(`pre-breakout volume signal (${volumeBreakout})`);
    if (socialVelocity > 65)
        reasonParts.push(`social velocity rising (${socialVelocity})`);
    if (alphaSimilarity > 60)
        reasonParts.push(`${alphaSimilarity}% similar to past winners`);
    if (lcBonus > 0)
        reasonParts.push(`lifecycle: ${input.lifecycleStage} (+${lcBonus})`);
    if (riskPenalty > 10)
        reasonParts.push(`risk penalty −${riskPenalty}`);
    if (chasePenalty > 0)
        reasonParts.push(`already up ${input.priceAlreadyUp24h.toFixed(0)}% (−${chasePenalty})`);
    const reason = reasonParts.length
        ? `Opportunity ${opportunityScore}: ${reasonParts.join(', ')}.`
        : `Opportunity ${opportunityScore} — insufficient signals.`;
    return {
        opportunityScore,
        confidence,
        components: {
            narrativeMomentum,
            whaleAccumulation,
            volumeBreakout,
            socialVelocity,
            alphaSimilarity,
            lifecycleBonus: lcBonus,
            riskPenalty,
            chasePenalty
        },
        recommendation,
        reason,
        regimeAdjusted: input.regimeMultiplier !== 1.0,
        estimatedUpsideX
    };
}
/** Calculate volume breakout score: volume rising faster than price is a pre-pump signal */
function calculateVolumeBreakout(params) {
    const { volume5m, volume1h, volume24h, priceChange1h } = params;
    const hourlyAvg = volume24h / 24;
    if (hourlyAvg < 1)
        return 0;
    const volAcceleration = volume1h / hourlyAvg;
    const price5mEst = (volume5m / (volume1h || 1)) * priceChange1h;
    // Volume accelerating faster than price = pre-pump signal
    const divergence = volAcceleration - Math.max(0, priceChange1h / 20);
    return clamp(Math.round(divergence * 20));
}
/** Calculate narrative momentum: is this narrative tag trending up? */
function calculateNarrativeMomentum(params) {
    const { narrativeStrength, narrativeRotationRank, narrativeMomentumDir } = params;
    const rankScore = Math.max(0, 100 - (narrativeRotationRank - 1) * 7);
    const dirBonus = {
        RISING: 20, STABLE: 0, PEAK: -10, FALLING: -20, DEAD: -50
    };
    return clamp(narrativeStrength * 0.5 +
        rankScore * 0.3 +
        (dirBonus[narrativeMomentumDir] ?? 0) +
        (narrativeRotationRank <= 3 ? 15 : 0));
}
