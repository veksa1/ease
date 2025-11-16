/**
 * Hook for policy-based measurement recommendations
 * 
 * ⚠️ BREAKING CHANGE: No longer accepts pre-computed features.
 * Fetches real user data internally via userFeaturesService.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { policyService, type PolicyResponse } from '../services/policyService';
import { userFeaturesService } from '../services/userFeaturesService';

const RETRY_DELAYS_MS = [0, 1000, 2000, 5000, 10000];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface UsePolicyRecommendationsOptions {
  userId: string;
  date?: Date; // Date to get recommendations for (default: today)
  k?: number;
  enabled?: boolean; // Only fetch when enabled
}

export function usePolicyRecommendations({
  userId,
  date,
  k = 3,
  enabled = true,
}: UsePolicyRecommendationsOptions) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PolicyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureCoverage, setFeatureCoverage] = useState<number>(0);

  const dateKey = date ? date.toISOString() : 'today';
  const resolvedDate = useMemo(() => date ?? new Date(), [dateKey]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    let lastError: string | null = null;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (!isMounted.current || !enabled) {
        setLoading(false);
        return;
      }

      if (attempt > 0) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        if (!isMounted.current || !enabled) {
          setLoading(false);
          return;
        }
      }

      try {
        const features = await userFeaturesService.get24HourFeatures({
          userId,
          date: resolvedDate,
          includeCalendar: true,
          includeWeather: true,
        });

        const validation = userFeaturesService.validateFeatures(features);
        if (!validation.valid) {
          lastError = `Invalid features: ${validation.errors.join(', ')}`;
          console.error('[usePolicyRecommendations] Validation failed:', validation.errors);
          continue;
        }

        setFeatureCoverage(0.6);

        const policy = await policyService.getTopKHours(userId, features, k);

        if (policy) {
          if (!isMounted.current) return;
          setRecommendations(policy);
          setLoading(false);
          return;
        }

        lastError = 'Failed to fetch recommendations';
        console.warn('[usePolicyRecommendations] Empty policy response, retrying...');
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[usePolicyRecommendations] Attempt ${attempt + 1} failed:`, err);
      }
    }

    if (!isMounted.current) return;
    setError(lastError ?? 'Failed to fetch recommendations after multiple attempts');
    setLoading(false);
  }, [userId, resolvedDate, k, enabled]);

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
