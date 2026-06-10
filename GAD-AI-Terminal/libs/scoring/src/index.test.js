"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
test('normalizeScore clamps values to 0-100', () => {
    expect((0, index_1.normalizeScore)(120)).toBe(100);
    expect((0, index_1.normalizeScore)(-10)).toBe(0);
    expect((0, index_1.normalizeScore)(55.7)).toBe(56);
});
test('calculateAiScore combines factors and returns 0-100', () => {
    const score = (0, index_1.calculateAiScore)({
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
    const report = (0, index_1.buildFactorReport)({
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
