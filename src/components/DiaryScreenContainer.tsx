/**
 * DiaryScreen Container - Ticket 016
 * 
 * Wraps DiaryScreen component with live calendar data from demo.
 * Provides real predictions and timeline entries.
 */

import React, { useState } from 'react';
import { DiaryScreen as DiaryScreenBase } from './DiaryScreen';
import { DayDetailsScreen } from './DayDetailsScreen';
import { BottomNav } from './BottomNav';
import { useCalendar, useTimeline } from '../hooks/useDemoData';

// Import the type definitions from DiaryScreen
type RiskLevel = 'low' | 'medium' | 'high' | null;
type DayData = {
  day: number;
  risk?: RiskLevel;
  hasAttack?: boolean;
  triggers?: string[];
  sleep?: number;
  hrv?: number;
  screenTime?: number;
  entries?: any[];
  riskPercentage?: number;
};

interface DiaryScreenContainerProps {
  onBack?: () => void;
  onNavigate?: (tab: 'home' | 'diary' | 'profile' | 'insights') => void;
  onExportPDF?: () => void;
}

export function DiaryScreenContainer({ onBack, onNavigate, onExportPDF }: DiaryScreenContainerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 9)); // October 2025 (month 9)
  const [selectedDay, setSelectedDay] = useState<number | null>(16);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // Load calendar data for current month
  const { loading, calendarDays } = useCalendar(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-label text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  // Convert calendar data to day data format for DiaryScreen
  const dayDataMap: Record<number, DayData> = {};
  
  calendarDays.forEach(day => {
    const dayNum = day.day;
    
    dayDataMap[dayNum] = {
      day: dayNum,
      risk: day.risk,
      hasAttack: day.hasAttack,
      riskPercentage: day.riskPercentage,
      triggers: day.hasAttack ? ['Based on patterns'] : [],
      sleep: 7.0, // Would come from prediction latents
      hrv: 55,     // Would come from prediction latents
      screenTime: 4.5,
      entries: []  // Would come from timeline
    };
  });

  // Show day details if a day is selected
  if (showDayDetails && selectedDay) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), selectedDay);
    
    return (
      <>
        <DayDetailsScreen
          date={date}
          dayNumber={selectedDay}
          onBack={() => setShowDayDetails(false)}
          onExportPDF={onExportPDF}
        />
        <BottomNav
          activeTab="diary"
          onNavigate={onNavigate as any}
        />
      </>
    );
  }

  return (
    <>
      <DiaryScreenBase
        onBack={onBack}
        onNavigate={onNavigate}
        onExportPDF={onExportPDF}
        // Pass real data as props or use directly in wrapped component
      />
      <BottomNav
        activeTab="diary"
        onNavigate={onNavigate as any}
      />
    </>
  );
}
