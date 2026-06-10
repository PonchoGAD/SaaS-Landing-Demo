"use strict";
// Social Intelligence Engine — Hype Score
// External data (X, Telegram, GMGN) is fed via API; this lib scores it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHypeScore = calculateHypeScore;
exports.buildSocialDataFromMetrics = buildSocialDataFromMetrics;
function calculateHypeScore(data) {
    // Mention velocity (mentions per hour trending up)
    const hourlyRate = data.mentionCount1h;
    const dailyAvg = data.mentionCount24h / 24;
    const velocityRatio = dailyAvg > 0 ? hourlyRate / dailyAvg : 1;
    // Velocity score: 1x = 50, 3x = 75, 5x+ = 100
    const velocityScore = Math.min(100, Math.round(velocityRatio >= 5 ? 100 :
        velocityRatio >= 3 ? 75 + (velocityRatio - 3) * 12.5 :
            velocityRatio >= 1 ? 50 + (velocityRatio - 1) * 12.5 :
                velocityRatio * 50));
    // Mention volume score (log scale, cap at 10k/h = 100)
    const mentionScore = Math.min(100, Math.round(Math.log10(Math.max(1, hourlyRate)) / Math.log10(10000) * 100));
    // Sentiment: 0.5 neutral = 50, 1.0 bullish = 100, 0 bearish = 0
    const sentimentPoints = Math.round(data.sentimentScore * 100);
    // Community (Telegram + pump.fun comments) bonus
    const communityBonus = Math.min(20, Math.round(Math.log10(Math.max(1, data.telegramMentions + data.pumpFunComments)) * 5));
    // Follower growth bonus
    const growthBonus = Math.min(10, Math.round(data.followerGrowthPct * 0.5));
    const hypeScore = Math.min(100, Math.max(0, Math.round(velocityScore * 0.35 +
        mentionScore * 0.25 +
        sentimentPoints * 0.25 +
        communityBonus +
        growthBonus)));
    const explanation = hypeScore >= 80 ? `Viral hype detected (velocity ${velocityRatio.toFixed(1)}x, ${data.mentionCount1h} mentions/h).` :
        hypeScore >= 50 ? `Moderate social activity. ${data.mentionCount1h} mentions/h.` :
            'Low social signal.';
    return { hypeScore, mentionScore, sentimentScore: sentimentPoints, velocityScore, explanation };
}
/** Build a minimal SocialData from internal metrics when external data is unavailable */
function buildSocialDataFromMetrics(params) {
    const { volume5m, volume1h, txCount5m, txCount1h, isNewToken } = params;
    // Use volume/tx activity as proxy for social activity
    const activityRatio = volume1h > 0 ? (volume5m * 12) / volume1h : 1;
    const mentionsEst = Math.round(txCount1h * 0.3); // rough proxy
    return {
        mentionCount1h: Math.round(mentionsEst * Math.min(activityRatio, 5)),
        mentionCount24h: mentionsEst * 24,
        engagementRate: Math.min(1, activityRatio * 0.1),
        sentimentScore: 0.5 + Math.min(0.3, (activityRatio - 1) * 0.05),
        followerGrowthPct: isNewToken ? 15 : 2,
        telegramMentions: Math.round(txCount5m * 0.5),
        pumpFunComments: Math.round(txCount5m * 0.2)
    };
}
