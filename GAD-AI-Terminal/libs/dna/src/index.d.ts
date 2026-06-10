export declare const DNA_TYPES: readonly ["SNIPER", "WHALE", "INSIDER", "HOLDER", "SCALPER", "SWING", "DEGENERATE", "UNKNOWN"];
export type DnaType = typeof DNA_TYPES[number];
export interface WalletActivity {
    totalTrades: number;
    avgHoldMinutes: number;
    avgPositionUsd: number;
    winRate: number;
    earlyBuyRatio: number;
    insiderSignals: number;
    sniperTradeCount: number;
    roi: number;
}
export interface DnaResult {
    dnaType: DnaType;
    scores: Record<DnaType, number>;
    confidence: number;
    explanation: string;
}
export declare function classifyWalletDna(a: WalletActivity): DnaResult;
/** Aggregate DNA breakdown for a token's buyer list */
export declare function aggregateTokenDna(buyerDna: DnaType[]): Array<{
    dnaType: DnaType;
    count: number;
    pct: number;
}>;
