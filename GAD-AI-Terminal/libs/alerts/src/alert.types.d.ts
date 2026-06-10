export declare enum AlertType {
    NEW_HIGH_SCORE = "NEW_HIGH_SCORE",
    HIGH_RISK = "HIGH_RISK",
    WHALE_ACTIVITY = "WHALE_ACTIVITY",
    VOLUME_SPIKE = "VOLUME_SPIKE",
    LIQUIDITY_DROP = "LIQUIDITY_DROP",
    NEW_TOKEN = "NEW_TOKEN",
    AI_SCORE_INCREASE = "AI_SCORE_INCREASE"
}
/** Snapshot of a token at a point in time — passed to rule evaluation */
export interface TokenAlertContext {
    tokenId: string;
    mintAddress: string;
    symbol?: string;
    aiScore: number;
    previousAiScore?: number;
    riskScore: number;
    whaleActivityScore?: number;
    volume5m: number;
    volume1h: number;
    volume24h: number;
    liquidityChange: number;
    isNewToken: boolean;
}
/** Fully resolved alert ready to persist */
export interface AlertInput {
    type: AlertType;
    subject: string;
    payload: Record<string, unknown>;
    score: number;
}
export interface AlertRecord {
    id: string;
    type: string;
    subject: string;
    payload: Record<string, unknown>;
    score: number;
    resolved: boolean;
    created_at: Date;
}
