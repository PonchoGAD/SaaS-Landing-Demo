export declare const REGIMES: readonly ["BULL", "BEAR", "SIDEWAYS", "EUPHORIA", "PANIC"];
export type MarketRegime = typeof REGIMES[number];
export interface RegimeInput {
    solPriceChange7d: number;
    solPriceChange24h: number;
    btcPriceChange7d: number;
    totalMarketVolume24h: number;
    avgVolume7d: number;
    fearGreedIndex: number;
    newTokensPerHour: number;
    rugRatePercent: number;
    avgGadScore: number;
}
export interface RegimeResult {
    regime: MarketRegime;
    confidence: number;
    multiplier: number;
    description: string;
    signals: {
        momentum: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
        volume: 'EXPANDING' | 'STABLE' | 'CONTRACTING';
        sentiment: 'GREEDY' | 'NEUTRAL' | 'FEARFUL';
        rugRate: 'EXTREME' | 'HIGH' | 'NORMAL' | 'LOW';
    };
    actionGuide: string;
}
export declare function detectMarketRegime(input: RegimeInput): RegimeResult;
/** Get regime from stored DB row */
export declare function regimeFromDb(row: {
    regime: string;
    confidence: number;
}): {
    regime: MarketRegime;
    multiplier: number;
};
export declare function regimeEmoji(regime: MarketRegime): string;
