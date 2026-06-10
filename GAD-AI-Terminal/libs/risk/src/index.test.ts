import { calculateRiskScore, explainRiskScore } from './index';

test('calculateRiskScore returns bounded integer', () => {
  const score = calculateRiskScore({
    liquidityChange: 80,
    largeSellPressure: 70,
    holderConcentration: 50,
    whaleActivity: 60,
    volatility: 40
  });
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
  expect(Number.isInteger(score)).toBe(true);
});

test('explainRiskScore returns explanation text', () => {
  const explanation = explainRiskScore({
    liquidityChange: 80,
    largeSellPressure: 65,
    holderConcentration: 65,
    whaleActivity: 55,
    volatility: 70
  });
  expect(explanation).toContain('Liquidity dropped');
  expect(explanation).toContain('Large sell pressure');
});
