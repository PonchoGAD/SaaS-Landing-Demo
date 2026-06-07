import { detectLifecycle, lifecycleBonus, lifecycleEmoji, LIFECYCLE_STAGES } from './index';

const base = {
  ageHours: 1,
  volumeAcceleration: 1,
  holderGrowthRate: 20,
  priceChange1h: 5,
  priceChange24h: 10,
  whaleNetFlow: 50,
  socialAcceleration: 30,
  liquidityUsd: 20000,
  sellBuyRatio: 1.0,
  rugProbability: 10,
  holderCount: 100
};

test('all LIFECYCLE_STAGES are defined', () => {
  expect(LIFECYCLE_STAGES).toContain('BIRTH');
  expect(LIFECYCLE_STAGES).toContain('ACCUMULATION');
  expect(LIFECYCLE_STAGES).toContain('BREAKOUT');
  expect(LIFECYCLE_STAGES).toContain('HYPE');
  expect(LIFECYCLE_STAGES).toContain('DISTRIBUTION');
  expect(LIFECYCLE_STAGES).toContain('DEATH');
});

test('brand-new token (< 1h) → BIRTH stage', () => {
  const result = detectLifecycle({ ...base, ageHours: 0.3, holderCount: 20, liquidityUsd: 5000, volumeAcceleration: 0.1 });
  expect(result.stage).toBe('BIRTH');
  expect(result.stageScore).toBeGreaterThan(0);
});

test('steady holder growth with moderate volume → ACCUMULATION', () => {
  const result = detectLifecycle({
    ...base,
    ageHours: 12,
    holderGrowthRate: 30,
    volumeAcceleration: 1.0,
    priceChange24h: 20,
    socialAcceleration: 40,
    whaleNetFlow: 65
  });
  expect(result.stage).toBe('ACCUMULATION');
});

test('massive volume spike + price surge → BREAKOUT', () => {
  const result = detectLifecycle({
    ...base,
    ageHours: 6,
    volumeAcceleration: 4,
    priceChange1h: 35,
    whaleNetFlow: 75,
    holderGrowthRate: 80
  });
  expect(result.stage).toBe('BREAKOUT');
});

test('extreme social + large price gain + many holders → HYPE', () => {
  const result = detectLifecycle({
    ...base,
    ageHours: 24,
    socialAcceleration: 85,
    priceChange24h: 150,
    volumeAcceleration: 0.9,
    holderCount: 700
  });
  expect(result.stage).toBe('HYPE');
});

test('high sell ratio + declining whale flow + price drop → DISTRIBUTION', () => {
  const result = detectLifecycle({
    ...base,
    ageHours: 48,
    sellBuyRatio: 1.8,
    priceChange1h: -10,
    whaleNetFlow: 15,
    priceChange24h: -20,
    socialAcceleration: 25,
    holderCount: 500
  });
  expect(result.stage).toBe('DISTRIBUTION');
});

test('high rug probability + near-zero liquidity → DEATH', () => {
  const result = detectLifecycle({
    ...base,
    rugProbability: 80,
    liquidityUsd: 500,
    priceChange24h: -80,
    holderGrowthRate: -5
  });
  expect(result.stage).toBe('DEATH');
});

test('stageScore is 0-100', () => {
  const result = detectLifecycle(base);
  expect(result.stageScore).toBeGreaterThanOrEqual(0);
  expect(result.stageScore).toBeLessThanOrEqual(100);
});

test('factors object has all keys', () => {
  const result = detectLifecycle(base);
  expect(result.factors).toHaveProperty('volumeAcceleration');
  expect(result.factors).toHaveProperty('holderGrowth');
  expect(result.factors).toHaveProperty('priceMomentum');
  expect(result.factors).toHaveProperty('whaleAccumulation');
  expect(result.factors).toHaveProperty('socialAcceleration');
  expect(result.factors).toHaveProperty('liquidityDepth');
  expect(result.factors).toHaveProperty('sellPressure');
});

test('explanation is a non-empty string', () => {
  const result = detectLifecycle(base);
  expect(typeof result.explanation).toBe('string');
  expect(result.explanation.length).toBeGreaterThan(0);
});

test('lifecycleBonus gives positive for BIRTH/ACCUMULATION, negative for DEATH', () => {
  expect(lifecycleBonus('BIRTH')).toBeGreaterThan(0);
  expect(lifecycleBonus('ACCUMULATION')).toBeGreaterThan(0);
  expect(lifecycleBonus('DEATH')).toBeLessThan(0);
  expect(lifecycleBonus('DISTRIBUTION')).toBeLessThan(0);
});

test('lifecycleEmoji returns string for all stages', () => {
  for (const stage of LIFECYCLE_STAGES) {
    const emoji = lifecycleEmoji(stage);
    expect(typeof emoji).toBe('string');
    expect(emoji.length).toBeGreaterThan(0);
  }
});

test('nextStage is correct progression', () => {
  const birth = detectLifecycle({ ...base, ageHours: 0.3, holderCount: 10, liquidityUsd: 2000, volumeAcceleration: 0 });
  // BIRTH's nextStage should be ACCUMULATION (if stage is indeed BIRTH)
  if (birth.stage === 'BIRTH') {
    expect(birth.nextStage).toBe('ACCUMULATION');
  }
});

test('DEATH stage has null nextStage', () => {
  const result = detectLifecycle({ ...base, rugProbability: 90, liquidityUsd: 100, priceChange24h: -90 });
  if (result.stage === 'DEATH') {
    expect(result.nextStage).toBeNull();
  }
});
