import { detectNarrative, calculateNarrativeScore } from './index';

test('detectNarrative identifies AI tokens', () => {
  expect(detectNarrative('AGNT', 'AI Agent')).toBe('AI_AGENT');
  expect(detectNarrative('GPT', 'GPT Bot')).toBe('AI_AGENT');
  expect(detectNarrative('CLAUDE', 'claude ai')).toBe('AI_AGENT');
});

test('detectNarrative identifies DOG tokens', () => {
  expect(detectNarrative('DOGE', 'Dogecoin')).toBe('DOG');
  expect(detectNarrative('SHIB', 'Shiba Inu')).toBe('DOG');
  expect(detectNarrative('WIF', 'Dog Wif Hat')).toBe('DOG');
});

test('detectNarrative identifies PEPE tokens', () => {
  expect(detectNarrative('PEPE', 'Pepe Frog')).toBe('PEPE');
  expect(detectNarrative('WOJ', 'Wojak Token')).toBe('PEPE');
});

test('detectNarrative identifies POLITICS tokens', () => {
  expect(detectNarrative('TRUMP', 'Trump MAGA')).toBe('POLITICS');
  expect(detectNarrative('MAGA', 'Make America Great')).toBe('POLITICS');
});

test('detectNarrative returns UNKNOWN for unrecognized tokens', () => {
  expect(detectNarrative('XYZ', 'Random Token 123')).toBe('UNKNOWN');
});

test('calculateNarrativeScore returns 0-100', () => {
  const result = calculateNarrativeScore({ symbol: 'AGNT', name: 'AI Agent Token', narrativeStrength: 80 });
  expect(result.narrativeScore).toBeGreaterThanOrEqual(0);
  expect(result.narrativeScore).toBeLessThanOrEqual(100);
  expect(result.tag).toBe('AI_AGENT');
});

test('UNKNOWN narrative gets score 0', () => {
  const result = calculateNarrativeScore({ symbol: 'XYZ', name: 'Random', narrativeStrength: 0 });
  expect(result.tag).toBe('UNKNOWN');
  expect(result.narrativeScore).toBe(0);
});

test('trending narrative gets trendBoost', () => {
  const trending = calculateNarrativeScore({ symbol: 'PEPE', name: 'Pepe', narrativeStrength: 90 });
  const notTrending = calculateNarrativeScore({ symbol: 'PEPE', name: 'Pepe', narrativeStrength: 0 });
  expect(trending.narrativeScore).toBeGreaterThan(notTrending.narrativeScore);
  expect(trending.trendBoost).toBeGreaterThan(0);
});

test('explanation mentions tag name', () => {
  const result = calculateNarrativeScore({ symbol: 'DOGE', name: 'Doge' });
  expect(result.explanation).toContain('DOG');
});
