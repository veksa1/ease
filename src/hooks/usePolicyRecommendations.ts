/**
 * Hook for policy-based measurement recommendations
 * 
 * ⚠️ BREAKING CHANGE: No longer accepts pre-computed features.
 * Fetches real user data internally via userFeaturesService.
 */

import { useState, useEffect, useCallback } from 'react';
import { policyService, type PolicyResponse } from '../services/policyService';
import { userFeaturesService } from '../services/userFeaturesService';

interface UsePolicyRecommendationsOptions {
  userId: string;
  date?: Date; // Date to get recommendations for (default: today)
  k?: number;
  enabled?: boolean; // Only fetch when enabled
}

export function usePolicyRecommendations({
  userId,
  date = new Date(),
  k = 3,
  enabled = true,
}: UsePolicyRecommendationsOptions) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PolicyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureCoverage, setFeatureCoverage] = useState<number>(0);

  const fetchRecommendations = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // Build real user features (no more mock data!)
      const features = await userFeaturesService.get24HourFeatures({
        userId,
        date,
        includeCalendar: true,
        includeWeather: true,
      });

      // Validate before sending to API
      const validation = userFeaturesService.validateFeatures(features);
      if (!validation.valid) {
        setError(`Invalid features: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Calculate feature coverage (simplified - just check non-defaults)
      // In a real implementation, this would be returned by userFeaturesService
      setFeatureCoverage(0.6); // Placeholder

      const policy = await policyService.getTopKHours(userId, features, k);

      if (policy) {
        setRecommendations(policy);
      } else {
        setError('Failed to fetch recommendations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[usePolicyRecommendations] Error:', err);
    }

    setLoading(false);
  }, [userId, date, k, enabled]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    loading,
    recommendations,
    error,
    featureCoverage,
    refetch: fetchRecommendations,
  };
}
