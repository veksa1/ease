/**
 * What-If Simulator Hook
 * 
 * Provides real-time risk calculations as user adjusts behaviors.
 * Uses REAL user data as baseline, NOT mock data.
 */

import { useState, useCallback, useEffect } from 'react';
import { userFeaturesService } from '../services/userFeaturesService';
import { riskPredictionService } from '../services/riskPredictionService';
import { debounce } from '../utils/debounce';

export interface WhatIfScenario {
  label: string;
  icon: string;
  featureDeltas: Record<number, number>; // Feature index → delta value
}

export interface WhatIfResult {
  label: string;
  icon: string;
  risk: number;
  delta: number; // Difference from baseline (negative = improvement)
}

export interface WhatIfSimulatorState {
  baselineRisk: number | null;
  baselineFeatures: number[][] | null;
  scenarios: WhatIfResult[];
  isCalculating: boolean;
  error: string | null;
}

/**
 * Hook for real-time what-if risk simulations
 * 
 * @param userId - User identifier
 * @returns Simulator state and calculation function
 */
export function useWhatIfSimulator(userId: string) {
  const [baselineRisk, setBaselineRisk] = useState<number | null>(null);
  const [baselineFeatures, setBaselineFeatures] = useState<number[][] | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState(true);

  // Load baseline from real user data
  useEffect(() => {
    const loadBaseline = async () => {
      setIsLoadingBaseline(true);
      try {
        // Get current user features (NO MOCK DATA)
        const features = await userFeaturesService.get24HourFeatures({
          userId,
          date: new Date(),
          includeCalendar: true,
          includeWeather: true,
        });

        setBaselineFeatures(features);

        // Get baseline risk
        const prediction = await riskPredictionService.getDailyRisk(userId, features);
        if (prediction) {
          setBaselineRisk(prediction.mean_probability);
        } else {
          setError('Failed to load baseline risk');
        }
      } catch (err) {
        setError('Failed to load baseline risk');
        console.error('Baseline loading error:', err);
      } finally {
        setIsLoadingBaseline(false);
      }
    };

    loadBaseline();
  }, [userId]);

  // Calculate what-if scenarios (debounced)
  const calculateScenarios = useCallback(
    debounce(async (whatIfScenarios: WhatIfScenario[]) => {
      if (!baselineFeatures || baselineRisk === null) {
        console.warn('Baseline not loaded yet');
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        const results: WhatIfResult[] = [];

        for (const scenario of whatIfScenarios) {
          // Apply feature deltas to baseline
          const modifiedFeatures = applyDeltas(baselineFeatures, scenario.featureDeltas);

          // Get risk for modified scenario
          const prediction = await riskPredictionService.getDailyRisk(
            userId,
            modifiedFeatures
          );

          if (prediction) {
            results.push({
              label: scenario.label,
              icon: scenario.icon,
              risk: prediction.mean_probability,
              delta: prediction.mean_probability - baselineRisk,
            });
          }
        }

        // Sort by most impactful (most negative delta = best improvement)
        results.sort((a, b) => a.delta - b.delta);

        setScenarios(results);
      } catch (err) {
        setError('Failed to calculate scenarios');
        console.error('Scenario calculation error:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 500), // 500ms debounce
    [baselineFeatures, baselineRisk, userId]
  );

  /**
   * Recalculate risk with modified features
   * 
   * @param featureDeltas - Changes to apply to baseline features
   * @returns Updated risk or null if calculation fails
   */
  const recalculateRisk = useCallback(
    async (featureDeltas: Record<number, number>): Promise<number | null> => {
      if (!baselineFeatures) {
        console.warn('Baseline features not loaded');
        return null;
      }

      try {
        const modifiedFeatures = applyDeltas(baselineFeatures, featureDeltas);
        const prediction = await riskPredictionService.getDailyRisk(userId, modifiedFeatures);
        return prediction?.mean_probability || null;
      } catch (err) {
        console.error('Risk recalculation error:', err);
        return null;
      }
    },
    [baselineFeatures, userId]
  );

  return {
    baselineRisk,
    baselineFeatures,
    scenarios,
    isCalculating,
    isLoadingBaseline,
    error,
    calculateScenarios,
    recalculateRisk,
  };
}

/**
 * Apply feature deltas to base feature matrix
 * 
 * @param baseFeatures - Original 24x35 feature matrix
 * @param deltas - Map of feature index to delta value
 * @returns Modified feature matrix
 */
function applyDeltas(
  baseFeatures: number[][],
  deltas: Record<number, number>
): number[][] {
  return baseFeatures.map(hourFeatures => {
    const modified = [...hourFeatures];
    Object.entries(deltas).forEach(([indexStr, delta]) => {
      const index = parseInt(indexStr);
      if (index >= 0 && index < modified.length) {
        modified[index] += delta;
      }
    });
    return modified;
  });
}

/**
 * Common what-if scenarios for Quick Check
 */
export const COMMON_SCENARIOS: WhatIfScenario[] = [
  {
    label: 'Sleep 8 hours',
    icon: '😴',
    featureDeltas: { 0: 1.0 }, // Add 1 hour to sleep
  },
  {
    label: 'Drink 2L water',
    icon: '💧',
    featureDeltas: { 7: 0.5 }, // Add 0.5L water
  },
  {
    label: 'Skip afternoon coffee',
    icon: '☕',
    featureDeltas: { 6: -100 }, // Reduce caffeine by 100mg
  },
  {
    label: 'Eat regularly',
    icon: '🍽️',
    featureDeltas: { 8: 2.0 }, // Improve meal regularity
  },
  {
    label: 'Exercise 30 min',
    icon: '🏃',
    featureDeltas: { 9: 30, 10: 2.0 }, // Add exercise + activity level
  },
  {
    label: 'Reduce stress',
    icon: '🧘',
    featureDeltas: { 3: -2.0, 19: 20 }, // Lower stress, add meditation
  },
];
