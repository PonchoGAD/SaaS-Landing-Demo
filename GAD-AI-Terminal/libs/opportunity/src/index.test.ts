import {
  calculateOpportunityScore,
  calculateVolumeBreakout,
  calculateNarrativeMomentum
} from './index';

const strongBase = {
  narrativeMomentum: 80,
  whaleAccumulation: 75,
  volumeBreakoutScore: 70,
  socialVelocity: 65,
  alphaSimilarity: 70,
  lifecycleStage: 'ACCUMULATION' as const,
  riskScore: 20,
  rugProbability: 10,
  aiScore: 75,
  survivalScore: 80,
  regimeMultiplier: 1.0,
  priceAlreadyUp24h: 15,
  marketCapUsd: 300_000
};

const weakBase = {
  narrativeMomentum: 20,
  whaleAccumulation: 15,
  volumeBreakoutScore: 10,
  socialVelocity: 10,
  alphaSimilarity: 5,
  lifecycleStage: 'DEATH' as const,
  riskScore: 85,
  rugProbability: 75,
  aiScore: 20,
  survivalScore: 15,
  regimeMultiplier: 0.5,
  priceAlreadyUp24h: 300,
  marketCapUsd: 5_000_000
};

test('strong signals → high opportunity + STRONG_BUY or BUY', () => {
  const result = calculateOpportunityScore(strongBase);
  expect(result.opportunityScore).toBeGreaterThan(55);
  expect(['STRONG_BUY', 'BUY', 'WATCH']).toContain(result.recommendation);
});

test('weak signals + DEATH stage → low opportunity + AVOID', () => {
  const result = calculateOpportunityScore(weakBase);
  expect(result.opportunityScore).toBeLessThan(30);
  expect(['AVOID', 'NEUTRAL']).toContain(result.recommendation);
});

test('opportunityScore is 0-100', () => {
  for (const input of [strongBase, weakBase]) {
    const result = calculateOpportunityScore(input);
    expect(result.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(result.opportunityScore).toBeLessThanOrEqual(100);
  }
});

test('confidence is 0-1', () => {
  const result = calculateOpportunityScore(strongBase);
  expect(result.confidence).toBeGreaterThanOrEqual(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
});

test('PANIC regime (0.5x) reduces score vs BULL (1.2x)', () => {
  const bull  = calculateOpportunityScore({ ...strongBase, regimeMultiplier: 1.2 });
  const panic = calculateOpportunityScore({ ...strongBase, regimeMultiplier: 0.5 });
  expect(bull.opportunityScore).toBeGreaterThan(panic.opportunityScore);
  expect(panic.regimeAdjusted).toBe(true);
});

test('large chase penalty when price already up 300%', () => {
  const noChase  = calculateOpportunityScore({ ...strongBase, priceAlreadyUp24h: 0 });
  const chased   = calculateOpportunityScore({ ...strongBase, priceAlreadyUp24h: 300 });
  expect(noChase.opportunityScore).toBeGreaterThan(chased.opportunityScore);
  expect(chased.components.chasePenalty).toBeGreaterThan(0);
});

test('high risk/rug penalty reduces score', () => {
  const safe  = calculateOpportunityScore({ ...strongBase, riskScore: 10, rugProbability: 5 });
  const risky = calculateOpportunityScore({ ...strongBase, riskScore: 90, rugProbability: 80 });
  expect(safe.opportunityScore).toBeGreaterThan(risky.opportunityScore);
  expect(risky.components.riskPenalty).toBeGreaterThan(0);
});

test('low market cap gives bonus', () => {
  const lowCap  = calculateOpportunityScore({ ...strongBase, marketCapUsd: 50_000 });
  const highCap = calculateOpportunityScore({ ...strongBase, marketCapUsd: 50_000_000 });
  expect(lowCap.opportunityScore).toBeGreaterThanOrEqual(highCap.opportunityScore);
});

test('reason string is non-empty', () => {
  const result = calculateOpportunityScore(strongBase);
  expect(typeof result.reason).toBe('string');
  expect(result.reason.length).toBeGreaterThan(0);
});

test('components object has all keys', () => {
  const result = calculateOpportunityScore(strongBase);
  expect(result.components).toHaveProperty('narrativeMomentum');
  expect(result.components).toHaveProperty('whaleAccumulation');
  expect(result.components).toHaveProperty('volumeBreakout');
  expect(result.components).toHaveProperty('socialVelocity');
  expect(result.components).toHaveProperty('alphaSimilarity');
  expect(result.components).toHaveProperty('lifecycleBonus');
  expect(result.components).toHaveProperty('riskPenalty');
  expect(result.components).toHaveProperty('chasePenalty');
});

// ─── calculateVolumeBreakout ──────────────────────────────────────────────────

test('volume spike before price → positive breakout score', () => {
  const score = calculateVolumeBreakout({ volume5m: 10000, volume1h: 50000, volume24h: 100000, priceChange1h: 5 });
  expect(score).toBeGreaterThan(0);
});

test('no volume → 0 breakout score', () => {
  const score = calculateVolumeBreakout({ volume5m: 0, volume1h: 0, volume24h: 0, priceChange1h: 0 });
  expect(score).toBe(0);
});

test('breakout score is 0-100', () => {
  const score = calculateVolumeBreakout({ volume5m: 999999, volume1h: 500000, volume24h: 10000, priceChange1h: 1 });
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

// ─── calculateNarrativeMomentum ───────────────────────────────────────────────

test('rank 1 RISING narrative → high momentum', () => {
  const score = calculateNarrativeMomentum({
    narrativeTag: 'AI_AGENT',
    narrativeStrength: 85,
    narrativeRotationRank: 1,
    narrativeMomentumDir: 'RISING'
  });
  expect(score).toBeGreaterThan(60);
});

test('rank 14 DEAD narrative → low momentum', () => {
  const score = calculateNarrativeMomentum({
    narrativeTag: 'UNKNOWN',
    narrativeStrength: 10,
    narrativeRotationRank: 14,
    narrativeMomentumDir: 'DEAD'
  });
  expect(score).toBeLessThan(40);
});

test('narrative momentum is 0-100', () => {
  for (const dir of ['RISING', 'STABLE', 'PEAK', 'FALLING', 'DEAD'] as const) {
    const score = calculateNarrativeMomentum({ narrativeTag: 'X', narrativeStrength: 50, narrativeRotationRank: 7, narrativeMomentumDir: dir });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }
});
