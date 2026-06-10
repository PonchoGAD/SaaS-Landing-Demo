import { evaluateRules, THRESHOLDS } from './alert.rules';
import { AlertType, TokenAlertContext } from './alert.types';

const base: TokenAlertContext = {
  tokenId: 'tok-1',
  mintAddress: 'Mint111',
  symbol: 'TEST',
  aiScore: 50,
  riskScore: 30,
  volume5m: 100,
  volume1h: 1000,
  volume24h: 10000,
  liquidityChange: 0,
  isNewToken: false
};

describe('evaluateRules', () => {
  it('returns empty array when no rules match', () => {
    expect(evaluateRules(base)).toHaveLength(0);
  });

  it('fires NEW_HIGH_SCORE when aiScore >= threshold', () => {
    const alerts = evaluateRules({ ...base, aiScore: THRESHOLDS.HIGH_SCORE });
    const types = alerts.map((a) => a.type);
    expect(types).toContain(AlertType.NEW_HIGH_SCORE);
  });

  it('does not fire NEW_HIGH_SCORE when aiScore is below threshold', () => {
    const alerts = evaluateRules({ ...base, aiScore: THRESHOLDS.HIGH_SCORE - 1 });
    expect(alerts.map((a) => a.type)).not.toContain(AlertType.NEW_HIGH_SCORE);
  });

  it('fires HIGH_RISK when riskScore >= threshold', () => {
    const alerts = evaluateRules({ ...base, riskScore: THRESHOLDS.HIGH_RISK });
    expect(alerts.map((a) => a.type)).toContain(AlertType.HIGH_RISK);
  });

  it('fires WHALE_ACTIVITY when whaleActivityScore >= threshold', () => {
    const alerts = evaluateRules({ ...base, whaleActivityScore: THRESHOLDS.WHALE_ACTIVITY });
    expect(alerts.map((a) => a.type)).toContain(AlertType.WHALE_ACTIVITY);
  });

  it('fires VOLUME_SPIKE when 5m extrapolated > 1h * ratio', () => {
    // volume5m * 12 = 3600, volume1h = 1000, ratio = 3.6 >= VOLUME_SPIKE_RATIO (3.0)
    const alerts = evaluateRules({ ...base, volume5m: 300, volume1h: 1000 });
    expect(alerts.map((a) => a.type)).toContain(AlertType.VOLUME_SPIKE);
  });

  it('does not fire VOLUME_SPIKE when ratio is below threshold', () => {
    const alerts = evaluateRules({ ...base, volume5m: 50, volume1h: 1000 });
    expect(alerts.map((a) => a.type)).not.toContain(AlertType.VOLUME_SPIKE);
  });

  it('fires LIQUIDITY_DROP when liquidityChange <= threshold', () => {
    const alerts = evaluateRules({ ...base, liquidityChange: THRESHOLDS.LIQUIDITY_DROP });
    expect(alerts.map((a) => a.type)).toContain(AlertType.LIQUIDITY_DROP);
  });

  it('fires NEW_TOKEN when isNewToken is true', () => {
    const alerts = evaluateRules({ ...base, isNewToken: true });
    expect(alerts.map((a) => a.type)).toContain(AlertType.NEW_TOKEN);
  });

  it('fires AI_SCORE_INCREASE when delta >= threshold', () => {
    const alerts = evaluateRules({
      ...base,
      aiScore: 70,
      previousAiScore: 70 - THRESHOLDS.AI_SCORE_INCREASE
    });
    expect(alerts.map((a) => a.type)).toContain(AlertType.AI_SCORE_INCREASE);
  });

  it('can fire multiple alerts for the same token', () => {
    const alerts = evaluateRules({
      ...base,
      aiScore: 85,
      riskScore: 75,
      isNewToken: true
    });
    expect(alerts.length).toBeGreaterThanOrEqual(3);
  });

  it('score on VOLUME_SPIKE alert is capped at 100', () => {
    const alerts = evaluateRules({ ...base, volume5m: 10000, volume1h: 100 });
    const spike = alerts.find((a) => a.type === AlertType.VOLUME_SPIKE);
    expect(spike?.score).toBeLessThanOrEqual(100);
  });
});
