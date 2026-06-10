export declare const NARRATIVE_TAGS: readonly ["AI_AGENT", "DOG", "CAT", "PEPE", "ELON", "POLITICS", "ANIME", "MEME", "DEFI", "GAMING", "NFT", "SPORT", "FOOD", "UNKNOWN"];
export type NarrativeTag = typeof NARRATIVE_TAGS[number];
export declare const DEFAULT_NARRATIVE_STRENGTH: Record<NarrativeTag, number>;
export declare function detectNarrative(symbol: string, name: string): NarrativeTag;
export interface NarrativeInput {
    symbol: string;
    name: string;
    /** Current strength of this narrative (0-100). Pass 0 if not trending. */
    narrativeStrength?: number;
}
export interface NarrativeResult {
    tag: NarrativeTag;
    rawScore: number;
    trendBoost: number;
    narrativeScore: number;
    explanation: string;
}
export declare function calculateNarrativeScore(input: NarrativeInput): NarrativeResult;
