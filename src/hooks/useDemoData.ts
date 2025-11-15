/**
 * React Hooks for Demo Data - Ticket 014
 * 
 * React hooks that provide data access throughout the app.
 * These hooks simulate loading states and provide typed data access.
 */

import { useState, useEffect } from 'react';
import { demoDataService } from '../services/demoDataService';
import { quickCheckToRiskAdjustment, type QuickCheckData } from '../services/featureConverter';
import type { Correlation, CalendarDay, HourlyRisk, UserTimelineEntry } from '../types/aline';

/**
 * Hook for current migraine risk prediction
 * 
 * Usage:
 * ```tsx
 * const { loading, risk, bounds, updateRiskWithQuickCheck } = useRiskPrediction();
 * ```
 */
export function useRiskPrediction() {
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<number>(0);
  const [bounds, setBounds] = useState({ lower: 0, upper: 0 });

  useEffect(() => {
    // Simulate loading delay for realistic UX
    const timer = setTimeout(() => {
      const { risk: r, lower, upper } = demoDataService.getCurrentRisk();
      setRisk(r);
      setBounds({ lower, upper });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Update risk based on QuickCheck responses
   */
  const updateRiskWithQuickCheck = (checkData: QuickCheckData) => {
    const adjustment = quickCheckToRiskAdjustment(checkData);
    const newRisk = Math.max(0, Math.min(1, risk + adjustment));
    
    setRisk(newRisk);
    
    // Add to timeline
    demoDataService.addTimelineEntry(
      new Date().toISOString(),
      'quick_check',
      checkData
    );
  };

  return { loading, risk, bounds, updateRiskWithQuickCheck };
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
    const data = demoDataService.getTimelineEntries(date);
    setEntries(data);
  }, [date]);

  const addEntry = (type: string, data: any) => {
    demoDataService.addTimelineEntry(date, type, data);
    setEntries(demoDataService.getTimelineEntries(date));
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
