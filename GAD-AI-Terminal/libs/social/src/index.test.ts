import { calculateHypeScore, buildSocialDataFromMetrics } from './index';

const baseData = {
  mentionCount1h: 500,
  mentionCount24h: 5000,
  engagementRate: 0.05,
  sentimentScore: 0.8,
  followerGrowthPct: 10,
  telegramMentions: 200,
  pumpFunComments: 50
};

test('hypeScore is always 0-100', () => {
  const result = calculateHypeScore(baseData);
  expect(result.hypeScore).toBeGreaterThanOrEqual(0);
  expect(result.hypeScore).toBeLessThanOrEqual(100);
});

test('high mention velocity produces high velocityScore', () => {
  // 500 mentions/h vs 5000/24h avg = ~2.4x daily avg
  const result = calculateHypeScore(baseData);
  expect(result.velocityScore).toBeGreaterThan(50);
});

test('viral conditions (5x+ velocity, bullish sentiment) → hypeScore ≥ 70', () => {
  const result = calculateHypeScore({
    mentionCount1h: 5000,
    mentionCount24h: 24000, // 1000/h avg → 5x spike
    engagementRate: 0.15,
    sentimentScore: 1.0,
    followerGrowthPct: 20,
    telegramMentions: 1000,
    pumpFunComments: 500
  });
  expect(result.hypeScore).toBeGreaterThanOrEqual(70);
  expect(result.explanation.toLowerCase()).toContain('viral');
});

test('zero activity → low hypeScore', () => {
  const result = calculateHypeScore({
    mentionCount1h: 0,
    mentionCount24h: 0,
    engagementRate: 0,
    sentimentScore: 0,
    followerGrowthPct: 0,
    telegramMentions: 0,
    pumpFunComments: 0
  });
  expect(result.hypeScore).toBeLessThan(30);
});

test('bearish sentiment (0) lowers score vs bullish (1)', () => {
  const bullish = calculateHypeScore({ ...baseData, sentimentScore: 1.0 });
  const bearish  = calculateHypeScore({ ...baseData, sentimentScore: 0.0 });
  expect(bullish.hypeScore).toBeGreaterThan(bearish.hypeScore);
});

test('buildSocialDataFromMetrics returns valid SocialData shape', () => {
  const data = buildSocialDataFromMetrics({
    volume5m: 50000,
    volume1h: 200000,
    txCount5m: 100,
    txCount1h: 400,
    isNewToken: true
  });
  expect(data.mentionCount1h).toBeGreaterThanOrEqual(0);
  expect(data.sentimentScore).toBeGreaterThanOrEqual(0);
  expect(data.sentimentScore).toBeLessThanOrEqual(1);
  expect(data.followerGrowthPct).toBe(15); // isNewToken = true → 15
});
