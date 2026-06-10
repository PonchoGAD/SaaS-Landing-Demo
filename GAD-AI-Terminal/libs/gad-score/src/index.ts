// GAD Score — unified 0-100 token rating
//
// Formula:
//   AI Score    30%
//   Narrative   15%
//   Hype        15%
//   Whale       15%
//   Risk        10% (inverted: 100 - risk_score)
//   Survival    10%
//   Rug         5%  (inverted: 100 - rug_probability)

export interface GadScoreInput {
  aiScore: number;         // 0-100
  narrativeScore: number;  // 0-100
  hypeScore: number;       // 0-100
  whaleScore: number;      // 0-100
  riskScore: number;       // 0-100 (high = bad)
  survivalScore: number;   // 0-100 (high = good)
  rugProbability: number;  // 0-100 (high = bad)
}

export interface GadScoreResult {
  gadScore: number;
  breakdown: {
    aiComponent:        number;
    narrativeComponent: number;
    hyeComponent:       number;
    whaleComponent:     number;
    riskComponent:      number;
    survivalComponent:  number;
    rugComponent:       number;
  };
  rating: 'LEGENDARY' | 'STRONG' | 'GOOD' | 'NEUTRAL' | 'WEAK' | 'DANGEROUS';
  explanation: string;
}

const WEIGHTS = {
  ai:        0.30,
  narrative: 0.15,
  hype:      0.15,
  whale:     0.15,
  risk:      0.10,
  survival:  0.10,
  rug:       0.05,
} as const;

export function calculateGadScore(input: GadScoreInput): GadScoreResult {
  const aiComponent        = input.aiScore        * WEIGHTS.ai;
  const narrativeComponent = input.narrativeScore  * WEIGHTS.narrative;
  const hyeComponent       = input.hypeScore       * WEIGHTS.hype;
  const whaleComponent     = input.whaleScore      * WEIGHTS.whale;
  const riskComponent      = (100 - input.riskScore)    * WEIGHTS.risk;
  const survivalComponent  = input.survivalScore   * WEIGHTS.survival;
  const rugComponent       = (100 - input.rugProbability) * WEIGHTS.rug;

  const gadScore = Math.min(100, Math.max(0, Math.round(
    aiComponent + narrativeComponent + hyeComponent +
    whaleComponent + riskComponent + survivalComponent + rugComponent
  )));

  const rating: GadScoreResult['rating'] =
    gadScore >= 88 ? 'LEGENDARY' :
    gadScore >= 75 ? 'STRONG' :
    gadScore >= 60 ? 'GOOD' :
    gadScore >= 40 ? 'NEUTRAL' :
    gadScore >= 25 ? 'WEAK' : 'DANGEROUS';

  const dominantFactors: string[] = [];
  if (input.hypeScore >= 75)    dominantFactors.push(`viral social (hype ${input.hypeScore})`);
  if (input.narrativeScore >= 70) dominantFactors.push(`strong narrative`);
  if (input.whaleScore >= 70)   dominantFactors.push(`whale accumulation`);
  if (input.rugProbability >= 60) dominantFactors.push(`⚠ rug risk ${input.rugProbability}%`);
  if (input.riskScore >= 70)    dominantFactors.push(`⚠ high risk ${input.riskScore}`);

  const explanation = dominantFactors.length
    ? `GAD ${gadScore}: ${dominantFactors.join(', ')}.`
    : `GAD Score ${gadScore} — ${rating.toLowerCase()} fundamentals.`;

  return {
    gadScore,
    breakdown: { aiComponent, narrativeComponent, hyeComponent, whaleComponent, riskComponent, survivalComponent, rugComponent },
    rating,
    explanation
  };
}

export { WEIGHTS as GAD_WEIGHTS };
