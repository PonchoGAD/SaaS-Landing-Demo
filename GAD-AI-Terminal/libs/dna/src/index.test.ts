import { classifyWalletDna, aggregateTokenDna } from './index';

test('wallet with < 3 trades returns UNKNOWN', () => {
  const result = classifyWalletDna({
    totalTrades: 2,
    avgHoldMinutes: 30,
    avgPositionUsd: 500,
    winRate: 50,
    earlyBuyRatio: 0.2,
    insiderSignals: 0,
    sniperTradeCount: 0,
    roi: 10
  });
  expect(result.dnaType).toBe('UNKNOWN');
  expect(result.confidence).toBe(0);
});

test('high early-buy ratio and short hold → SNIPER', () => {
  const result = classifyWalletDna({
    totalTrades: 50,
    avgHoldMinutes: 5,
    avgPositionUsd: 2000,
    winRate: 60,
    earlyBuyRatio: 0.9,
    insiderSignals: 0,
    sniperTradeCount: 40,
    roi: 30
  });
  expect(result.dnaType).toBe('SNIPER');
  expect(result.scores.SNIPER).toBeGreaterThan(50);
});

test('large position size → high WHALE score', () => {
  const result = classifyWalletDna({
    totalTrades: 10,
    avgHoldMinutes: 2880,
    avgPositionUsd: 100000,
    winRate: 65,
    earlyBuyRatio: 0.1,
    insiderSignals: 0,
    sniperTradeCount: 0,
    roi: 50
  });
  expect(result.scores.WHALE).toBeGreaterThan(70);
});

test('many insider signals → high INSIDER score', () => {
  const result = classifyWalletDna({
    totalTrades: 20,
    avgHoldMinutes: 30,
    avgPositionUsd: 5000,
    winRate: 80,
    earlyBuyRatio: 0.5,
    insiderSignals: 15,
    sniperTradeCount: 5,
    roi: 200
  });
  expect(result.scores.INSIDER).toBeGreaterThan(50);
});

test('all score values are 0-100', () => {
  const result = classifyWalletDna({
    totalTrades: 30,
    avgHoldMinutes: 60,
    avgPositionUsd: 1000,
    winRate: 55,
    earlyBuyRatio: 0.3,
    insiderSignals: 2,
    sniperTradeCount: 5,
    roi: 20
  });
  for (const score of Object.values(result.scores)) {
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  }
});

test('aggregateTokenDna counts and percentages are correct', () => {
  const buyerDna = ['SNIPER', 'SNIPER', 'WHALE', 'HOLDER'] as any[];
  const result = aggregateTokenDna(buyerDna);
  const sniper = result.find(r => r.dnaType === 'SNIPER');
  expect(sniper?.count).toBe(2);
  expect(sniper?.pct).toBe(50);
  const total = result.reduce((s, r) => s + r.count, 0);
  expect(total).toBe(4);
});
