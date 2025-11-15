/**
 * Hourly Posterior Hook
 * 
 * Hook for fetching and managing hourly posterior data
 * from Quick Check responses or stored timeline data.
 */

import { useState, useEffect } from 'react';
import { posteriorService, type HourlyPosterior, type PosteriorResponse } from '../services/posteriorService';
import { quickCheckToFeatures, type QuickCheckData } from '../services/featureConverter';
import { demoDataService } from '../services/demoDataService';

export interface HourlyRiskData {
  hour: number;
  risk: number; // 0-1
  mean: number[];
  std: number[];
}

/**
 * Hook for fetching hourly posterior distributions
 * 
 * @param checkData - Optional Quick Check data to generate predictions
 * @param userId - User identifier (default: 'demo-user')
 */
export function useHourlyPosterior(checkData?: QuickCheckData, userId: string = 'demo-user') {
  const [loading, setLoading] = useState(false);
  const [hourlyData, setHourlyData] = useState<HourlyRiskData[]>([]);
  const [highRiskHours, setHighRiskHours] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkData) {
      // Try to load from timeline
      loadFromTimeline();
      return;
    }

    fetchPosterior();
  }, [checkData]);

  const fetchPosterior = async () => {
    if (!checkData) return;

    setLoading(true);
    setError(null);

    try {
      // Convert Quick Check to features
      const features = quickCheckToFeatures(checkData, 20);
      
      // Fetch from backend
      const response = await posteriorService.getHourlyPosterior(userId, features);
      
      if (response) {
        processResponse(response);
      } else {
        setError('Failed to fetch posterior data');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching hourly posterior:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const loadFromTimeline = async () => {
    const today = new Date().toISOString().split('T')[0];
    const entries = await demoDataService.getTimelineEntries(today);
    
    // Find most recent hourly_posterior entry
    const posteriorEntry = entries
      .filter(e => e.type === 'hourly_posterior')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (posteriorEntry && posteriorEntry.data?.posteriors) {
      processResponse({
        user_id: userId,
        hourly_posteriors: posteriorEntry.data.posteriors,
        timestamp: posteriorEntry.timestamp,
      });
      
      if (posteriorEntry.data.highRiskHours) {
        setHighRiskHours(posteriorEntry.data.highRiskHours);
      }
    }
  };

  const processResponse = (response: PosteriorResponse) => {
    // Calculate risks from posteriors
    const risks = posteriorService.calculateHourlyRisks(response.hourly_posteriors);
    
    // Combine into hourly data
    const data: HourlyRiskData[] = response.hourly_posteriors.map((posterior, i) => ({
      hour: posterior.hour,
      risk: risks[i],
      mean: posterior.mean,
      std: posterior.std,
    }));
    
    setHourlyData(data);
    
    // Get high risk hours
    const highRisk = posteriorService.getHighRiskHours(response.hourly_posteriors, 3);
    setHighRiskHours(highRisk);
    
    setLoading(false);
  };

  return {
    loading,
    hourlyData,
    highRiskHours,
    error,
    refetch: fetchPosterior,
  };
}

/**
 * Hook for displaying hourly risk timeline
 * Formats data for visualization components
 */
export function useHourlyRiskTimeline(checkData?: QuickCheckData) {
  const { loading, hourlyData, highRiskHours } = useHourlyPosterior(checkData);
  
  const timelineData = hourlyData.map((data: HourlyRiskData) => {
    const hour = data.hour;
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    
    return {
      hour: data.hour,
      time: `${displayHour}${period}`,
      risk: Math.round(data.risk * 100),
      riskLevel: data.risk < 0.3 ? 'low' : data.risk < 0.6 ? 'moderate' : 'high',
      isHighRisk: highRiskHours.includes(data.hour),
    };
  });
  
  return {
    loading,
    timelineData,
    highRiskHours,
  };
}
