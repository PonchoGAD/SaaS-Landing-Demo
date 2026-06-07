"use strict";
// Alpha Memory Engine
// Compares a new token to historical winners and losers.
// "This token is 82% similar to 5 tokens that gave 50x+"
//
// Uses feature-vector cosine similarity on normalized token snapshots.
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAlphaSimilarity = calculateAlphaSimilarity;
exports.buildTokenSnapshot = buildTokenSnapshot;
exports.labelOutcome = labelOutcome;
exports.cosineSimilarity = cosineSimilarity;
// Normalize a value to 0-1 range given expected max
function norm(value, max) {
    return Math.min(1, Math.max(0, value / max));
}
// Build feature vector from snapshot (all values 0-1)
function buildFeatureVector(snap) {
    return [
        norm(snap.aiScore, 100),
        norm(100 - snap.riskScore, 100), // inverted: low risk = good
        norm(100 - snap.rugProbability, 100), // inverted
        norm(snap.hypeScore, 100),
        norm(snap.whaleScore, 100),
        norm(Math.log10(Math.max(1, snap.holderCount)), 4), // log10(10000) = 4
        norm(Math.log10(Math.max(100, snap.liquidityUsd)), 6), // log10(1M) = 6
        norm(Math.log10(Math.max(1, snap.volume24hUsd)), 7), // log10(10M) = 7
        norm(Math.min(snap.ageHours, 168), 168), // cap at 7 days
    ];
}
// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
// Narrative tag bonus: same narrative = extra similarity boost
function narrativeBonus(tagA, tagB) {
    return tagA === tagB ? 0.1 : 0;
}
// Lifecycle stage bonus
function lifecycleBonus(stageA, stageB) {
    return stageA === stageB ? 0.05 : 0;
}
const SIMILARITY_THRESHOLD = 0.65; // minimum cosine to count as "match"
function calculateAlphaSimilarity(current, history) {
    if (!history.length) {
        return {
            similarityScore: 0,
            matchedWinners: 0,
            avgWinnerGainX: 0,
            topMatchOutcome: null,
            rugSimilarity: 0,
            explanation: 'No historical data available yet. Similarity will improve over time.'
        };
    }
    const currentVec = buildFeatureVector(current);
    const WINNER_OUTCOMES = new Set(['WINNER_10X', 'WINNER_50X', 'WINNER_100X']);
    const RUG_OUTCOMES = new Set(['RUG']);
    let winnerMatches = [];
    let rugMatches = [];
    for (const record of history) {
        const recordVec = buildFeatureVector(record);
        const baseSim = cosineSimilarity(currentVec, recordVec);
        const bonus = narrativeBonus(current.narrativeTag, record.narrativeTag) +
            lifecycleBonus(current.lifecycleStage, record.lifecycleStage);
        const totalSim = Math.min(1, baseSim + bonus);
        if (totalSim >= SIMILARITY_THRESHOLD) {
            if (WINNER_OUTCOMES.has(record.outcome)) {
                winnerMatches.push({ sim: totalSim, gainX: record.peakGainX, outcome: record.outcome });
            }
            if (RUG_OUTCOMES.has(record.outcome)) {
                rugMatches.push({ sim: totalSim });
            }
        }
    }
    // Sort matches by similarity desc
    winnerMatches.sort((a, b) => b.sim - a.sim);
    rugMatches.sort((a, b) => b.sim - a.sim);
    const matchedWinners = winnerMatches.length;
    const avgWinnerGainX = matchedWinners > 0
        ? winnerMatches.reduce((s, m) => s + m.gainX, 0) / matchedWinners
        : 0;
    // Avg similarity to winners (weighted)
    const avgWinnerSim = matchedWinners > 0
        ? winnerMatches.slice(0, 5).reduce((s, m) => s + m.sim, 0) / Math.min(5, matchedWinners)
        : 0;
    const avgRugSim = rugMatches.length > 0
        ? rugMatches.slice(0, 3).reduce((s, m) => s + m.sim, 0) / Math.min(3, rugMatches.length)
        : 0;
    // Final scores
    const similarityScore = Math.round(avgWinnerSim * 100);
    const rugSimilarity = Math.round(avgRugSim * 100);
    // Top outcome
    const outcomeCounts = {};
    for (const m of winnerMatches) {
        outcomeCounts[m.outcome] = (outcomeCounts[m.outcome] ?? 0) + 1;
    }
    const topMatchOutcome = Object.keys(outcomeCounts).length
        ? Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;
    // Explanation
    let explanation;
    if (matchedWinners >= 3 && avgWinnerGainX > 10) {
        explanation = `ALPHA SIGNAL: This token is ${similarityScore}% similar to ${matchedWinners} past winners (avg ${avgWinnerGainX.toFixed(0)}x peak gain). Narrative: ${current.narrativeTag}.`;
    }
    else if (matchedWinners > 0) {
        explanation = `Partial match: ${matchedWinners} historical winner(s) with avg ${avgWinnerGainX.toFixed(0)}x. Similarity ${similarityScore}%.`;
    }
    else if (rugSimilarity > 70) {
        explanation = `WARNING: ${rugSimilarity}% similar to past rug tokens. Pattern recognition flags high risk.`;
    }
    else {
        explanation = `No strong historical match found. Similarity score ${similarityScore}%. Insufficient history or novel pattern.`;
    }
    return {
        similarityScore,
        matchedWinners,
        avgWinnerGainX: Math.round(avgWinnerGainX * 10) / 10,
        topMatchOutcome,
        rugSimilarity,
        explanation
    };
}
/** Record a token's current state for future ML comparison */
function buildTokenSnapshot(params) {
    return { ...params };
}
/** Determine outcome label given peak gain */
function labelOutcome(peakGainX) {
    if (peakGainX <= 0)
        return 'DEAD';
    if (peakGainX < 2)
        return 'NEUTRAL';
    if (peakGainX < 10)
        return 'NEUTRAL';
    if (peakGainX < 50)
        return 'WINNER_10X';
    if (peakGainX < 100)
        return 'WINNER_50X';
    return 'WINNER_100X';
}
