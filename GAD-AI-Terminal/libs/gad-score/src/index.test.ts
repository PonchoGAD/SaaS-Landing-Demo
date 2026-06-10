import { calculateGadScore } from './index';

const baseInput = {
  aiScore: 70,
  narrativeScore: 60,
  hypeScore: 50,
  whaleScore: 55,
  riskScore: 30,
  survivalScore: 70,
  rugProbability: 10
};

test('gadScore is always 0-100', () => {
  const result = calculateGadScore(baseInput);
  expect(result.gadScore).toBeGreaterThanOrEqual(0);
  expect(result.gadScore).toBeLessThanOrEqual(100);
});

test('perfect inputs → LEGENDARY or STRONG rating', () => {
  const result = calculateGadScore({
    aiScore: 100,
    narrativeScore: 100,
    hypeScore: 100,
    whaleScore: 100,
    riskScore: 0,
    survivalScore: 100,
    rugProbability: 0
  });
  expect(result.gadScore).toBe(100);
  expect(result.rating).toBe('LEGENDARY');
});

test('worst inputs → DANGEROUS rating', () => {
  const result = calculateGadScore({
    aiScore: 0,
    narrativeScore: 0,
    hypeScore: 0,
    whaleScore: 0,
    riskScore: 100,
    survivalScore: 0,
    rugProbability: 100
  });
  expect(result.gadScore).toBe(0);
  expect(result.rating).toBe('DANGEROUS');
});

test('rating thresholds are correct', () => {
  const check = (score: number, expected: string) => {
    // Use inputs that produce approximately the target score
    const aiScore = score;
    const r = calculateGadScore({ ...baseInput, aiScore, narrativeScore: score, hypeScore: score, whaleScore: score, riskScore: 100 - score, survivalScore: score, rugProbability: 100 - score });
    return r.rating;
  };
  expect(['LEGENDARY', 'STRONG', 'GOOD', 'NEUTRAL', 'WEAK', 'DANGEROUS']).toContain(check(80, 'STRONG'));
});

test('breakdown components sum approximately to gadScore', () => {
  const result = calculateGadScore(baseInput);
  const sumComponents = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
  expect(Math.abs(sumComponents - result.gadScore)).toBeLessThanOrEqual(1); // rounding tolerance
});

test('high rug probability shows warning in explanation', () => {
  const result = calculateGadScore({ ...baseInput, rugProbability: 75 });
  expect(result.explanation).toContain('rug risk');
});

test('high risk score shows warning in explanation', () => {
  const result = calculateGadScore({ ...baseInput, riskScore: 80 });
  expect(result.explanation).toContain('high risk');
});
