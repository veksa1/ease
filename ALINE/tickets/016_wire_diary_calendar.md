### 📅 `016_wire_diary_calendar.md`

# 📅 Ticket 016 – Wire DiaryScreen Calendar with Demo Data

**Date:** 2025-11-15  
**Owner:** Frontend  
**Status:** 🔧 To Do  
**Goal:** Replace hardcoded mock calendar data in DiaryScreen with real predictions from demo dataset. Connect DayDetailsScreen to show hourly risk curves and metrics from pre-computed data.

---

## 🎯 Objective

Transform DiaryScreen from static mock to dynamic calendar:

* Load 30 days of risk predictions for calendar grid
* Color-code days by risk level (low/medium/high)
* Show migraine events on calendar
* Display real hourly risk curves in DayDetailsScreen
* Show actual metrics (sleep, HRV, screen time) for each day
* Persist user notes and migraine reports to localStorage

This enables:
- **Historical view** - See risk patterns over time
- **Pattern recognition** - Visual correlation discovery
- **Migraine tracking** - Log attacks and see predictions
- **Drill-down** - Tap day for detailed hourly breakdown

---

## 📂 Inputs

| File                            | Description                        |
| ------------------------------- | ---------------------------------- |
| `src/components/DiaryScreen.tsx` | Calendar grid component (lines 1-150) |
| `src/components/DayDetailsScreen.tsx` | Day detail view |
| `src/hooks/useDemoData.ts`      | Data hooks from Ticket 014         |
| `src/data/demoUserAlex.json`    | Pre-computed predictions           |

---

## 🧩 Tasks

### 1. Update DiaryScreen to Load Calendar Data

Replace `mockDayData` with real predictions:

```typescript
// src/components/DiaryScreen.tsx

import { useCalendar, useTimeline } from '../hooks/useDemoData';
import { useState } from 'react';

export function DiaryScreen({ onBack, onNavigate, onExportPDF }: DiaryScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 10)); // November 2025
  const [selectedDay, setSelectedDay] = useState<number | null>(15);
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(['predictions', 'attacks', 'triggers']);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // Load calendar data for current month
  const { loading, calendarDays } = useCalendar(
    currentMonth.getFullYear(),
    currentMonth.getMonth()
  );

  // Convert calendar data to day data format
  const dayDataMap: Record<number, DayData> = {};
  
  calendarDays.forEach(day => {
    const dayNum = day.day;
    const { entries } = useTimeline(day.date);
    
    // Find migraine reports in timeline
    const migraineEntries = entries.filter(e => e.type === 'migraine_report');
    const hasAttack = day.hasAttack || migraineEntries.length > 0;
    
    // Extract triggers from entries
    const triggers: string[] = [];
    if (day.risk === 'high') triggers.push('high risk predicted');
    migraineEntries.forEach(entry => {
      if (entry.data.triggers) triggers.push(...entry.data.triggers);
    });

    dayDataMap[dayNum] = {
      day: dayNum,
      risk: day.risk,
      hasAttack,
      triggers,
      riskPercentage: day.riskPercentage,
      entries: entries.map(e => ({
        time: new Date(e.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        type: e.type as any,
        title: formatEntryTitle(e),
        details: formatEntryDetails(e)
      }))
    };
  });

  const selectedDayData = selectedDay ? dayDataMap[selectedDay] : null;

  // Loading state
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

  // ... rest of component with dayDataMap instead of mockDayData
}

// Helper functions
function formatEntryTitle(entry: any): string {
  switch (entry.type) {
    case 'quick_check':
      return 'Daily check-in completed';
    case 'migraine_report':
      return 'Migraine attack reported';
    case 'note':
      return entry.data.title || 'Note';
    default:
      return 'Activity';
  }
}

function formatEntryDetails(entry: any): string {
  switch (entry.type) {
    case 'quick_check':
      return `Caffeine: ${entry.data.caffeine.level}, Hydration: ${entry.data.water.amount}`;
    case 'migraine_report':
      return `Pain level: ${entry.data.painLevel}/10, Duration: ${entry.data.duration}`;
    case 'note':
      return entry.data.content;
    default:
      return '';
  }
}
```

### 2. Update DayDetailsScreen with Hourly Risk

Show real hourly predictions:

```typescript
// src/components/DayDetailsScreen.tsx

import { useHourlyRisk } from '../hooks/useDemoData';
import { useMemo } from 'react';

export function DayDetailsScreen({ 
  date, 
  dayNumber, 
  onBack, 
  onExportPDF 
}: DayDetailsScreenProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  
  // Load hourly risk for this day
  const { loading, hourlyData } = useHourlyRisk(date.toISOString());

  // Convert to chart data (extract risk percentages)
  const predictionData = useMemo(() => {
    if (!hourlyData.length) {
      // Fallback to mock data
      return [25, 28, 32, 35, 40, 45, 52, 58, 62, 68, 72, 75,
              78, 76, 74, 70, 65, 58, 52, 48, 42, 38, 32, 28];
    }
    return hourlyData.map(h => Math.round(h.risk * 100));
  }, [hourlyData]);

  // Calculate daily statistics
  const dailyStats = useMemo(() => {
    if (!hourlyData.length) return null;
    
    const risks = hourlyData.map(h => h.risk);
    const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
    const maxRisk = Math.max(...risks);
    const peakHour = risks.indexOf(maxRisk);
    
    return {
      average: Math.round(avgRisk * 100),
      peak: Math.round(maxRisk * 100),
      peakHour: `${peakHour}:00`
    };
  }, [hourlyData]);

  // Metric cards - could be enhanced with real data from prediction latents
  const metricCards: MetricCard[] = [
    {
      title: 'Sleep',
      icon: Moon,
      value: '6h 15m',
      subtitle: '78% efficiency',
      trend: 'down',
      trendValue: '-1.5h vs avg',
      quality: 'warning',
      details: [
        { label: 'Deep sleep', value: '1h 20m' },
        { label: 'REM', value: '1h 45m' },
        { label: 'Light', value: '3h 10m' },
      ],
    },
    // ... other metrics
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-label text-muted-foreground">Loading details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with daily stats */}
      <div className="border-b border-border bg-card">
        <div className="px-6 pt-6 pb-4">
          {/* ... existing header ... */}
          
          {dailyStats && (
            <div className="mt-4 flex gap-4 text-center">
              <div className="flex-1">
                <div className="text-h3">{dailyStats.average}%</div>
                <div className="text-label text-muted-foreground">Avg risk</div>
              </div>
              <div className="flex-1">
                <div className="text-h3">{dailyStats.peak}%</div>
                <div className="text-label text-muted-foreground">Peak risk</div>
              </div>
              <div className="flex-1">
                <div className="text-h3">{dailyStats.peakHour}</div>
                <div className="text-label text-muted-foreground">Peak time</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 24-hour prediction chart with real data */}
      <div className="px-6 pt-6">
        <h2 className="text-h2 mb-4">24-hour prediction</h2>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="h-48 flex items-end gap-0.5">
            {predictionData.map((risk, hour) => {
              const height = (risk / 100) * 100;
              const color = 
                risk > 60 ? 'bg-critical' :
                risk > 30 ? 'bg-warning' :
                'bg-success';
              
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full ${color} rounded-t transition-all hover:opacity-80`}
                    style={{ height: `${height}%` }}
                    title={`${hour}:00 - ${risk}% risk`}
                  />
                  {hour % 6 === 0 && (
                    <span className="text-xs text-muted-foreground">{hour}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rest of component... */}
    </div>
  );
}
```

### 3. Add Migraine Reporting

Allow users to log migraines:

```typescript
// src/components/DiaryScreen.tsx

const handleReportMigraine = (dayNumber: number) => {
  // This would open ReportMigraineFlow
  // For now, add to timeline
  const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
  demoDataService.addTimelineEntry(
    date.toISOString(),
    'migraine_report',
    {
      painLevel: 7,
      duration: '4 hours',
      triggers: ['stress', 'poor sleep'],
      medications: ['Sumatriptan 50mg']
    }
  );
};
```

### 4. Add Filter Functionality

Make filters actually work:

```typescript
// src/components/DiaryScreen.tsx

const filteredDays = Object.entries(dayDataMap).filter(([dayNum, dayData]) => {
  if (activeFilters.length === 0) return true;
  
  let matches = false;
  if (activeFilters.includes('predictions') && dayData.risk) matches = true;
  if (activeFilters.includes('attacks') && dayData.hasAttack) matches = true;
  if (activeFilters.includes('triggers') && dayData.triggers && dayData.triggers.length > 0) matches = true;
  
  return matches;
});
```

### 5. Add Month Navigation

Load different months:

```typescript
// src/components/DiaryScreen.tsx

const changeMonth = (delta: number) => {
  const newDate = new Date(currentMonth);
  newDate.setMonth(newDate.getMonth() + delta);
  setCurrentMonth(newDate);
  setSelectedDay(null); // Clear selection
  
  // Data will auto-reload via useCalendar dependency
};
```

---

## 🧠 Integration

* Depends on Ticket 014 (data hooks)
* Works alongside Ticket 015 (HomeScreen)
* Provides historical view for Ticket 017 (insights)

---

## 🧪 Validation Checklist

* [ ] Calendar loads with 30 days of risk data
* [ ] Days color-coded correctly (green/yellow/red)
* [ ] Migraine days show attack indicator
* [ ] Tapping day shows DayDetailsScreen
* [ ] Hourly chart displays 24-hour risk curve
* [ ] Daily stats (avg, peak) calculate correctly
* [ ] Month navigation loads different data
* [ ] Filters work (predictions, attacks, triggers)
* [ ] Timeline entries display in day view
* [ ] Loading states show during data fetch
* [ ] No console errors

---

## ✅ Deliverables

* [ ] Updated `src/components/DiaryScreen.tsx` with live calendar
* [ ] Updated `src/components/DayDetailsScreen.tsx` with hourly data
* [ ] Filter functionality implemented
* [ ] Month navigation working
* [ ] Timeline integration for user entries
* [ ] Loading states for smooth UX

---

## 📝 Testing Script

```
1. Open DiaryScreen → See November 2025 calendar with colored dots
2. Verify days 3, 7, 12, 15, 21, 27 show migraine indicators
3. Tap day 15 → See DayDetailsScreen with hourly chart
4. Verify chart shows realistic risk curve (not flat)
5. Tap "< October" → Calendar loads previous month
6. Toggle filters → See days filter correctly
7. Complete QuickCheck on current day → See entry in timeline
8. Refresh page → Calendar data persists
```

---

> *"The calendar is the canvas of patterns."*

---
