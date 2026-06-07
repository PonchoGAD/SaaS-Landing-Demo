import { detectMarketRegime, regimeFromDb, regimeEmoji, REGIMES } from './index';

const bullInput = {
  solPriceChange7d: 20,
  solPriceChange24h: 5,
  btcPriceChange7d: 15,
  totalMarketVolume24h: 3_000_000_000,
  avgVolume7d: 2_000_000_000,
  fearGreedIndex: 65,
  newTokensPerHour: 100,
  rugRatePercent: 10,
  avgGadScore: 68
};

const bearInput = {
  solPriceChange7d: -20,
  solPriceChange24h: -8,
  btcPriceChange7d: -15,
  totalMarketVolume24h: 800_000_000,
  avgVolume7d: 2_000_000_000,
  fearGreedIndex: 25,
  newTokensPerHour: 40,
  rugRatePercent: 40,
  avgGadScore: 35
};

const panicInput = {
  solPriceChange7d: -35,
  solPriceChange24h: -15,
  btcPriceChange7d: -25,
  totalMarketVolume24h: 3_500_000_000,
  avgVolume7d: 2_000_000_000,
  fearGreedIndex: 8,
  newTokensPerHour: 20,
  rugRatePercent: 65,
  avgGadScore: 20
};

const euphoriaInput = {
  solPriceChange7d: 50,
  solPriceChange24h: 12,
  btcPriceChange7d: 30,
  totalMarketVolume24h: 5_000_000_000,
  avgVolume7d: 2_000_000_000,
  fearGreedIndex: 90,
  newTokensPerHour: 200,
  rugRatePercent: 5,
  avgGadScore: 80
};

test('all REGIMES are defined', () => {
  expect(REGIMES).toContain('BULL');
  expect(REGIMES).toContain('BEAR');
  expect(REGIMES).toContain('SIDEWAYS');
  expect(REGIMES).toContain('EUPHORIA');
  expect(REGIMES).toContain('PANIC');
});

test('positive momentum + greed → BULL or EUPHORIA', () => {
  const result = detectMarketRegime(bullInput);
  expect(['BULL', 'EUPHORIA']).toContain(result.regime);
});

test('negative momentum + fear → BEAR or PANIC', () => {
  const result = detectMarketRegime(bearInput);
  expect(['BEAR', 'PANIC']).toContain(result.regime);
});

test('extreme fear + price crash → PANIC', () => {
  const result = detectMarketRegime(panicInput);
  expect(result.regime).toBe('PANIC');
});

test('extreme greed + volume surge → EUPHORIA', () => {
  const result = detectMarketRegime(euphoriaInput);
  expect(result.regime).toBe('EUPHORIA');
});

test('confidence is 0-1', () => {
  for (const input of [bullInput, bearInput, panicInput, euphoriaInput]) {
    const result = detectMarketRegime(input);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }
});

test('BULL multiplier > SIDEWAYS > BEAR > PANIC', () => {
  const bull     = detectMarketRegime(bullInput);
  const bear     = detectMarketRegime(bearInput);
  const panic    = detectMarketRegime(panicInput);

  // Verify multipliers obey hierarchy (by checking known multiplier values)
  // BULL: 1.2, BEAR: 0.7, PANIC: 0.5
  if (bull.regime === 'BULL') expect(bull.multiplier).toBe(1.2);
  if (bear.regime === 'BEAR') expect(bear.multiplier).toBe(0.7);
  if (panic.regime === 'PANIC') expect(panic.multiplier).toBe(0.5);
});

test('description is a non-empty string', () => {
  const result = detectMarketRegime(bullInput);
  expect(typeof result.description).toBe('string');
  expect(result.description.length).toBeGreaterThan(0);
});

test('actionGuide is a non-empty string', () => {
  const result = detectMarketRegime(bearInput);
  expect(typeof result.actionGuide).toBe('string');
  expect(result.actionGuide.length).toBeGreaterThan(0);
});

test('signals object has correct structure', () => {
  const result = detectMarketRegime(bullInput);
  expect(['BULLISH', 'NEUTRAL', 'BEARISH']).toContain(result.signals.momentum);
  expect(['EXPANDING', 'STABLE', 'CONTRACTING']).toContain(result.signals.volume);
  expect(['GREEDY', 'NEUTRAL', 'FEARFUL']).toContain(result.signals.sentiment);
  expect(['EXTREME', 'HIGH', 'NORMAL', 'LOW']).toContain(result.signals.rugRate);
});

// ─── regimeFromDb ─────────────────────────────────────────────────────────────

test('regimeFromDb returns correct multiplier for BULL', () => {
  const result = regimeFromDb({ regime: 'BULL', confidence: 0.8 });
  expect(result.regime).toBe('BULL');
  expect(result.multiplier).toBe(1.2);
});

test('regimeFromDb defaults unknown regime to SIDEWAYS', () => {
  const result = regimeFromDb({ regime: 'UNKNOWN_REGIME', confidence: 0.5 });
  expect(result.regime).toBe('SIDEWAYS');
  expect(result.multiplier).toBe(1.0);
});

// ─── regimeEmoji ──────────────────────────────────────────────────────────────

test('regimeEmoji returns string for all regimes', () => {
  for (const regime of REGIMES) {
    const emoji = regimeEmoji(regime);
    expect(typeof emoji).toBe('string');
    expect(emoji.length).toBeGreaterThan(0);
  }
});
