import { PersonalMigraineProfile, RiskVariable } from '../types';

/**
 * Convert personal migraine profile from database into RiskVariable format
 * for display in the Risk Factors page
 */
export function profileToRiskVariables(profile: PersonalMigraineProfile | null): RiskVariable[] {
  if (!profile) return [];

  const variables: RiskVariable[] = [];

  // Migraine History - higher years = higher contribution
  // Scale: 0-50 years → 5-20% contribution
  const historyPercentage = Math.min(20, 5 + (profile.migraineHistoryYears / 50) * 15);
  variables.push({
    name: 'Migraine History',
    percentage: Math.round(historyPercentage),
    category: 'personal',
    value: profile.migraineHistoryYears.toString(),
    unit: 'yrs',
  });

  // Age - very minor contribution (1-3%)
  // Younger (<25) and older (>50) may have slightly higher risk
  let agePercentage = 1;
  if (profile.age < 25 || profile.age > 50) {
    agePercentage = 2;
  }
  
  variables.push({
    name: 'Age',
    percentage: agePercentage,
    category: 'personal',
    value: profile.age.toString(),
    unit: 'years',
  });

  // Body Weight - minor contribution (1%)
  if (profile.weightKg) {
    variables.push({
      name: 'Body Weight',
      percentage: 1,
      category: 'personal',
      value: profile.weightKg.toString(),
      unit: 'kg',
    });
  }

  // BMI - minor contribution (1%)
  if (profile.bmi) {
    variables.push({
      name: 'BMI',
      percentage: 1,
      category: 'personal',
      value: profile.bmi.toFixed(1),
      unit: '',
    });
  }

  return variables;
}
