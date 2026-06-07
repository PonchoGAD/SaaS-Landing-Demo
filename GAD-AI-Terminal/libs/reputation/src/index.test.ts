import { classifyReputation, reputationEmoji, reputationWeight, REPUTATION_TIERS } from './index';

const legendInput = {
  winRate: 75,
  totalReturn: 800,
  verifiedWins: 8,
  verifiedRugs: 1,
  avgHoldHours: 72,
  earlyEntryRate: 0.8,
  exitQuality: 85,
  avgConvictionX: 7,
  maxConvictionHoldHours: 200,
  totalTrades: 60,
  avgTradeUsd: 2000,
  accountAgedays: 400
};

const touristInput = {
  winRate: 40,
  totalReturn: 20,
  verifiedWins: 0,
  verifiedRugs: 0,
  avgHoldHours: 2,
  earlyEntryRate: 0.1,
  exitQuality: 30,
  avgConvictionX: 1,
  maxConvictionHoldHours: 3,
  totalTrades: 3,
  avgTradeUsd: 50,
  accountAgedays: 7
};

const exitLiqInput = {
  winRate: 20,
  totalReturn: -30,
  verifiedWins: 0,
  verifiedRugs: 15,
  avgHoldHours: 1,
  earlyEntryRate: 0.05,
  exitQuality: 20,
  avgConvictionX: 0.5,
  maxConvictionHoldHours: 1,
  totalTrades: 50,
  avgTradeUsd: 500,
  accountAgedays: 90
};

test('all REPUTATION_TIERS are defined', () => {
  expect(REPUTATION_TIERS).toContain('LEGEND');
  expect(REPUTATION_TIERS).toContain('SMART');
  expect(REPUTATION_TIERS).toContain('AVERAGE');
  expect(REPUTATION_TIERS).toContain('TOURIST');
  expect(REPUTATION_TIERS).toContain('EXIT_LIQUIDITY');
});

test('elite metrics → LEGEND tier', () => {
  const result = classifyReputation(legendInput);
  expect(result.tier).toBe('LEGEND');
  expect(result.reputationScore).toBeGreaterThan(60);
});

test('new inexperienced wallet → TOURIST', () => {
  const result = classifyReputation(touristInput);
  expect(result.tier).toBe('TOURIST');
});

test('low win rate + high rug ratio → EXIT_LIQUIDITY', () => {
  const result = classifyReputation(exitLiqInput);
  expect(result.tier).toBe('EXIT_LIQUIDITY');
  expect(result.warning).not.toBeNull();
});

test('reputationScore is 0-100', () => {
  for (const input of [legendInput, touristInput, exitLiqInput]) {
    const result = classifyReputation(input);
    expect(result.reputationScore).toBeGreaterThanOrEqual(0);
    expect(result.reputationScore).toBeLessThanOrEqual(100);
  }
});

test('components object has all keys', () => {
  const result = classifyReputation(legendInput);
  expect(result.components).toHaveProperty('winRateScore');
  expect(result.components).toHaveProperty('earlyEntryScore');
  expect(result.components).toHaveProperty('convictionScore');
  expect(result.components).toHaveProperty('exitQualityScore');
  expect(result.components).toHaveProperty('totalReturnScore');
  expect(result.components).toHaveProperty('tenureScore');
});

test('badge is a non-empty string', () => {
  const result = classifyReputation(legendInput);
  expect(typeof result.badge).toBe('string');
  expect(result.badge.length).toBeGreaterThan(0);
});

test('description is a non-empty string', () => {
  const result = classifyReputation(legendInput);
  expect(typeof result.description).toBe('string');
  expect(result.description.length).toBeGreaterThan(0);
});

test('LEGEND has no warning, EXIT_LIQUIDITY has warning', () => {
  const legend = classifyReputation(legendInput);
  const exitLiq = classifyReputation(exitLiqInput);
  expect(legend.warning).toBeNull();
  expect(exitLiq.warning).not.toBeNull();
});

test('higher win rate → higher reputation score', () => {
  const low  = classifyReputation({ ...legendInput, winRate: 30, verifiedWins: 0 });
  const high = classifyReputation(legendInput);
  expect(high.reputationScore).toBeGreaterThan(low.reputationScore);
});

test('high rug ratio penalizes score', () => {
  const clean  = classifyReputation({ ...legendInput, verifiedRugs: 0, totalTrades: 60 });
  const rugger = classifyReputation({ ...legendInput, verifiedRugs: 30, totalTrades: 60 });
  expect(clean.reputationScore).toBeGreaterThan(rugger.reputationScore);
});

// ─── reputationEmoji ──────────────────────────────────────────────────────────

test('reputationEmoji returns string for all tiers', () => {
  for (const tier of REPUTATION_TIERS) {
    const emoji = reputationEmoji(tier);
    expect(typeof emoji).toBe('string');
    expect(emoji.length).toBeGreaterThan(0);
  }
});

// ─── reputationWeight ─────────────────────────────────────────────────────────

test('LEGEND weight > SMART > AVERAGE > TOURIST > EXIT_LIQUIDITY', () => {
  expect(reputationWeight('LEGEND')).toBeGreaterThan(reputationWeight('SMART'));
  expect(reputationWeight('SMART')).toBeGreaterThan(reputationWeight('AVERAGE'));
  expect(reputationWeight('AVERAGE')).toBeGreaterThan(reputationWeight('TOURIST'));
  expect(reputationWeight('TOURIST')).toBeGreaterThan(reputationWeight('EXIT_LIQUIDITY'));
});

test('EXIT_LIQUIDITY weight is very low (≤ 0.2)', () => {
  expect(reputationWeight('EXIT_LIQUIDITY')).toBeLessThanOrEqual(0.2);
});
