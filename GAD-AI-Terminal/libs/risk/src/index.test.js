"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
test('calculateRiskScore returns bounded integer', () => {
    const score = (0, index_1.calculateRiskScore)({
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
    const explanation = (0, index_1.explainRiskScore)({
        liquidityChange: 80,
        largeSellPressure: 60,
        holderConcentration: 65,
        whaleActivity: 55,
        volatility: 70
    });
    expect(explanation).toContain('Liquidity dropped');
    expect(explanation).toContain('Large sell pressure');
});
