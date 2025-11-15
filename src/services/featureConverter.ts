/**
 * Feature Converter - Ticket 014
 * 
 * Utilities for converting user inputs (QuickCheck, migraine reports)
 * to risk adjustments and feature vectors for demo purposes.
 */

/**
 * QuickCheck data structure (simplified)
 */
export interface QuickCheckData {
  caffeine: {
    level: 'none' | 'normal' | 'lot';
  };
  water: {
    amount: 'none' | 'low' | 'medium' | 'high';
  };
  food: {
    level: number; // 1-10
  };
  sleep?: {
    hours: number;
    quality: number;
  };
}

/**
 * Convert QuickCheck answers to risk adjustment
 * These are simple heuristics for demo purposes
 * 
 * @param checkData QuickCheck responses
 * @returns Risk adjustment (-0.15 to +0.15)
 */
export function quickCheckToRiskAdjustment(checkData: QuickCheckData): number {
  let adjustment = 0;

  // Caffeine impact
  if (checkData.caffeine?.level === 'lot') {
    adjustment += 0.05; // +5% risk
  } else if (checkData.caffeine?.level === 'none') {
    adjustment -= 0.02; // -2% risk (if user usually has caffeine, withdrawal)
  }

  // Hydration impact
  if (checkData.water?.amount === 'none' || checkData.water?.amount === 'low') {
    adjustment += 0.03; // +3% risk
  } else if (checkData.water?.amount === 'high') {
    adjustment -= 0.02; // -2% risk
  }

  // Food regularity impact
  if (checkData.food?.level !== undefined && checkData.food.level < 4) {
    adjustment += 0.04; // +4% risk for poor eating
  }

  // Sleep impact
  if (checkData.sleep) {
    const sleepAdj = sleepToRiskAdjustment(checkData.sleep.hours);
    adjustment += sleepAdj;
  }

  // Clamp to reasonable range
  return Math.max(-0.15, Math.min(0.15, adjustment));
}

/**
 * Convert migraine report to severity score
 * 
 * @param report Migraine report data
 * @returns Severity score (0-1)
 */
export function migraineReportToSeverity(report: any): number {
  let severity = 0;

  // Pain level scoring
  if (report.painLevel >= 7) severity += 0.8;
  else if (report.painLevel >= 4) severity += 0.5;
  else severity += 0.3;

  // Symptom modifiers
  if (report.hasNausea) severity += 0.1;
  if (report.hasPhotophobia) severity += 0.1;
  if (report.hasAura) severity += 0.05;

  return Math.min(1.0, severity);
}

/**
 * Calculate sleep impact on risk
 * 
 * @param sleepHours Hours of sleep
 * @returns Risk adjustment
 */
export function sleepToRiskAdjustment(sleepHours: number): number {
  if (sleepHours < 6) return 0.08; // +8% risk
  if (sleepHours < 7) return 0.03; // +3% risk
  if (sleepHours > 9) return 0.02; // +2% risk (oversleep)
  return 0; // Normal sleep (7-9 hours)
}

/**
 * Calculate stress impact on risk
 * 
 * @param stressLevel Stress level (1-10)
 * @returns Risk adjustment
 */
export function stressToRiskAdjustment(stressLevel: number): number {
  if (stressLevel >= 8) return 0.06; // +6% risk
  if (stressLevel >= 6) return 0.03; // +3% risk
  if (stressLevel <= 3) return -0.02; // -2% risk (low stress)
  return 0;
}
