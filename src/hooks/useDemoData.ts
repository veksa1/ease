/**
 * React Hooks for Demo Data - Ticket 014
 * 
 * React hooks that provide data access throughout the app.
 * These hooks simulate loading states and provide typed data access.
 */

import { useState, useEffect } from 'react';
import { demoDataService } from '../services/demoDataService';
import { quickCheckToRiskAdjustment, quickCheckToFeatures, type QuickCheckData } from '../services/featureConverter';
import { riskPredictionService } from '../services/riskPredictionService';
import { posteriorService, type HourlyPosterior, type PosteriorResponse } from '../services/posteriorService';
import type { PolicyResponse } from '../services/policyService';
import { userFeaturesService } from '../services/userFeaturesService';
import type { Correlation, CalendarDay, HourlyRisk, UserTimelineEntry } from '../types/aline';

/**
 * Hook for current migraine risk prediction
 * Fetches real predictions from the ALINE backend API
 * 
 * Usage:
 * ```tsx
 * const { loading, risk, bounds, isBackendConnected, updateRiskWithQuickCheck } = useRiskPrediction();
 * ```
 */
export function useRiskPrediction() {
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<number>(0);
  const [bounds, setBounds] = useState({ lower: 0, upper: 0 });
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  useEffect(() => {
    const fetchRiskPrediction = async () => {
      setLoading(true);
      
      // Check if backend is available
      const isHealthy = await riskPredictionService.checkHealth();
      
      if (isHealthy && useBackend) {
        // Fetch from backend API
        const userId = 'demo-user'; // In production, get from auth context
        
        // Use real user features from userFeaturesService (35 features)
        const features = await userFeaturesService.get24HourFeatures({
          userId,
          date: new Date(),
          includeCalendar: true,
          includeWeather: false,
        });
        
        const prediction = await riskPredictionService.getDailyRisk(userId, features);
        
        if (prediction) {
          setRisk(prediction.mean_probability);
          setBounds({
            lower: prediction.lower_bound,
            upper: prediction.upper_bound,
          });
          setIsBackendConnected(true);
          setLoading(false);
          return;
        }
      }
      
      // Fallback to demo data if backend unavailable
      console.log('Using demo data (backend unavailable or disabled)');
      setIsBackendConnected(false);
      const { risk: r, lower, upper } = demoDataService.getCurrentRisk();
      setRisk(r);
      setBounds({ lower, upper });
      setLoading(false);
    };

    fetchRiskPrediction();
  }, [useBackend]);

  /**
   * Update risk based on QuickCheck responses
   * Also fetches hourly posterior and policy recommendations if backend is available
   */
  const updateRiskWithQuickCheck = async (checkData: QuickCheckData) => {
    const adjustment = quickCheckToRiskAdjustment(checkData);
    const newRisk = Math.max(0, Math.min(1, risk + adjustment));
    
    setRisk(newRisk);
    
    // Add to timeline
    demoDataService.addTimelineEntry(
      new Date().toISOString(),
      'quick_check',
      checkData
    );
    
    let posteriorData = null;
    let policyData = null;
    
    // If backend is connected, fetch hourly posterior and policy recommendations
    if (isBackendConnected) {
      try {
        const features = quickCheckToFeatures(checkData, 20);
        const userId = 'demo-user';
        
        // Fetch posterior distributions
        posteriorData = await posteriorService.getHourlyPosterior(userId, features);
        
        if (posteriorData) {
          console.log('✅ Fetched hourly posterior from Quick Check data');
          console.log(`   Found ${posteriorData.hourly_posteriors.length} hourly predictions`);
          
          // Calculate high-risk hours
          const highRiskHours = posteriorService.getHighRiskHours(posteriorData.hourly_posteriors, 3);
          console.log(`   High risk hours: ${highRiskHours.join(', ')}`);
          
          // Store in timeline for later retrieval
          demoDataService.addTimelineEntry(
            new Date().toISOString(),
            'hourly_posterior',
            {
              posteriors: posteriorData.hourly_posteriors,
              highRiskHours,
            }
          );
        }
        
        // Fetch policy recommendations for information gain
        const { policyService } = await import('../services/policyService');
        policyData = await policyService.getTopKHours(userId, features, 3);
        
        if (policyData) {
          console.log('✅ Fetched policy recommendations');
          console.log(`   Top measurement hours: ${policyData.selected_hours.map(h => `${h.hour}h (score: ${h.priority_score.toFixed(2)})`).join(', ')}`);
        }
      } catch (error) {
        console.error('Failed to fetch hourly posterior or policy:', error);
      }
    }
    
    return {
      newRisk,
      posteriorData,
      policyData,
    };
  };

  return { loading, risk, bounds, isBackendConnected, updateRiskWithQuickCheck };
}

/**
 * Hook for calendar data
 * 
 * @param year Calendar year
 * @param month Calendar month (0-11)
 */
export function useCalendar(year: number, month: number) {
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const days = demoDataService.getCalendarMonth(year, month);
      setCalendarDays(days);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [year, month]);

  return { loading, calendarDays };
}

/**
 * Hook for hourly risk data
 * 
 * @param date ISO date string
 */
export function useHourlyRisk(date: string) {
  const [loading, setLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState<HourlyRisk[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const data = demoDataService.getHourlyRisk(date);
      setHourlyData(data);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [date]);

  return { loading, hourlyData };
}

/**
 * Hook for correlations/insights
 */
export function useCorrelations() {
  const [loading, setLoading] = useState(true);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = demoDataService.getCorrelations();
      setCorrelations(data);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return { loading, correlations };
}

/**
 * Hook for user timeline
 * 
 * @param date ISO date string
 */
export function useTimeline(date: string) {
  const [entries, setEntries] = useState<UserTimelineEntry[]>([]);

  useEffect(() => {
    demoDataService.getTimelineEntries(date).then(data => {
      setEntries(data);
    });
  }, [date]);

  const addEntry = async (type: string, data: any) => {
    await demoDataService.addTimelineEntry(date, type, data);
    const updated = await demoDataService.getTimelineEntries(date);
    setEntries(updated);
  };

  return { entries, addEntry };
}

/**
 * Hook for today's metrics
 * Calculates actual values from demo predictions
 */
export function useTodayMetrics() {
  const [metrics, setMetrics] = useState({
    sleep: '0h 0m',
    hrv: 0,
    screenTime: '0h 0m'
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const prediction = demoDataService.getPredictionByDate(today);
    
    if (prediction) {
      // Extract metrics from latents
      // Sleep debt affects sleep duration
      const sleepHours = 7.2 - (prediction.latents.sleep_debt * 2);
      const hours = Math.floor(Math.max(0, sleepHours));
      const mins = Math.round((sleepHours % 1) * 60);
      
      // Stress affects HRV negatively
      const hrvValue = Math.round(55 + (prediction.latents.stress * -20));
      
      // Environmental latent approximates screen time
      const screenHours = 4 + (prediction.latents.environmental * 2);
      const screenH = Math.floor(Math.max(0, screenHours));
      const screenM = Math.round((screenHours % 1) * 60);
      
      setMetrics({
        sleep: `${hours}h ${mins}m`,
        hrv: Math.max(30, Math.min(100, hrvValue)),
        screenTime: `${screenH}h ${screenM}m`
      });
    }
  }, []);

  return metrics;
}
