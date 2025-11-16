# What-If Risk Simulator - Quick Reference

## 🎯 Overview

Real-time risk simulator that shows users how their behavior changes affect migraine risk. Integrated into Quick Check flow.

---

## 📦 Core Components

### 1. Hook: `useWhatIfSimulator`

```typescript
import { useWhatIfSimulator, COMMON_SCENARIOS } from '../hooks/useWhatIfSimulator';

const {
  baselineRisk,        // number | null - Current risk (0-1)
  scenarios,           // WhatIfResult[] - Calculated scenarios
  isCalculating,       // boolean - Loading state
  isLoadingBaseline,   // boolean - Initial load
  error,               // string | null - Error message
  calculateScenarios,  // Function to trigger calculation
  recalculateRisk,     // Function for custom deltas
} = useWhatIfSimulator(userId);
```

**What-If Scenario Structure:**
```typescript
interface WhatIfScenario {
  label: string;              // "Sleep 8 hours"
  icon: string;               // "😴"
  featureDeltas: Record<number, number>; // { 0: 1.0 }
}
```

**Result Structure:**
```typescript
interface WhatIfResult {
  label: string;    // "Sleep 8 hours"
  icon: string;     // "😴"
  risk: number;     // 0.35 (new risk level)
  delta: number;    // -0.10 (change from baseline)
}
```

### 2. Components: `WhatIfImpactCard.tsx`

#### WhatIfImpactCard
Full card showing current risk + suggestions

```typescript
<WhatIfImpactCard
  baselineRisk={0.45}
  currentRisk={0.40}         // Optional
  suggestions={scenarios}
  isCalculating={false}
  onApplySuggestion={(s) => console.log(s)}
/>
```

#### WhatIfStickyFooter
Bottom banner with top 3 quick wins

```typescript
<WhatIfStickyFooter
  suggestions={scenarios}
  isVisible={true}
  onApplySuggestion={(s) => applyChange(s)}
/>
```

#### LiveRiskIndicator
Compact inline display

```typescript
<LiveRiskIndicator
  currentRisk={0.42}
  baselineRisk={0.45}
  isCalculating={false}
/>
```

---

## 🔧 Feature Index Mapping

**Key feature indices for deltas:**

| Index | Feature Name | Example Delta |
|-------|-------------|---------------|
| 0 | Sleep Duration (hours) | `{ 0: 1.0 }` = +1 hour |
| 1 | Sleep Quality (1-10) | `{ 1: 2.0 }` = +2 quality |
| 3 | Stress Level (1-10) | `{ 3: -2.0 }` = -2 stress |
| 6 | Caffeine Intake (mg) | `{ 6: -100 }` = -100mg |
| 7 | Water Intake (L) | `{ 7: 0.5 }` = +0.5L |
| 8 | Meal Regularity (1-10) | `{ 8: 2.0 }` = +2 regularity |
| 9 | Exercise Duration (min) | `{ 9: 30 }` = +30 min |
| 19 | Meditation Time (min) | `{ 19: 20 }` = +20 min |

**Full feature list:** See `userFeaturesService.ts` featureMap

---

## 🎨 Common Scenarios

Pre-configured scenarios (from `COMMON_SCENARIOS`):

```typescript
const scenarios = [
  {
    label: 'Sleep 8 hours',
    icon: '😴',
    featureDeltas: { 0: 1.0 },
  },
  {
    label: 'Drink 2L water',
    icon: '💧',
    featureDeltas: { 7: 0.5 },
  },
  {
    label: 'Skip afternoon coffee',
    icon: '☕',
    featureDeltas: { 6: -100 },
  },
  {
    label: 'Eat regularly',
    icon: '🍽️',
    featureDeltas: { 8: 2.0 },
  },
  {
    label: 'Exercise 30 min',
    icon: '🏃',
    featureDeltas: { 9: 30, 10: 2.0 },
  },
  {
    label: 'Reduce stress',
    icon: '🧘',
    featureDeltas: { 3: -2.0, 19: 20 },
  },
];
```

---

## 🚀 Usage Examples

### Basic Integration

```typescript
import { useWhatIfSimulator, COMMON_SCENARIOS } from '../hooks/useWhatIfSimulator';

function MyComponent() {
  const { baselineRisk, scenarios, calculateScenarios } = useWhatIfSimulator('user-123');
  
  useEffect(() => {
    calculateScenarios(COMMON_SCENARIOS);
  }, [baselineRisk]);
  
  return (
    <div>
      <h2>Current Risk: {Math.round(baselineRisk * 100)}%</h2>
      <ul>
        {scenarios.map(s => (
          <li key={s.label}>
            {s.icon} {s.label}: {Math.round(s.delta * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Custom Scenarios

```typescript
const customScenarios = [
  {
    label: 'Perfect day',
    icon: '⭐',
    featureDeltas: {
      0: 1.0,   // +1hr sleep
      7: 0.5,   // +0.5L water
      3: -3.0,  // -3 stress
    },
  },
];

calculateScenarios(customScenarios);
```

### Recalculate Risk Dynamically

```typescript
const { recalculateRisk } = useWhatIfSimulator('user-123');

// User adjusts sleep slider
const handleSleepChange = async (hours) => {
  const newRisk = await recalculateRisk({ 0: hours - currentHours });
  console.log('New risk:', newRisk);
};
```

---

## 🎯 Integration Checklist

When adding what-if to a new component:

- [ ] Import `useWhatIfSimulator` hook
- [ ] Initialize with user ID
- [ ] Call `calculateScenarios()` after baseline loads
- [ ] Display baseline risk
- [ ] Show loading state during calculations
- [ ] Handle errors gracefully
- [ ] Add debouncing if triggering on input change
- [ ] Display suggestions (use WhatIfImpactCard or custom)
- [ ] Implement suggestion click handlers (optional)

---

## 🐛 Debugging

### Common Issues

**Baseline not loading:**
- Check `userFeaturesService` is working
- Verify `/risk/daily` endpoint accessible
- Check console for errors

**Scenarios not updating:**
- Verify `calculateScenarios()` called after baseline loads
- Check `baselineRisk !== null` before calling
- Ensure scenarios passed correctly

**Performance issues:**
- Verify debounce is working (500ms delay)
- Check network tab for excessive API calls
- Consider caching results

### Debug Logging

```typescript
const simulator = useWhatIfSimulator(userId);

console.log('Baseline risk:', simulator.baselineRisk);
console.log('Scenarios:', simulator.scenarios);
console.log('Is calculating:', simulator.isCalculating);
console.log('Error:', simulator.error);
```

---

## 📚 Related Documentation

- Ticket: `ALINE/tickets/029_what_if_risk_simulator.md`
- Implementation: `ALINE/tickets/029_IMPLEMENTATION_COMPLETE.md`
- User Features: `src/services/userFeaturesService.ts`
- Risk API: `src/services/riskPredictionService.ts`

---

## 🎨 Design Tokens

### Colors

- **Success** (improvement): `text-success`, `bg-success/10`
- **Critical** (increase): `text-critical`, `bg-critical/10`
- **Primary** (neutral): `text-primary`, `bg-primary/5`

### Icons

- Improvement: `TrendingDown` (lucide-react)
- Increase: `TrendingUp` (lucide-react)
- Loading: `Sparkles` (lucide-react)
- Error: `AlertCircle` (lucide-react)

### Spacing

- Card padding: `p-4`
- Section gap: `space-y-3`
- Sticky footer: `fixed bottom-0`, `z-50`
- Content padding bottom: `pb-20` (for sticky footer clearance)

---

**Last Updated:** 2025-11-16  
**Version:** 1.0  
**Status:** Production Ready
