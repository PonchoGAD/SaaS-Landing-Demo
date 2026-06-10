export interface SocialData {
    mentionCount1h: number;
    mentionCount24h: number;
    engagementRate: number;
    sentimentScore: number;
    followerGrowthPct: number;
    telegramMentions: number;
    pumpFunComments: number;
}
export interface HypeResult {
    hypeScore: number;
    mentionScore: number;
    sentimentScore: number;
    velocityScore: number;
    explanation: string;
}
export declare function calculateHypeScore(data: SocialData): HypeResult;
/** Build a minimal SocialData from internal metrics when external data is unavailable */
export declare function buildSocialDataFromMetrics(params: {
    volume5m: number;
    volume1h: number;
    txCount5m: number;
    txCount1h: number;
    isNewToken: boolean;
}): SocialData;
