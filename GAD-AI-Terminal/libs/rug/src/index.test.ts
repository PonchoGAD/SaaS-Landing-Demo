jest.mock('@solana/web3.js', () => ({ Connection: jest.fn(), PublicKey: jest.fn() }));
jest.mock('axios');
import { calculateRugProbability } from './index';

test('clean token has SAFE risk level', () => {
  const result = calculateRugProbability({
    mintAddress: 'SafeMint123',
    lpLocked: true,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 30,
    liquidityUsd: 50000,
    bundledWallets: 0,
    sniperCount: 2,
    devSoldPct: 5,
    tokenAgeHours: 48
  });
  expect(result.rugProbability).toBe(0);
  expect(result.riskLevel).toBe('SAFE');
  expect(Object.keys(result.flags).length).toBe(0);
});

test('LP not locked triggers NO_LIQUIDITY_LOCK flag (+20)', () => {
  const result = calculateRugProbability({
    mintAddress: 'TestMint',
    lpLocked: false,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 30,
    liquidityUsd: 50000,
    tokenAgeHours: 48
  });
  expect(result.flags.NO_LIQUIDITY_LOCK).toBe(true);
  expect(result.rugProbability).toBe(20);
  expect(result.riskLevel).toBe('LOW');
});

test('all flags active → EXTREME risk ≥ 80', () => {
  const result = calculateRugProbability({
    mintAddress: 'RugMint',
    lpLocked: false,
    mintAuthorityRevoked: false,
    freezeAuthorityRevoked: false,
    top10HolderPct: 90,
    liquidityUsd: 1000,
    bundledWallets: 5,
    sniperCount: 15,
    devSoldPct: 80,
    tokenAgeHours: 0.5
  });
  expect(result.rugProbability).toBeGreaterThanOrEqual(80);
  expect(result.riskLevel).toBe('EXTREME');
});

test('rugProbability is always 0-100', () => {
  const result = calculateRugProbability({ mintAddress: 'Any' });
  expect(result.rugProbability).toBeGreaterThanOrEqual(0);
  expect(result.rugProbability).toBeLessThanOrEqual(100);
});

test('low liquidity triggers LOW_LIQUIDITY flag', () => {
  const result = calculateRugProbability({
    mintAddress: 'LowLiq',
    liquidityUsd: 1000,
    tokenAgeHours: 10
  });
  expect(result.flags.LOW_LIQUIDITY).toBe(true);
});

test('dev sold 50%+ triggers DEV_SOLD_LARGE', () => {
  const result = calculateRugProbability({
    mintAddress: 'DevSold',
    devSoldPct: 60,
    tokenAgeHours: 24
  });
  expect(result.flags.DEV_SOLD_LARGE).toBe(true);
});

test('explanation contains flag names when present', () => {
  const result = calculateRugProbability({
    mintAddress: 'FlagTest',
    lpLocked: false,
    liquidityUsd: 500
  });
  expect(result.explanation).toContain('NO_LIQUIDITY_LOCK');
  expect(result.explanation).toContain('LOW_LIQUIDITY');
});
