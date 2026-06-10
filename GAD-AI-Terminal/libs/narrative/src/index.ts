// ─── Narrative tags ───────────────────────────────────────────────────────────
export const NARRATIVE_TAGS = [
  'AI_AGENT', 'DOG', 'CAT', 'PEPE', 'ELON', 'POLITICS',
  'ANIME', 'MEME', 'DEFI', 'GAMING', 'NFT', 'SPORT', 'FOOD', 'UNKNOWN'
] as const;

export type NarrativeTag = typeof NARRATIVE_TAGS[number];

// Keyword → tag mapping (order matters: first match wins)
const KEYWORD_MAP: Array<{ tag: NarrativeTag; patterns: RegExp }> = [
  { tag: 'AI_AGENT',  patterns: /\b(ai|gpt|llm|agent|neural|robot|bot|ml|deepseek|claude|gemini)\b/i },
  { tag: 'DOG',       patterns: /\b(dog|doge|shiba|inu|woof|puppy|hound|wif)\b/i },
  { tag: 'CAT',       patterns: /\b(cat|kitty|kitten|neko|meow|puss)\b/i },
  { tag: 'PEPE',      patterns: /\b(pepe|frog|rare|wojak|chad)\b/i },
  { tag: 'ELON',      patterns: /\b(elon|musk|tesla|grok|xai|spacex|doge)\b/i },
  { tag: 'POLITICS',  patterns: /\b(trump|biden|maga|vote|election|congress|senate|freedom|liberty|usa|america)\b/i },
  { tag: 'ANIME',     patterns: /\b(anime|manga|naruto|goku|pikachu|otaku|waifu|senpai)\b/i },
  { tag: 'GAMING',    patterns: /\b(game|gaming|pixel|quest|rpg|nft|metaverse|play)\b/i },
  { tag: 'DEFI',      patterns: /\b(defi|yield|swap|lp|pool|farm|vault|stake)\b/i },
  { tag: 'NFT',       patterns: /\b(nft|art|rare|collection|mint|genesis)\b/i },
  { tag: 'SPORT',     patterns: /\b(sport|ball|goal|championship|nba|nfl|soccer|football|crypto)\b/i },
  { tag: 'FOOD',      patterns: /\b(food|pizza|burger|taco|noodle|ramen|sushi|cake)\b/i },
  { tag: 'MEME',      patterns: /\b(meme|moon|pump|based|gg|lol|yolo|wagmi)\b/i },
];

// Default narrative strength (0-100) per tag when trending
export const DEFAULT_NARRATIVE_STRENGTH: Record<NarrativeTag, number> = {
  AI_AGENT: 85, PEPE: 75, DOG: 70, ELON: 65, POLITICS: 60,
  CAT: 55, ANIME: 50, GAMING: 50, DEFI: 45, NFT: 40,
  MEME: 65, SPORT: 35, FOOD: 30, UNKNOWN: 0
};

// ─── Token Narrative Detection ────────────────────────────────────────────────

export function detectNarrative(symbol: string, name: string): NarrativeTag {
  const text = `${symbol} ${name}`.toLowerCase();
  for (const { tag, patterns } of KEYWORD_MAP) {
    if (patterns.test(text)) return tag;
  }
  return 'UNKNOWN';
}

// ─── Narrative Score (0-100) ──────────────────────────────────────────────────

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

export function calculateNarrativeScore(input: NarrativeInput): NarrativeResult {
  const tag = detectNarrative(input.symbol, input.name);
  const strength = input.narrativeStrength ?? DEFAULT_NARRATIVE_STRENGTH[tag] ?? 0;

  // Base score: how prominent is this narrative overall
  const baseScore = DEFAULT_NARRATIVE_STRENGTH[tag] ?? 0;

  // Trend boost: if the narrative is currently trending, multiply up
  const trendBoost = Math.round(strength * 0.3); // up to 30 bonus pts

  const rawScore = Math.round(baseScore * 0.7); // 70% from base
  const narrativeScore = Math.min(100, rawScore + trendBoost);

  const explanation = tag === 'UNKNOWN'
    ? 'No recognized narrative detected.'
    : `Narrative: ${tag} (strength ${strength}/100). ${strength > 70 ? 'Trending narrative — strong bonus.' : 'Active narrative.'}`;

  return { tag, rawScore, trendBoost, narrativeScore, explanation };
}
