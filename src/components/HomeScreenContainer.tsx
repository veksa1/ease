/**
 * HomeScreen Container - Ticket 015
 * 
 * Wraps HomeScreen component with live demo data from hooks.
 * Connects QuickCheck to update risk dynamically.
 */

import React, { useState, useEffect } from 'react';
import { Coffee, Moon, Activity, Heart } from 'lucide-react';
import { HomeScreen } from './HomeScreen';
import { useRiskPrediction, useTodayMetrics } from '../hooks/useDemoData';
import { usePersonalMigraineProfile } from '../hooks/usePersonalMigraineProfile';
import { sqliteService } from '../services/sqliteService';
import { RiskVariable } from '../types';
import { profileToRiskVariables } from '../utils/profileToRiskVariables';

interface HomeScreenContainerProps {
  onQuickCheckClick?: () => void;
  onInsightsClick?: () => void;
  onSootheModeClick?: (riskVariables: RiskVariable[], riskPercentage: number) => void;
  lowStimulationMode?: boolean;
}

export function HomeScreenContainer({
  onQuickCheckClick,
  onInsightsClick,
  onSootheModeClick,
  lowStimulationMode = false,
}: HomeScreenContainerProps) {
  // Get live risk prediction
  const { loading, risk, bounds, isBackendConnected } = useRiskPrediction();
  
  // Get today's metrics
  const metrics = useTodayMetrics();
  
  // Get personal migraine profile from database
  const { profile, loading: profileLoading } = usePersonalMigraineProfile();
  
  // Get streak count from SQLite
  const [streakCount, setStreakCount] = useState(7);
  
  // Get today's data from database
  const [dbData, setDbData] = useState<any>(null);
  const [baselineHRV, setBaselineHRV] = useState<number | null>(null);
  
  useEffect(() => {
    sqliteService.getSetting('streak_count').then(value => {
      if (value) {
        setStreakCount(parseInt(value, 10));
      }
    });
    
    // Fetch today's timeline data
    const today = new Date().toISOString().split('T')[0];
    sqliteService.getTimelineEntries(today).then(entries => {
      const rawContent = entries[0]?.content;
      if (!rawContent) {
        return;
      }

      try {
        const data = JSON.parse(rawContent);
        setDbData(data);
      } catch (error) {
        console.warn('[HomeScreenContainer] Unable to parse timeline JSON', error);
      }
    });
  }, []);

  // Determine risk level from percentage - now using actual backend prediction
  const riskPercentage = Math.round(risk * 100);
  const riskLevel: 'low' | 'moderate' | 'high' = 
    riskPercentage < 30 ? 'low' : 
    riskPercentage < 60 ? 'moderate' : 'high';

  // Calculate confidence from bounds (narrower interval = higher confidence)
  // Confidence is inversely related to the width of the interval
  const intervalWidth = bounds.upper - bounds.lower;
  const confidence = Math.round(Math.max(0, Math.min(100, 100 - (intervalWidth * 100))));

  // Contextual action based on risk
  const contextualAction = {
    icon: Activity, // Placeholder icon (won't be rendered)
    label: riskLevel === 'low' ? 'Keep up the good habits!' :
           riskLevel === 'moderate' ? 'Consider a breathing break' :
           'Take it easy today'
  };

  // Show loading skeleton
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-48 h-48 rounded-full bg-muted animate-pulse mx-auto" />
          <p className="text-label text-muted-foreground">Loading your risk...</p>
        </div>
      </div>
    );
  }

  // Helpers for formatting
  const formatHours = (hours: unknown): string | null => {
    const num = typeof hours === 'string' ? parseFloat(hours) : (hours as number);
    if (!Number.isFinite(num)) return null;
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };
  const isZeroDisplay = (s?: string): boolean => {
    if (!s || typeof s !== 'string') return false;
    const t = s.trim();
    return /^0h(\s*0m)?$/i.test(t);
  };

  // Realistic fallbacks if DB and demo metrics are unavailable
  const realisticFallbacks = {
    sleep: '7h',
    screenTime: '2h',
    hrvChange: '+3 ms',
    hrvTrend: 'up' as 'up' | 'down',
  };

  // Derive today's values from DB with fallbacks to demo metrics
  let derivedSleep = realisticFallbacks.sleep;
  const dbSleep = formatHours(dbData?.sleep_duration_hours);
  if (dbSleep) derivedSleep = dbSleep;
  else if (metrics.sleep && !isZeroDisplay(metrics.sleep)) derivedSleep = metrics.sleep;

  let derivedScreenTime = realisticFallbacks.screenTime;
  const dbScreen = formatHours(dbData?.screen_time_hours);
  if (dbScreen) derivedScreenTime = dbScreen;
  else if (metrics.screenTime && !isZeroDisplay(metrics.screenTime)) derivedScreenTime = metrics.screenTime;

  let derivedTrend: 'up' | 'down' = realisticFallbacks.hrvTrend;
  let derivedChange = realisticFallbacks.hrvChange;
  if (typeof dbData?.hrv_change === 'number') {
    const delta = dbData.hrv_change as number;
    derivedTrend = delta >= 0 ? 'up' : 'down';
    derivedChange = `${delta >= 0 ? '+' : ''}${Math.round(delta)} ms`;
  } else if (typeof dbData?.hrv === 'number' && baselineHRV != null) {
    const delta = (dbData.hrv as number) - baselineHRV;
    derivedTrend = delta >= 0 ? 'up' : 'down';
    derivedChange = `${delta >= 0 ? '+' : ''}${Math.round(delta)} ms`;
  } else if (typeof dbData?.hrv === 'number') {
    derivedTrend = 'up';
    derivedChange = `${Math.round(dbData.hrv as number)} ms`;
  } else {
    // Keep realistic fallback
    derivedTrend = realisticFallbacks.hrvTrend;
    derivedChange = realisticFallbacks.hrvChange;
  }

  const todayData = {
    sleepDuration: derivedSleep,
    hrvTrend: derivedTrend as 'up' | 'down',
    hrvChange: derivedChange,
    screenTime: derivedScreenTime,
    upcomingStressor: dbData?.upcoming_stressor ?? undefined,
  };

  // Risk contributors (simplified for demo)
  const riskContributors = [
    { label: 'Good sleep', percentage: 40, icon: Moon },
    { label: 'Normal HRV', percentage: 35, icon: Activity },
    { label: 'Low stress', percentage: 25, icon: Heart },
  ];

  const whatHelps = ['Stay active', 'Maintain routine', 'Monitor triggers'];

  // Comprehensive risk variables combining database values + personal profile from DB
  const riskVariables: RiskVariable[] = dbData ? [
    // Environmental factors from database
    { name: 'Barometric Pressure Change', percentage: 28, category: 'environmental', value: dbData.barometric_pressure_change || '-6', unit: 'hPa' },
    { name: 'Weather Changes', percentage: 14, category: 'environmental', value: 'Unstable', unit: '' },
    { name: 'Humidity', percentage: 11, category: 'environmental', value: dbData.humidity || '75', unit: '%' },
    { name: 'Temperature', percentage: 9, category: 'environmental', value: dbData.temperature || '22', unit: '°C' },
    { name: 'Air Quality Index', percentage: 6, category: 'environmental', value: dbData.air_quality_index || '85', unit: 'AQI' },
    { name: 'Base Pressure', percentage: 5, category: 'environmental', value: dbData.base_pressure || '1013', unit: 'hPa' },
    { name: 'Altitude', percentage: 3, category: 'environmental', value: dbData.altitude || '850', unit: 'm' },
    
    // Biometric factors from database
    { name: 'Sleep Quality', percentage: 22, category: 'biometric', value: dbData.sleep_quality ? dbData.sleep_quality.toFixed(1) : '4.5', unit: '/10' },
    { name: 'Sleep Duration', percentage: 15, category: 'biometric', value: dbData.sleep_duration_hours ? dbData.sleep_duration_hours.toFixed(1) : '6.5', unit: 'hrs' },
    { name: 'HRV', percentage: 12, category: 'biometric', value: dbData.hrv || '47', unit: 'ms' },
    { name: 'Resting Heart Rate', percentage: 10, category: 'biometric', value: dbData.resting_heart_rate || '72', unit: 'bpm' },
    { name: 'Body temperature change', percentage: 8, category: 'biometric', value: dbData.body_temperature_change ? `+${dbData.body_temperature_change.toFixed(1)}` : '+0.4', unit: '°C' },
    { name: 'Activity Level', percentage: 7, category: 'biometric', value: dbData.activity_level || '3200', unit: 'steps' },
    
    // Lifestyle factors from database
    { name: 'Prodrome Symptoms', percentage: 20, category: 'lifestyle', value: dbData.prodrome_symptoms ? 'Present' : 'Absent', unit: '' },
    { name: 'Stress Level', percentage: 18, category: 'lifestyle', value: dbData.stress_level ? dbData.stress_level.toFixed(1) : '8.5', unit: '/10' },
    { name: 'Screen Time', percentage: 8, category: 'lifestyle', value: dbData.screen_time_hours || '9', unit: 'hrs' },
    { name: 'Meal Regularity', percentage: 7, category: 'lifestyle', value: dbData.meal_regularity ? (dbData.meal_regularity < 0.7 ? 'Irregular' : 'Regular') : 'Irregular', unit: '' },
    { name: 'Caffeine Intake change', percentage: 6, category: 'lifestyle', value: dbData.caffeine_intake_change ? `+${dbData.caffeine_intake_change * 100}` : '+150', unit: 'mg' },
    { name: 'Alcohol Intake', percentage: 5, category: 'lifestyle', value: dbData.alcohol_intake || '1', unit: 'drink' },
    { name: 'Water Intake', percentage: 16, category: 'lifestyle', value: dbData.water_intake ? (dbData.water_intake / 1000).toFixed(1) : '1.8', unit: 'L' },
    
    // Personal factors from database
    ...profileToRiskVariables(profile),
  ] : [
    // Fallback to hardcoded values if no database data
    // Environmental factors (hardcoded)
    { name: 'Barometric Pressure Change', percentage: 28, category: 'environmental', value: '-6', unit: 'hPa' },
    { name: 'Weather Changes', percentage: 14, category: 'environmental', value: 'Unstable', unit: '' },
    { name: 'Humidity', percentage: 11, category: 'environmental', value: '75', unit: '%' },
    { name: 'Temperature', percentage: 9, category: 'environmental', value: '22', unit: '°C' },
    { name: 'Air Quality Index', percentage: 6, category: 'environmental', value: '85', unit: 'AQI' },
    { name: 'Base Pressure', percentage: 5, category: 'environmental', value: '1013', unit: 'hPa' },
    { name: 'Altitude', percentage: 3, category: 'environmental', value: '850', unit: 'm' },
    
    // Biometric factors (hardcoded)
    { name: 'Sleep Quality', percentage: 22, category: 'biometric', value: '4.5', unit: '/10' },
    { name: 'Sleep Duration', percentage: 15, category: 'biometric', value: '6.5', unit: 'hrs' },
    { name: 'HRV', percentage: 12, category: 'biometric', value: '47', unit: 'ms' },
    { name: 'Resting Heart Rate', percentage: 10, category: 'biometric', value: '72', unit: 'bpm' },
    { name: 'Body temperature change', percentage: 8, category: 'biometric', value: '+0.4', unit: '°C' },
    { name: 'Activity Level', percentage: 7, category: 'biometric', value: '3200', unit: 'steps' },
    
    // Lifestyle factors (hardcoded)
    { name: 'Prodrome Symptoms', percentage: 20, category: 'lifestyle', value: 'Present', unit: '' },
    { name: 'Stress Level', percentage: 18, category: 'lifestyle', value: '8.5', unit: '/10' },
    { name: 'Screen Time', percentage: 8, category: 'lifestyle', value: '9', unit: 'hrs' },
    { name: 'Meal Regularity', percentage: 7, category: 'lifestyle', value: 'Irregular', unit: '' },
    { name: 'Caffeine Intake change', percentage: 6, category: 'lifestyle', value: '+150', unit: 'mg' },
    { name: 'Alcohol Intake', percentage: 5, category: 'lifestyle', value: '1', unit: 'drink' },
    { name: 'Water Intake', percentage: 16, category: 'lifestyle', value: '1.8', unit: 'L' },
    
    // Personal factors from database
    ...profileToRiskVariables(profile),
  ];

  return (
    <HomeScreen
      userName="Sarah"
      riskLevel={riskLevel}
      riskPercentage={riskPercentage}
      confidence={confidence}
      contextualAction={contextualAction}
      streakCount={streakCount}
      todayData={todayData}
      riskContributors={riskContributors}
      riskVariables={riskVariables}
      whatHelps={whatHelps}
      onQuickCheckClick={onQuickCheckClick}
      onInsightsClick={onInsightsClick}
      onSootheModeClick={onSootheModeClick}
      lowStimulationMode={lowStimulationMode}
    />
  );
}
