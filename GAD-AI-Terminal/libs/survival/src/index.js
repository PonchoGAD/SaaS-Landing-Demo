"use strict";
// Survival Score — probability a token is still tradeable in N time periods
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSurvivalScore = calculateSurvivalScore;
// Logistic-inspired survival model
function logistic(x, midpoint = 0, steepness = 1) {
    return 1 / (1 + Math.exp(-steepness * (x - midpoint)));
}
function clamp(v, lo = 0, hi = 100) {
    return Math.min(hi, Math.max(lo, Math.round(v)));
}
function calculateSurvivalScore(input) {
    const { ageHours, liquidityUsd, volume24hUsd, holderCount, top10HolderPct, rugProbability, aiScore, priceChange1h, txCount1h } = input;
    // ─── Factor scores (each 0-1) ─────────────────────────────────────────────
    // Liquidity: $10k = 0.5, $100k = 0.9
    const liquidityFactor = logistic(Math.log10(Math.max(100, liquidityUsd)), 4, 2);
    // Volume: active trading = survival
    const volumeFactor = logistic(Math.log10(Math.max(1, volume24hUsd)), 3.5, 1.5);
    // Holder count: more holders = stickier
    const holderFactor = logistic(Math.log10(Math.max(1, holderCount)), 2, 2);
    // Concentration risk: high top10 = rug risk
    const concentrationFactor = 1 - (top10HolderPct / 100) * 0.8;
    // Rug probability: direct penaliser
    const rugFactor = 1 - rugProbability / 100;
    // AI score bonus
    const aiFactor = aiScore / 100;
    // Recent activity: positive price + tx activity
    const activityFactor = Math.min(1, (txCount1h / 100) * 0.5 + (priceChange1h > 0 ? 0.2 : 0));
    // Age factor: older tokens more likely to survive
    const ageFactor = ageHours < 0.5 ? 0.3 : ageHours < 1 ? 0.5 : ageHours < 6 ? 0.7 : 0.9;
    // ─── Time-horizon decay ───────────────────────────────────────────────────
    const base = (liquidityFactor * 0.25 +
        volumeFactor * 0.15 +
        holderFactor * 0.15 +
        concentrationFactor * 0.15 +
        rugFactor * 0.15 +
        aiFactor * 0.10 +
        activityFactor * 0.05);
    const s1h = base * (ageHours < 1 ? 0.7 : 0.95);
    const s6h = base * (ageHours < 1 ? 0.55 : ageFactor * 0.85);
    const s24h = base * ageFactor * 0.75;
    const s7d = base * ageFactor * 0.5;
    const survival1h = clamp(s1h * 100);
    const survival6h = clamp(s6h * 100);
    const survival24h = clamp(s24h * 100);
    const survival7d = clamp(s7d * 100);
    const overall = clamp((survival1h + survival6h + survival24h + survival7d) / 4);
    const explanation = overall >= 75 ? `Strong survival outlook — good liquidity ($${(liquidityUsd / 1000).toFixed(0)}k) and ${holderCount} holders.` :
        overall >= 50 ? `Moderate survival likelihood. Monitor liquidity.` :
            `Low survival probability. High rug risk (${rugProbability}%) or very low liquidity.`;
    return { survival1h, survival6h, survival24h, survival7d, overall, explanation };
}
