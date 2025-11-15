/**
 * Map user-suspected trigger hypotheses to RiskVariable format
 */

import { TriggerHypothesis, RiskVariable } from '../types';

/**
 * Convert trigger hypotheses to risk variables
 * Category: 'user-hypothesis'
 * Percentage: round(confidence * 10) to convert 0-1 scale to 0-10 scale
 */
export function mapTriggerHypothesesToRiskVariables(
  hypotheses: TriggerHypothesis[]
): RiskVariable[] {
  return hypotheses.map(h => ({
    name: h.key,
    percentage: Math.round(h.confidence * 10),
    category: 'user-hypothesis' as const,
    value: h.threshold || 'user suspected',
    unit: h.freqPerMonth ? `${h.freqPerMonth}/mo` : '',
  }));
}
