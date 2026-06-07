import { calculateAlphaSimilarity, buildTokenSnapshot, labelOutcome, cosineSimilarity } from './index';

const baseSnap = {
  aiScore: 75,
  riskScore: 25,
  rugProbability: 10,
  narrativeTag: 'AI_AGENT',
  hypeScore: 65,
  whaleScore: 70,
  holderCount: 500,
  liquidityUsd: 80000,
  volume24hUsd: 500000,
  ageHours: 12,
  lifecycleStage: 'ACCUMULATION'
};

const winner10x = { ...baseSnap, outcome: 'WINNER_10X' as const, peakGainX: 15 };
const winner50x = { ...baseSnap, outcome: 'WINNER_50X' as const, peakGainX: 60 };
const rugRecord = { ...baseSnap, aiScore: 20, riskScore: 80, rugProbability: 85, outcome: 'RUG' as const, peakGainX: 0 };

test('no history → similarityScore = 0', () => {
  const result = calculateAlphaSimilarity(buildTokenSnapshot(baseSnap), []);
  expect(result.similarityScore).toBe(0);
  expect(result.matchedWinners).toBe(0);
  expect(result.avgWinnerGainX).toBe(0);
});

test('identical token matches winners', () => {
  const history = [winner10x, winner50x];
  const result  = calculateAlphaSimilarity(buildTokenSnapshot(baseSnap), history);
  expect(result.matchedWinners).toBeGreaterThan(0);
  expect(result.similarityScore).toBeGreaterThan(0);
  expect(result.avgWinnerGainX).toBeGreaterThan(0);
});

test('very different token scores low similarity', () => {
  const different = buildTokenSnapshot({
    aiScore: 5, riskScore: 95, rugProbability: 90, narrativeTag: 'UNKNOWN',
    hypeScore: 5, whaleScore: 5, holderCount: 5, liquidityUsd: 100,
    volume24hUsd: 100, ageHours: 200, lifecycleStage: 'DEATH'
  });
  const result = calculateAlphaSimilarity(different, [winner10x, winner50x]);
  expect(result.matchedWinners).toBe(0);
  expect(result.similarityScore).toBe(0);
});

test('similar-to-rug token has non-zero rugSimilarity', () => {
  const rugLike = buildTokenSnapshot({ ...baseSnap, aiScore: 15, riskScore: 85, rugProbability: 90 });
  const result  = calculateAlphaSimilarity(rugLike, [rugRecord]);
  expect(result.rugSimilarity).toBeGreaterThan(0);
});

test('similarityScore and rugSimilarity are 0-100', () => {
  const result = calculateAlphaSimilarity(buildTokenSnapshot(baseSnap), [winner10x, winner50x, rugRecord]);
  expect(result.similarityScore).toBeGreaterThanOrEqual(0);
  expect(result.similarityScore).toBeLessThanOrEqual(100);
  expect(result.rugSimilarity).toBeGreaterThanOrEqual(0);
  expect(result.rugSimilarity).toBeLessThanOrEqual(100);
});

test('explanation is a non-empty string', () => {
  const result = calculateAlphaSimilarity(buildTokenSnapshot(baseSnap), [winner10x]);
  expect(typeof result.explanation).toBe('string');
  expect(result.explanation.length).toBeGreaterThan(0);
});

test('buildTokenSnapshot returns all fields', () => {
  const snap = buildTokenSnapshot(baseSnap);
  expect(snap.aiScore).toBe(75);
  expect(snap.narrativeTag).toBe('AI_AGENT');
  expect(snap.lifecycleStage).toBe('ACCUMULATION');
});

// ─── labelOutcome ─────────────────────────────────────────────────────────────

test('labelOutcome: ≤0 → DEAD', () => {
  expect(labelOutcome(0)).toBe('DEAD');
  expect(labelOutcome(-1)).toBe('DEAD');
});

test('labelOutcome: < 10 → NEUTRAL', () => {
  expect(labelOutcome(5)).toBe('NEUTRAL');
});

test('labelOutcome: 10-49 → WINNER_10X', () => {
  expect(labelOutcome(15)).toBe('WINNER_10X');
});

test('labelOutcome: 50-99 → WINNER_50X', () => {
  expect(labelOutcome(75)).toBe('WINNER_50X');
});

test('labelOutcome: ≥100 → WINNER_100X', () => {
  expect(labelOutcome(100)).toBe('WINNER_100X');
  expect(labelOutcome(500)).toBe('WINNER_100X');
});

// ─── cosineSimilarity ─────────────────────────────────────────────────────────

test('identical vectors → cosine similarity = 1', () => {
  const v = [0.5, 0.7, 0.3, 0.8];
  expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
});

test('orthogonal vectors → cosine similarity = 0', () => {
  expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
});

test('zero vectors → cosine similarity = 0', () => {
  expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
});
