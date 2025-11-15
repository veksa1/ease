### 🏠 `015_wire_homescreen_quickcheck.md`

# 🏠 Ticket 015 – Wire HomeScreen + QuickCheck to Live Demo Data

**Date:** 2025-11-15  
**Owner:** Frontend  
**Status:** 🔧 To Do  
**Goal:** Replace hardcoded risk values in HomeScreen with real predictions from demo data. Connect QuickCheckFlow to update risk dynamically using feature conversion. Add localStorage persistence for user actions.

---

## 🎯 Objective

Transform HomeScreen from static mock to dynamic demo:

* Replace hardcoded `riskPercentage={18}` with live prediction
* Show real-time risk updates after QuickCheck completion
* Persist streak count and user actions to localStorage
* Add loading states for polish
* Animate risk ring transitions
* Display today's actual metrics (sleep, HRV, screen time)

This enables:
- **Interactive demo** - Users see cause-and-effect
- **Realistic UX** - Loading states, smooth transitions
- **Persistence** - Streak survives page refresh
- **Core value prop** - "Your actions affect your risk"

---

## 📂 Inputs

| File                          | Description                        |
| ----------------------------- | ---------------------------------- |
| `src/components/HomeScreen.tsx` | Current HomeScreen (lines 500-600) |
| `src/components/QuickCheckFlow.tsx` | QuickCheck component |
| `src/hooks/useDemoData.ts`    | Data hooks from Ticket 014         |
| `src/data/demoUserAlex.json`  | Pre-computed predictions           |

---

## 🧩 Tasks

### 1. Update HomeScreen to Use Demo Data

Replace hardcoded values with hooks:

```typescript
// src/components/HomeScreen.tsx

import { useRiskPrediction, useTimeline } from '../hooks/useDemoData';
import { useState, useEffect } from 'react';

export function HomeScreen({
  userName = 'Alex',
  onQuickCheckClick,
  onInsightsClick,
  onSootheModeClick,
  showNotification = null,
  lowStimulationMode = false,
}: HomeScreenProps) {
  // Get live risk prediction
  const { loading, risk, bounds, updateRiskWithQuickCheck } = useRiskPrediction();
  
  // Get streak count from localStorage
  const [streakCount, setStreakCount] = useState(() => {
    const stored = localStorage.getItem('ease_streak_count');
    return stored ? parseInt(stored, 10) : 7;
  });

  // Today's data (can be enhanced with real calculations)
  const todayData = {
    sleep: '7h 32m',
    sleepTrend: 'up' as const,
    sleepChange: '+45m vs avg',
    hrv: 62,
    hrvTrend: 'up' as const,
    hrvChange: '+8% vs baseline',
    screenTime: '4h 12m',
    upcomingStressor: 'Team meeting at 2 PM',
  };

  // Determine risk level from percentage
  const riskPercentage = Math.round(risk * 100);
  const riskLevel: 'low' | 'medium' | 'high' = 
    riskPercentage < 30 ? 'low' : 
    riskPercentage < 60 ? 'medium' : 'high';

  // Contextual action based on risk
  const contextualAction = 
    riskLevel === 'low' ? 'Keep up the good habits!' :
    riskLevel === 'medium' ? 'Consider a breathing break' :
    'Take it easy today';

  // Handle QuickCheck completion
  const handleQuickCheckComplete = (checkData: any) => {
    // Update risk with QuickCheck data
    updateRiskWithQuickCheck(checkData);
    
    // Increment streak
    const newStreak = streakCount + 1;
    setStreakCount(newStreak);
    localStorage.setItem('ease_streak_count', newStreak.toString());
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Existing header code... */}
      
      {/* Risk Ring - now with live data */}
      <div className="relative pt-8 pb-4">
        <RiskRing
          riskLevel={riskLevel}
          riskPercentage={riskPercentage}
          bounds={{ lower: Math.round(bounds.lower * 100), upper: Math.round(bounds.upper * 100) }}
          animated={true}
        />
      </div>

      {/* Rest of component with live data... */}
      
      {/* QuickCheck button */}
      <Button
        onClick={() => onQuickCheckClick?.(handleQuickCheckComplete)}
        className="w-full h-12"
      >
        Quick check ({streakCount} day streak)
      </Button>
    </div>
  );
}
```

### 2. Update QuickCheckFlow to Trigger Updates

Pass completion callback to parent:

```typescript
// src/components/QuickCheckFlow.tsx

export function QuickCheckFlow({ 
  onComplete, 
  onBack, 
  streakCount = 5 
}: QuickCheckFlowProps) {
  // ... existing state ...

  const finish = () => {
    // Call parent callback with collected data
    onComplete?.(data);
    setStep('success');
  };

  // ... rest of component ...
}
```

### 3. Add Risk Ring Animation

Smooth transitions when risk updates:

```typescript
// src/components/RiskRing.tsx (enhance existing component)

import { useSpring, animated } from '@react-spring/web'; // Optional animation library

export function RiskRing({ riskLevel, riskPercentage, bounds, animated = false }) {
  // Animate percentage change
  const animatedPercentage = useSpring({
    value: riskPercentage,
    config: { tension: 180, friction: 20 }
  });

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-neutral-200 dark:text-neutral-800"
        />
        
        {/* Risk arc - animated */}
        <animated.circle
          cx="96"
          cy="96"
          r="88"
          fill="none"
          stroke={getRiskColor(riskLevel)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 88}`}
          strokeDashoffset={animatedPercentage.value.to(v => 
            2 * Math.PI * 88 * (1 - v / 100)
          )}
          className="transition-all duration-500"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <animated.span className="text-5xl font-bold">
          {animatedPercentage.value.to(v => Math.round(v))}%
        </animated.span>
        <span className="text-label text-muted-foreground">risk today</span>
        {bounds && (
          <span className="text-xs text-muted-foreground mt-1">
            {bounds.lower}–{bounds.upper}%
          </span>
        )}
      </div>
    </div>
  );
}
```

### 4. Add Demo Reset Button (Dev Mode)

Allow easy demo reset during testing:

```typescript
// src/components/HomeScreen.tsx

import { demoDataService } from '../services/demoDataService';

// Add to component (hidden in production)
const isDev = import.meta.env.DEV;

{isDev && (
  <button
    onClick={() => {
      if (confirm('Reset demo data?')) {
        demoDataService.resetDemo();
        setStreakCount(7);
        window.location.reload();
      }
    }}
    className="fixed bottom-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm z-50"
  >
    Reset Demo
  </button>
)}
```

### 5. Add Today's Metrics from Real Data

Calculate actual values from demo predictions:

```typescript
// src/hooks/useDemoData.ts

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
      const sleepHours = 7.2 - (prediction.latents.sleep_debt * 2);
      const hrvValue = Math.round(55 + (prediction.latents.stress * -20));
      
      setMetrics({
        sleep: `${Math.floor(sleepHours)}h ${Math.round((sleepHours % 1) * 60)}m`,
        hrv: hrvValue,
        screenTime: '4h 12m' // Could be computed from environmental latent
      });
    }
  }, []);

  return metrics;
}
```

---

## 🧠 Integration

* Depends on Ticket 014 (hooks and data service)
* Enables interactive demo experience
* Provides foundation for Ticket 016 (calendar) and Ticket 017 (insights)

---

## 🧪 Validation Checklist

* [ ] HomeScreen loads with real risk percentage from demo data
* [ ] QuickCheck completion updates risk percentage
* [ ] Risk ring animates smoothly on changes
* [ ] Streak count persists across page refreshes
* [ ] Loading state shows briefly on mount
* [ ] Confidence bounds display correctly
* [ ] Risk level (low/medium/high) updates with percentage
* [ ] Contextual action changes based on risk level
* [ ] Demo reset button clears localStorage
* [ ] No console errors or warnings

---

## ✅ Deliverables

* [ ] Updated `src/components/HomeScreen.tsx` with live data
* [ ] Updated `src/components/QuickCheckFlow.tsx` with callback
* [ ] Enhanced `src/components/RiskRing.tsx` with animation
* [ ] New hook `useTodayMetrics()` in `src/hooks/useDemoData.ts`
* [ ] localStorage persistence for streak and timeline
* [ ] Demo reset functionality for development

---

## 📝 Testing Script

```
1. Open app → HomeScreen shows risk from demo data (not 18%)
2. Click "Quick check" → Complete flow
3. Observe risk percentage change (should increase/decrease)
4. Refresh page → Streak count persists
5. Complete another check → Streak increments
6. Check localStorage → 'ease_streak_count' and 'ease_user_timeline' present
7. Click "Reset Demo" (dev mode) → All data clears
```

---

> *"From static to dynamic, one hook at a time."*

---
