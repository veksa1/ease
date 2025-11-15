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
import { sqliteService } from '../services/sqliteService';

interface HomeScreenContainerProps {
  onQuickCheckClick?: () => void;
  onInsightsClick?: () => void;
  onSootheModeClick?: () => void;
  lowStimulationMode?: boolean;
}

export function HomeScreenContainer({
  onQuickCheckClick,
  onInsightsClick,
  onSootheModeClick,
  lowStimulationMode = false,
}: HomeScreenContainerProps) {
  // Get live risk prediction
  const { loading, risk, bounds } = useRiskPrediction();
  
  // Get today's metrics
  const metrics = useTodayMetrics();
  
  // Get streak count from SQLite
  const [streakCount, setStreakCount] = useState(7);
  
  useEffect(() => {
    sqliteService.getSetting('streak_count').then(value => {
      if (value) {
        setStreakCount(parseInt(value, 10));
      }
    });
  }, []);

  // Determine risk level from percentage
  const riskPercentage = Math.round(risk * 100);
  const riskLevel: 'low' | 'moderate' | 'high' = 
    riskPercentage < 30 ? 'low' : 
    riskPercentage < 60 ? 'moderate' : 'high';

  // Contextual action based on risk
  const contextualAction = {
    icon: Coffee,
    label: riskLevel === 'low' ? 'Keep up the good habits!' :
           riskLevel === 'moderate' ? 'Consider a breathing break' :
           'Take it easy today'
  };

  // Show loading skeleton
  if (loading) {
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

  return (
    <HomeScreen
      userName="Alex"
      riskLevel={riskLevel}
      riskPercentage={riskPercentage}
      contextualAction={contextualAction}
      streakCount={streakCount}
      todayData={todayData}
      riskContributors={riskContributors}
      whatHelps={whatHelps}
      onQuickCheckClick={onQuickCheckClick}
      onInsightsClick={onInsightsClick}
      onSootheModeClick={onSootheModeClick}
      lowStimulationMode={lowStimulationMode}
    />
  );
}
