### 🔌 `014_client_side_data_service.md`

# 🔌 Ticket 014 – Client-Side Data Service Layer

**Date:** 2025-11-15  
**Owner:** Frontend / Data  
**Status:** 🔧 To Do  
**Goal:** Create a client-side data service that loads pre-computed demo predictions and provides React hooks for consuming data throughout the app. Includes feature conversion utilities for QuickCheck inputs and localStorage persistence.

---

## 🎯 Objective

Build a data layer that:

* Loads `demoUserAlex.json` and provides typed access
* Exposes React hooks matching the original API design (seamless migration path)
* Converts user inputs (QuickCheck, migraine reports) to feature vectors
* Persists user timeline to localStorage for demo continuity
* Simulates loading states for realistic UX
* Enables future migration to real API with minimal changes

This enables:
- **Instant predictions** - Pre-computed data loads in milliseconds
- **Offline-first** - Works without internet connection
- **Type safety** - Full TypeScript support
- **Realistic UX** - Simulated loading for polish
- **Easy migration** - Hooks interface matches future API

---

## 📂 Inputs

| File                           | Description                       |
| ------------------------------ | --------------------------------- |
| `src/data/demoUserAlex.json`   | Pre-computed demo dataset         |
| `src/utils/api.ts`             | Existing API client (reference)   |
| `ALINE/service/schemas.py`     | Backend schema (for types)        |

---

## 🧩 Tasks

### 1. Create TypeScript Types

```typescript
// src/types/aline.ts

export interface DemoUser {
  user_id: string;
  name: string;
  email: string;
  start_date: string;
  profile: {
    age: number;
    baseline_hrv: number;
    avg_sleep: number;
    stress_level: string;
  };
}

export interface HourlyRisk {
  hour: number;
  risk: number;
  lower: number;
  upper: number;
}

export interface DailyPrediction {
  day: number;
  date: string;
  daily_risk: {
    mean: number;
    lower: number;
    upper: number;
  };
  hourly_risks: HourlyRisk[];
  latents: {
    stress: number;
    sleep_debt: number;
    hormonal: number;
    environmental: number;
  };
  has_migraine: boolean;
}

export interface Correlation {
  id: string;
  label: string;
  strength: number;
  explanation: string;
}

export interface CalendarDay {
  day: number;
  date: string;
  risk: 'low' | 'medium' | 'high';
  hasAttack: boolean;
  riskPercentage: number;
}

export interface DemoDataset {
  user: DemoUser;
  predictions: DailyPrediction[];
  correlations: Correlation[];
  calendar: CalendarDay[];
  generated_at: string;
  model_version: string;
}

// User timeline (stored in localStorage)
export interface UserTimelineEntry {
  date: string;
  type: 'quick_check' | 'migraine_report' | 'note';
  data: any;
}
```

### 2. Create Demo Data Service

```typescript
// src/services/demoDataService.ts

import demoData from '../data/demoUserAlex.json';
import type { DemoDataset, DailyPrediction, Correlation, CalendarDay } from '../types/aline';

class DemoDataService {
  private data: DemoDataset;
  private userTimeline: Map<string, any[]>;

  constructor() {
    this.data = demoData as DemoDataset;
    this.loadTimeline();
  }

  // Load user timeline from localStorage
  private loadTimeline() {
    const stored = localStorage.getItem('ease_user_timeline');
    if (stored) {
      this.userTimeline = new Map(JSON.parse(stored));
    } else {
      this.userTimeline = new Map();
    }
  }

  // Save timeline to localStorage
  private saveTimeline() {
    localStorage.setItem(
      'ease_user_timeline',
      JSON.stringify(Array.from(this.userTimeline.entries()))
    );
  }

  // Get prediction for a specific date
  getPredictionByDate(date: string): DailyPrediction | null {
    return this.data.predictions.find(p => p.date.startsWith(date)) || null;
  }

  // Get current risk (latest prediction)
  getCurrentRisk(): { risk: number; lower: number; upper: number } {
    const latest = this.data.predictions[this.data.predictions.length - 1];
    return {
      risk: latest.daily_risk.mean,
      lower: latest.daily_risk.lower,
      upper: latest.daily_risk.upper
    };
  }

  // Get hourly risk for a date
  getHourlyRisk(date: string): HourlyRisk[] {
    const prediction = this.getPredictionByDate(date);
    return prediction?.hourly_risks || [];
  }

  // Get calendar data for a month
  getCalendarMonth(year: number, month: number): CalendarDay[] {
    return this.data.calendar.filter(day => {
      const d = new Date(day.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  // Get all correlations
  getCorrelations(): Correlation[] {
    return this.data.correlations;
  }

  // Add entry to user timeline
  addTimelineEntry(date: string, type: string, data: any) {
    const dateKey = date.split('T')[0];
    if (!this.userTimeline.has(dateKey)) {
      this.userTimeline.set(dateKey, []);
    }
    this.userTimeline.get(dateKey)!.push({ type, data, timestamp: new Date().toISOString() });
    this.saveTimeline();
  }

  // Get timeline entries for a date
  getTimelineEntries(date: string) {
    const dateKey = date.split('T')[0];
    return this.userTimeline.get(dateKey) || [];
  }

  // Reset demo (clear localStorage)
  resetDemo() {
    localStorage.removeItem('ease_user_timeline');
    this.userTimeline.clear();
  }
}

// Export singleton
export const demoDataService = new DemoDataService();
```

### 3. Create Feature Converter

```typescript
// src/services/featureConverter.ts

import type { QuickCheckData } from '../components/QuickCheckFlow';

/**
 * Convert QuickCheck answers to feature adjustments
 * These are simple heuristics for demo purposes
 */
export function quickCheckToRiskAdjustment(checkData: QuickCheckData): number {
  let adjustment = 0;

  // Caffeine impact
  if (checkData.caffeine.level === 'lot') {
    adjustment += 0.05; // +5% risk
  } else if (checkData.caffeine.level === 'none') {
    adjustment -= 0.02; // -2% risk (if user usually has caffeine)
  }

  // Hydration impact
  if (checkData.water.amount === 'none' || checkData.water.amount === 'low') {
    adjustment += 0.03; // +3% risk
  } else if (checkData.water.amount === 'high') {
    adjustment -= 0.02; // -2% risk
  }

  // Food regularity impact
  if (checkData.food.level < 4) {
    adjustment += 0.04; // +4% risk for poor eating
  }

  return Math.max(-0.15, Math.min(0.15, adjustment)); // Clamp to ±15%
}

/**
 * Convert migraine report to severity score
 */
export function migraineReportToSeverity(report: any): number {
  // Simple scoring based on pain level and symptoms
  let severity = 0;

  if (report.painLevel >= 7) severity += 0.8;
  else if (report.painLevel >= 4) severity += 0.5;
  else severity += 0.3;

  if (report.hasNausea) severity += 0.1;
  if (report.hasPhotophobia) severity += 0.1;

  return Math.min(1.0, severity);
}

/**
 * Calculate sleep impact on risk
 */
export function sleepToRiskAdjustment(sleepHours: number): number {
  if (sleepHours < 6) return 0.08; // +8% risk
  if (sleepHours < 7) return 0.03; // +3% risk
  if (sleepHours > 9) return 0.02; // +2% risk (oversleep)
  return 0; // Normal sleep
}
```

### 4. Create React Hooks

```typescript
// src/hooks/useDemoData.ts

import { useState, useEffect } from 'react';
import { demoDataService } from '../services/demoDataService';
import { quickCheckToRiskAdjustment } from '../services/featureConverter';
import type { QuickCheckData } from '../components/QuickCheckFlow';

/**
 * Hook for current migraine risk prediction
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

  const updateRiskWithQuickCheck = (checkData: QuickCheckData) => {
    const adjustment = quickCheckToRiskAdjustment(checkData);
    const newRisk = Math.max(0, Math.min(1, risk + adjustment));
    
    setRisk(newRisk);
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
 */
export function useCalendar(year: number, month: number) {
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);

  useEffect(() => {
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
 */
export function useHourlyRisk(date: string) {
  const [loading, setLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState<any[]>([]);

  useEffect(() => {
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
  const [correlations, setCorrelations] = useState<any[]>([]);

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
 */
export function useTimeline(date: string) {
  const [entries, setEntries] = useState<any[]>([]);

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
```

---

## 🧠 Integration

* Used by Ticket 015 (HomeScreen), Ticket 016 (DiaryScreen), Ticket 017 (InsightsScreen)
* Replaces direct API calls with local data service
* Maintains same hook interface for easy API migration later
* localStorage provides persistence across sessions

---

## 🧪 Validation Checklist

* [ ] All hooks return data in expected format
* [ ] Loading states simulate realistic delays (200-300ms)
* [ ] QuickCheck adjustments affect risk appropriately
* [ ] Timeline persists across page refreshes
* [ ] `resetDemo()` clears all localStorage data
* [ ] TypeScript types match demo data structure
* [ ] No console errors when loading data
* [ ] Works offline (no network requests)

---

## ✅ Deliverables

* [ ] `src/types/aline.ts` - TypeScript type definitions
* [ ] `src/services/demoDataService.ts` - Data service singleton
* [ ] `src/services/featureConverter.ts` - Feature conversion utilities
* [ ] `src/hooks/useDemoData.ts` - React hooks for components
* [ ] `src/data/README.md` - Documentation for data structure

---

> *"Hooks hide complexity, expose simplicity."*

---
