import { calculateAiScore, buildFactorReport, normalizeScore } from './index';

test('normalizeScore clamps values to 0-100', () => {
  expect(normalizeScore(120)).toBe(100);
  expect(normalizeScore(-10)).toBe(0);
  expect(normalizeScore(55.7)).toBe(56);
});

test('calculateAiScore combines factors and returns 0-100', () => {
  const score = calculateAiScore({
    growth: 80,
    liquidity: 70,
    volume: 65,
    holders: 50,
    momentum: 60,
    risk: 40
  });
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

test('buildFactorReport returns all factor scores including aiScore', () => {
  const report = buildFactorReport({
    growth: 80,
    liquidity: 70,
    volume: 65,
    holders: 50,
    momentum: 60,
    risk: 40
  });
  expect(report.aiScore).toBeDefined();
  expect(report.growth).toBe(80);
  expect(report.risk).toBe(40);
});
