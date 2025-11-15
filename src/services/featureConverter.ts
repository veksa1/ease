/**
 * Feature Converter - Ticket 014
 * 
 * Utilities for converting user inputs (QuickCheck, migraine reports)
 * to risk adjustments and feature vectors for demo purposes.
 */

/**
 * QuickCheck data structure (updated for DS4)
 * Supports both old and new formats for backwards compatibility
 */
export interface QuickCheckData {
  caffeine: {
    level: 'none' | 'some' | 'lot' | 'normal' | null; // 'normal' kept for backwards compat
    types?: string[];
    lastIntake?: string;
  };
  water: {
    amount: 'none' | 'low' | 'medium' | 'high' | null;
  };
  food: {
    level: number; // 0-10
    note?: string;
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

  // Caffeine impact (handle both 'normal' and 'some' for backwards compatibility)
  const caffeineLevel = checkData.caffeine?.level;
  if (caffeineLevel === 'lot') {
    adjustment += 0.05; // +5% risk
  } else if (caffeineLevel === 'none') {
    adjustment -= 0.02; // -2% risk (if user usually has caffeine, withdrawal)
  }
  // 'normal' or 'some' = neutral impact (0)

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

/**
 * Convert Quick Check data to 24-hour feature vectors
 * 
 * This creates a simplified feature representation based on user's
 * Quick Check responses. Uses defaults from ALINE priors.yaml for
 * features not captured by Quick Check.
 * 
 * Feature order matches ALINE model expectations (20 features):
 * 0: Sleep Duration, 1: Sleep Quality, 2: Sleep Consistency
 * 3: Stress Level, 4: Work Hours, 5: Anxiety Score
 * 6: Caffeine Intake, 7: Water Intake, 8: Meal Regularity
 * 9: Exercise Duration, 10: Physical Activity, 11: Neck Tension
 * 12: Screen Time, 13: Weather Pressure, 14: Noise Level
 * 15: Hormone Fluctuation, 16: Menstrual Cycle Day
 * 17: Alcohol Consumption, 18: Smoking, 19: Meditation Time
 * 
 * @param checkData Quick Check responses
 * @param numFeatures Number of features per hour (default: 20)
 * @returns 24 hours of features [24, numFeatures]
 */
export function quickCheckToFeatures(checkData: QuickCheckData, numFeatures: number = 20): number[][] {
  const hours = 24;
  const features: number[][] = [];
  
  // Map Quick Check responses to normalized feature values (0-1 range)
  const sleepHours = checkData.sleep ? checkData.sleep.hours / 10 : 0.7; // Default 7 hrs normalized
  const sleepQuality = checkData.sleep ? checkData.sleep.quality / 10 : 0.65; // Default quality
  const sleepConsistency = 0.6; // Default - not captured by Quick Check
  
  const stressLevel = 0.6; // Default moderate stress - not captured
  const workHours = 0.85; // Default 8.5 hrs normalized to 0-1
  const anxietyScore = 0.55; // Default moderate anxiety
  
  const caffeineIntake = mapCaffeineToScore(checkData.caffeine.level);
  const waterIntake = mapHydrationToScore(checkData.water.amount);
  const mealRegularity = checkData.food.level / 10; // Normalize to 0-1
  
  const exerciseDuration = 0.3; // Default ~30 min normalized
  const physicalActivity = 0.55; // Default moderate
  const neckTension = 0.45; // Default low-moderate tension
  
  const screenTime = 0.8; // Default 8 hrs normalized
  const weatherPressure = 0.5; // Default neutral (1013 hPa normalized)
  const noiseLevel = 0.55; // Default moderate
  
  const hormoneFluctuation = 0.5; // Default neutral
  const menstrualCycleDay = 0.5; // Default mid-cycle
  
  const alcoholConsumption = 0.16; // Default low (~1.6 units normalized)
  const smoking = 0.0; // Default non-smoker
  const meditationTime = 0.12; // Default ~12 min normalized
  
  for (let hour = 0; hour < hours; hour++) {
    const hourlyFeatures: number[] = [
      sleepHours,           // 0: Sleep Duration
      sleepQuality,         // 1: Sleep Quality
      sleepConsistency,     // 2: Sleep Consistency
      stressLevel,          // 3: Stress Level
      workHours,            // 4: Work Hours
      anxietyScore,         // 5: Anxiety Score
      caffeineIntake,       // 6: Caffeine Intake
      waterIntake,          // 7: Water Intake
      mealRegularity,       // 8: Meal Regularity
      exerciseDuration,     // 9: Exercise Duration
      physicalActivity,     // 10: Physical Activity Level
      neckTension,          // 11: Neck Tension
      screenTime,           // 12: Screen Time
      weatherPressure,      // 13: Weather Pressure
      noiseLevel,           // 14: Noise Level
      hormoneFluctuation,   // 15: Hormone Fluctuation Index
      menstrualCycleDay,    // 16: Menstrual Cycle Day
      alcoholConsumption,   // 17: Alcohol Consumption
      smoking,              // 18: Smoking
      meditationTime,       // 19: Meditation Time
    ];
    
    // Ensure we have exactly the right number of features
    features.push(hourlyFeatures.slice(0, numFeatures));
  }
  
  return features;
}

/**
 * Map caffeine level to numeric score
 */
function mapCaffeineToScore(level: string | null): number {
  switch (level) {
    case 'none': return 0;
    case 'some': return 0.5;
    case 'normal': return 0.5;
    case 'lot': return 1;
    default: return 0.5;
  }
}

/**
 * Map hydration level to numeric score
 */
function mapHydrationToScore(amount: string | null): number {
  switch (amount) {
    case 'none': return 0;
    case 'low': return 0.33;
    case 'medium': return 0.66;
    case 'high': return 1;
    default: return 0.5;
  }
}
