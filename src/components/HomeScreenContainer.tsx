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
  
  useEffect(() => {
    sqliteService.getSetting('streak_count').then(value => {
      if (value) {
        setStreakCount(parseInt(value, 10));
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

  // Today's data from metrics
  const todayData = {
    sleepDuration: metrics.sleep,
    hrvTrend: 'up' as const,
    hrvChange: '+8%',
    screenTime: metrics.screenTime,
  };

  // Risk contributors (simplified for demo)
  const riskContributors = [
    { label: 'Good sleep', percentage: 40, icon: Moon },
    { label: 'Normal HRV', percentage: 35, icon: Activity },
    { label: 'Low stress', percentage: 25, icon: Heart },
  ];

  const whatHelps = ['Stay active', 'Maintain routine', 'Monitor triggers'];

  // Comprehensive risk variables combining hardcoded environmental/biometric/lifestyle + personal profile from DB
  const riskVariables: RiskVariable[] = [
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
    { name: 'Water Intake', percentage: 4, category: 'lifestyle', value: '1.8', unit: 'L' },
    
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
