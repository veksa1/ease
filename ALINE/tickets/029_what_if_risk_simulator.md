# 🎮 Ticket 029 – Real-Time "What-If" Risk Simulator

**Date:** 2025-11-16  
**Owner:** Frontend  
**Status:** 🔧 To Do  
**Priority:** High  
**Effort:** Medium (2-3 days)  
**Epic:** Feature Enhancement - Phase 1

---

## 🎯 Objective

Transform Quick Check from passive data entry to **interactive risk simulator** showing live "what-if" scenarios as users adjust their behaviors.

**Key Result:** Users see "Current: 45% → If you sleep 8hrs: 32% ↓13%" in real-time, empowering informed decisions about migraine prevention.

---

## 📊 Background

**Current State:**
- Quick Check collects data (caffeine, water, food)
- Shows final risk after submission
- Users don't see impact of their choices

**Target Experience:**
```
Quick Check - Step 1: Sleep
┌─────────────────────────────────┐
│ How many hours did you sleep?   │
│ [slider: 6 hours]               │
│                                 │
│ Current risk: 45%               │
│ → If 8 hours: 35% ↓10%         │
└─────────────────────────────────┘

[Sticky Footer]
💡 Top changes to reduce risk:
• Sleep 8 hours: -10%
• Drink 2L water: -8%
• Skip 3pm coffee: -5%
```

**Why This Matters:**
- **Actionable insight** > raw data collection
- **Behavior change** through immediate feedback
- **User engagement** via gamification

---

## 📂 Dependencies

**Existing Code:**
- `src/components/QuickCheckFlow.tsx` - Quick Check UI
- `src/services/featureConverter.ts` - Convert UI → features
- `src/services/userFeaturesService.ts` - Real user feature collection (from Ticket 027)
- `src/services/riskPredictionService.ts` - Risk API
- `src/hooks/useDemoData.ts` - Risk prediction hook

**New Files:**
- `src/hooks/useWhatIfSimulator.ts` - Real-time what-if calculations
- `src/components/WhatIfImpactCard.tsx` - Show delta between scenarios
- `src/utils/debounce.ts` - Debounce API calls (500ms)

**APIs:**
- `POST /risk/daily` (existing backend endpoint)
- `POST /risk/compare` (NEW - for efficient what-if comparisons)

**⚠️ CRITICAL CHANGE - Real-Time Backend Calls:**
Every slider adjustment triggers backend prediction (debounced).
No client-side approximations - all risk calculations from ALINE model.

---

## 🧩 Tasks

### 1. Create What-If API Endpoint (Backend - Optional)

**File:** `ALINE/service/main.py`

```python
@app.post("/risk/compare")
async def compare_risk_scenarios(
    request: RiskCompareRequest,
    db: Session = Depends(get_db)
) -> RiskCompareResponse:
    """
    Compare risk between baseline and modified scenarios.
    More efficient than calling /risk/daily twice.
    
    Request:
    {
        "user_id": "...",
        "baseline_features": [[...], ...],  // 24 x 35
        "scenarios": [
            {
                "label": "Sleep 8 hours",
                "feature_deltas": {0: 1.5},  // Index 0 (sleep) += 1.5 hours
            },
            {
                "label": "Drink more water",
                "feature_deltas": {7: 0.5},  // Index 7 (water) += 0.5 L
            }
        ]
    }
    
    Response:
    {
        "baseline_risk": 0.45,
        "scenarios": [
            {"label": "Sleep 8 hours", "risk": 0.35, "delta": -0.10},
            {"label": "Drink more water", "risk": 0.42, "delta": -0.03}
        ]
    }
    """
    baseline_risk = compute_risk(request.baseline_features)
    
    scenario_results = []
    for scenario in request.scenarios:
        # Apply feature deltas
        modified_features = apply_deltas(
            request.baseline_features,
            scenario.feature_deltas
        )
        
        # Compute new risk
        scenario_risk = compute_risk(modified_features)
        
        scenario_results.append({
            "label": scenario.label,
            "risk": scenario_risk,
            "delta": scenario_risk - baseline_risk,
        })
    
    return RiskCompareResponse(
        baseline_risk=baseline_risk,
        scenarios=scenario_results,
    )
```

**Benefits of `/risk/compare`:**
- Single API call for multiple scenarios
- Batch processing more efficient
- Consistent baseline across comparisons
- Reduced latency (1 call vs. 4+ calls)

**If backend endpoint unavailable:** Fall back to multiple `/risk/daily` calls

---

### 2. Create What-If Simulator Hook

**File:** `src/hooks/useWhatIfSimulator.ts`

```typescript
/**
 * What-If Simulator Hook
 * 
 * Provides real-time risk calculations as user adjusts behaviors.
 * Uses REAL user data as baseline, NOT mock data.
 */

import { useState, useCallback, useEffect } from 'react';
import { userFeaturesService } from '../services/userFeaturesService';
import { riskPredictionService } from '../services/riskPredictionService';
import { debounce } from '../utils/debounce';

export interface WhatIfScenario {
  label: string;
  icon: string;
  featureDeltas: Record<number, number>; // Feature index → delta value
}

export interface WhatIfResult {
  label: string;
  risk: number;
  delta: number; // Difference from baseline
}

export function useWhatIfSimulator(userId: string) {
  const [baselineRisk, setBaselineRisk] = useState<number | null>(null);
  const [baselineFeatures, setBaselineFeatures] = useState<number[][] | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load baseline from real user data
  useEffect(() => {
    const loadBaseline = async () => {
      try {
        // Get current user features (NO MOCK DATA)
        const features = await userFeaturesService.get24HourFeatures({
          userId,
          date: new Date(),
          includeCalendar: true,
          includeWeather: true,
        });

        setBaselineFeatures(features);

        // Get baseline risk
        const prediction = await riskPredictionService.getDailyRisk(userId, features);
        if (prediction) {
          setBaselineRisk(prediction.mean_probability);
        }
      } catch (err) {
        setError('Failed to load baseline risk');
        console.error(err);
      }
    };

    loadBaseline();
  }, [userId]);

  // Calculate what-if scenarios (debounced)
  const calculateScenarios = useCallback(
    debounce(async (whatIfScenarios: WhatIfScenario[]) => {
      if (!baselineFeatures || baselineRisk === null) {
        console.warn('Baseline not loaded yet');
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        const results: WhatIfResult[] = [];

        for (const scenario of whatIfScenarios) {
          // Apply feature deltas to baseline
          const modifiedFeatures = applyDeltas(baselineFeatures, scenario.featureDeltas);

          // Get risk for modified scenario
          const prediction = await riskPredictionService.getDailyRisk(
            userId,
            modifiedFeatures
          );

          if (prediction) {
            results.push({
              label: scenario.label,
              risk: prediction.mean_probability,
              delta: prediction.mean_probability - baselineRisk,
            });
          }
        }

        // Sort by most impactful (most negative delta)
        results.sort((a, b) => a.delta - b.delta);

        setScenarios(results);
      } catch (err) {
        setError('Failed to calculate scenarios');
        console.error(err);
      } finally {
        setIsCalculating(false);
      }
    }, 500), // 500ms debounce
    [baselineFeatures, baselineRisk, userId]
  );

  return {
    baselineRisk,
    scenarios,
    isCalculating,
    error,
    calculateScenarios,
  };
}

// Helper: Apply feature deltas to base feature matrix
function applyDeltas(
  baseFeatures: number[][],
  deltas: Record<number, number>
): number[][] {
  return baseFeatures.map(hourFeatures => {
    const modified = [...hourFeatures];
    Object.entries(deltas).forEach(([indexStr, delta]) => {
      const index = parseInt(indexStr);
      modified[index] += delta;
    });
    return modified;
  });
}
```

---

### 3. Add Real-Time Risk Calculation to Quick Check

**File:** `src/components/QuickCheckFlow.tsx`

```typescript
// Add imports
import { useState, useEffect } from 'react';
import { useWhatIfSimulator } from '../hooks/useWhatIfSimulator';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';

function QuickCheckFlow() {
  const userId = 'demo-user'; // TODO: Get from auth
  
  // Use what-if simulator hook
  const {
    baselineRisk,
    scenarios,
    isCalculating,
    calculateScenarios,
  } = useWhatIfSimulator(userId);
  
  // Current Quick Check state
  const [checkData, setCheckData] = useState<QuickCheckData>({
    sleep: { hours: 7, quality: 7 },
    caffeine: { level: 'medium' },
    water: { amount: 'medium' },
    food: { level: 5 },
  });
  
  // When user adjusts values, recalculate scenarios
  useEffect(() => {
    const whatIfScenarios = [
      {
        label: 'Sleep 8 hours',
        icon: '😴',
        featureDeltas: { 0: 1.0 }, // Add 1 hour to sleep (index 0)

      if (prediction) {
        setCurrentRisk(prediction.mean_probability);
      }
    } catch (error) {
      console.error('Failed to calculate risk:', error);
    } finally {
      setIsCalculating(false);
    }
  }, 500), // 500ms debounce
  []
);

// Calculate "what-if" scenarios
const calculateWhatIf = useCallback(async (
  currentData: QuickCheckData,
  modifications: Partial<QuickCheckData>
) => {
  const modifiedData = { ...currentData, ...modifications };
  const features = quickCheckToFeatures(modifiedData, 20);
  
  const prediction = await riskPredictionService.getDailyRisk(
    'demo-user',
    features
  );

  return prediction?.mean_probability || null;
}, []);

// Calculate top 3 impactful changes
const calculateTopImpacts = useCallback(async (currentData: QuickCheckData) => {
  const scenarios = [
    {
      label: 'Sleep 8 hours',
      icon: '😴',
      modification: { /* sleep modification */ },
    },
    {
      label: 'Drink 2L water',
      icon: '💧',
      modification: { water: { amount: 'high' } },
    },
    {
      label: 'Skip afternoon coffee',
      icon: '☕',
      modification: { caffeine: { level: 'none' } },
    },
    {
      label: 'Eat regularly',
      icon: '🍽️',
      modification: { food: { level: 8 } },
    },
  ];

  const impacts = await Promise.all(
    scenarios.map(async (scenario) => {
      const whatIfRisk = await calculateWhatIf(currentData, scenario.modification);
      const delta = currentRisk && whatIfRisk 
        ? currentRisk - whatIfRisk 
        : 0;
      
      return {
        label: scenario.label,
        icon: scenario.icon,
        delta: Math.round(delta * 100), // Convert to percentage
      };
    })
  );

  // Sort by impact (descending) and take top 3
  const sorted = impacts
    .filter((i) => i.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  setTopImpacts(sorted);
}, [currentRisk, calculateWhatIf]);

// Trigger calculation when data changes
useEffect(() => {
  calculateRisk(data);
  calculateTopImpacts(data);
}, [data, calculateRisk, calculateTopImpacts]);
```

**Deliverable:** ✅ Real-time risk calculation on data change

---

### 2. Add Live Risk Display to Each Step

**File:** `src/components/QuickCheckFlow.tsx`

Add to each step's UI:

```typescript
{/* Live Risk Indicator */}
{currentRisk !== null && (
  <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Current risk</p>
        <p className="text-h2">
          {Math.round(currentRisk * 100)}%
          {isCalculating && (
            <span className="ml-2 text-sm text-muted-foreground">
              (updating...)
            </span>
          )}
        </p>
      </div>
      
      {/* What-if delta */}
      {whatIfRisk !== null && whatIfRisk !== currentRisk && (
        <div className="text-right">
          <p className="text-sm text-muted-foreground mb-1">If optimized</p>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-success" />
            <p className="text-h3 text-success">
              {Math.round(whatIfRisk * 100)}%
            </p>
            <span className="text-sm text-success font-medium">
              ↓{Math.round((currentRisk - whatIfRisk) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  </div>
)}
```

**Deliverable:** ✅ Live risk display on each Quick Check step

---

### 3. Add Sticky Footer with Top Impacts

**File:** `src/components/QuickCheckFlow.tsx`

```typescript
{/* Sticky Footer - Top Impacts */}
{topImpacts.length > 0 && (
  <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-50">
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-medium">Quick wins to reduce your risk:</h4>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2">
        {topImpacts.map((impact, i) => (
          <button
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20 hover:bg-success/15 transition-colors whitespace-nowrap"
            onClick={() => {
              // Apply this change to the Quick Check data
              console.log(`Applying optimization: ${impact.label}`);
            }}
          >
            <span className="text-lg">{impact.icon}</span>
            <span className="text-sm font-medium">{impact.label}</span>
            <span className="text-success font-semibold text-sm">
              -{impact.delta}%
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Deliverable:** ✅ Sticky footer shows top 3 actionable changes

---

### 4. Add Interactive Sliders with Live Feedback

Update slider components to show instant risk impact:

```typescript
{/* Sleep Duration Slider with Live Feedback */}
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-body">Sleep hours</label>
    <span className="text-h3">{sleepHours}h</span>
  </div>
  
  <Slider
    value={[sleepHours]}
    onValueChange={([value]) => {
      setSleepHours(value);
      // Trigger risk recalculation
      setData({ ...data, sleep: value });
    }}
    min={3}
    max={12}
    step={0.5}
    className="w-full"
  />
  
  {/* Live impact indicator */}
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">
      {sleepHours < 7 ? '⚠️ Too little sleep' : '✓ Good sleep'}
    </span>
    {sleepDelta !== 0 && (
      <span className={sleepDelta > 0 ? 'text-critical' : 'text-success'}>
        {sleepDelta > 0 ? '+' : ''}{sleepDelta}% risk
      </span>
    )}
  </div>
</div>
```

**Deliverable:** ✅ Sliders show instant risk impact

---

### 5. Add Debounce Helper

**File:** `src/utils/debounce.ts`

```typescript
/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
```

**Deliverable:** ✅ Debounce prevents API spam

---

### 6. Add Loading States & Error Handling

```typescript
{/* Loading State */}
{isCalculating && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    <span>Calculating impact...</span>
  </div>
)}

{/* Error State */}
{error && (
  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
    Unable to calculate risk. Please try again.
  </div>
)}
```

**Deliverable:** ✅ Loading & error states handled gracefully

---

## 🧪 Testing

### Manual QA Checklist

- [ ] Open Quick Check flow
- [ ] Adjust sleep slider
- [ ] Verify risk updates within 500ms
- [ ] Check "what-if" delta appears
- [ ] Verify sticky footer shows top 3 impacts
- [ ] Adjust water intake
- [ ] Confirm risk recalculates
- [ ] Complete full Quick Check
- [ ] Verify final risk matches predictions
- [ ] Test with backend offline (graceful fallback)

### Performance Tests

- [ ] API calls debounced properly (max 1 per 500ms)
- [ ] UI remains responsive during calculations
- [ ] No memory leaks from unmounted calculations

### Edge Cases

- [ ] Backend unavailable → show cached/estimated impact
- [ ] Invalid feature data → validation error
- [ ] Rapid slider changes → debounce works
- [ ] All zero inputs → sensible baseline risk

---

## 📚 Documentation

**Update:**
- `FEATURE_ENHANCEMENT_SUMMARY.md` - Mark #029 complete
- Add user guide: "Understanding risk impact"
- Developer docs: Debounce strategy

**User-Facing:**
- Tooltip: "These suggestions are based on population data"
- Disclaimer: "Actual results may vary"

---

## ✅ Deliverables

- [ ] Real-time risk calculation in Quick Check
- [ ] Live risk display on each step
- [ ] Sticky footer with top 3 impacts
- [ ] Interactive sliders with instant feedback
- [ ] Debounce utility (500ms)
- [ ] Loading & error states
- [ ] Manual QA passed
- [ ] Documentation updated

---

## 🚀 Future Enhancements (Out of Scope)

- **"Optimize my day" challenge mode** - Gamify finding lowest risk
- **Historical "what-if" replay** - "What if you'd slept more last Tuesday?"
- **Personalized impact weights** - Learn user-specific sensitivities
- **Multi-factor combinations** - "Sleep 8hrs AND skip coffee: -18%"
- **A/B testing** - With vs without live feedback

---

## 🎨 Design Notes

**Visual Hierarchy:**
1. Current risk (largest, most prominent)
2. "What-if" scenario (secondary, with delta)
3. Top impacts (actionable footer)

**Colors:**
- Risk increase: `text-critical` (red)
- Risk decrease: `text-success` (green)
- Neutral: `text-primary` (blue)

**Animation:**
- Smooth number transitions (100ms)
- Pulsing on large changes (>10%)
- Shimmer effect while calculating

---

**Estimated Timeline:**
- Day 1: Real-time calculation + debounce (4-5 hrs)
- Day 2: UI components + sticky footer (5-6 hrs)
- Day 3: Polish + testing (3-4 hrs)

**Blocked By:** None (uses existing APIs)  
**Blocks:** None

---

## 💡 Key Implementation Notes

1. **API Cost Management:**
   - Use 500ms debounce on all sliders
   - Cache risk predictions (same features = cached result)
   - Consider client-side approximation for micro-changes

2. **UX Philosophy:**
   - Show default impacts on first load (before user changes anything)
   - Always positive framing ("reduce by X%" not "increase by Y%")
   - Maximum 3 suggestions to avoid choice paralysis

3. **Accessibility:**
   - Announce risk changes to screen readers
   - Keyboard navigation for all interactive elements
   - High contrast for risk delta indicators

4. **Fallback Strategy:**
   - If backend unavailable: Use heuristic approximations
   - If calculation fails: Show last known risk
   - If no data yet: Show population average (40%)
