/**
 * Content Analyzer
 * Detects Solana token addresses (base58, 32-44 chars) and estimates sentiment.
 */

// Solana address: base58, 32-44 characters
const SOLANA_MINT_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// Positive / negative keyword sets for simple sentiment scoring
const POSITIVE_WORDS = new Set([
  'bullish', 'moon', 'pump', 'gem', 'alpha', 'buy', 'accumulate',
  'breakout', 'launch', 'new', 'early', 'based', 'lfg', 'wagmi',
  'potential', 'strong', 'degen', 'ape', 'win', 'profit', 'gain'
]);
const NEGATIVE_WORDS = new Set([
  'rug', 'scam', 'dump', 'avoid', 'rekt', 'exit', 'ngmi', 'careful',
  'sell', 'bearish', 'dead', 'fake', 'honeypot', 'jeet', 'paper'
]);

/** Extract all Solana mint addresses from a text string. */
export function extractMintAddresses(text: string): string[] {
  const matches = text.match(SOLANA_MINT_RE) ?? [];
  // Filter out obvious non-addresses (too many repeated chars, common words)
  return [...new Set(matches)].filter(m => !/^(.)\1{10,}$/.test(m));
}

/** Simple sentiment score 0 (very negative) to 1 (very positive). */
export function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0;
  let neg = 0;
  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) pos++;
    if (NEGATIVE_WORDS.has(word)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return 0.5;
  return Math.round((pos / total) * 100) / 100;
}

/** Rough engagement score: likes + retweets * 3 + replies * 2 */
export function calcEngagement(likes = 0, retweets = 0, replies = 0): number {
  return likes + retweets * 3 + replies * 2;
}
