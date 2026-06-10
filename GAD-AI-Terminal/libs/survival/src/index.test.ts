import { calculateSurvivalScore } from './index';

const healthyToken = {
  ageHours: 24,
  liquidityUsd: 100000,
  volume24hUsd: 500000,
  holderCount: 1000,
  top10HolderPct: 30,
  rugProbability: 5,
  aiScore: 75,
  priceChange1h: 5,
  txCount1h: 200
};

test('healthy token has high survival probabilities', () => {
  const result = calculateSurvivalScore(healthyToken);
  expect(result.survival1h).toBeGreaterThan(50);
  expect(result.survival24h).toBeGreaterThan(40);
  expect(result.overall).toBeGreaterThan(50);
});

test('all survival values are 0-100', () => {
  const result = calculateSurvivalScore(healthyToken);
  for (const key of ['survival1h', 'survival6h', 'survival24h', 'survival7d', 'overall'] as const) {
    expect(result[key]).toBeGreaterThanOrEqual(0);
    expect(result[key]).toBeLessThanOrEqual(100);
  }
});

test('longer time horizons have lower survival than shorter', () => {
  const result = calculateSurvivalScore(healthyToken);
  expect(result.survival1h).toBeGreaterThanOrEqual(result.survival6h);
  expect(result.survival6h).toBeGreaterThanOrEqual(result.survival7d);
});

test('rug-prone token has low survival', () => {
  const result = calculateSurvivalScore({
    ...healthyToken,
    rugProbability: 90,
    liquidityUsd: 500,
    holderCount: 10,
    top10HolderPct: 95
  });
  expect(result.overall).toBeLessThan(40);
});

test('brand new token (<30min) penalised vs old token', () => {
  const newToken = calculateSurvivalScore({ ...healthyToken, ageHours: 0.3 });
  const oldToken = calculateSurvivalScore({ ...healthyToken, ageHours: 72 });
  expect(newToken.survival7d).toBeLessThan(oldToken.survival7d);
});

test('explanation is a non-empty string', () => {
  const result = calculateSurvivalScore(healthyToken);
  expect(typeof result.explanation).toBe('string');
  expect(result.explanation.length).toBeGreaterThan(0);
});
