# Trigger Hypotheses Integration Guide

## Overview
This guide shows how to integrate user-suspected trigger hypotheses into the risk variables pipeline.

## Files Modified

### 1. Database Schema (`src/services/sqliteService.ts`)
- Added `user_trigger_hypotheses` table
- Implemented CRUD methods:
  - `saveTriggerHypothesis()`
  - `updateTriggerHypothesis()`
  - `getTriggerHypotheses()`
  - `deleteTriggerHypothesis()`

### 2. Type Definitions (`src/types/index.ts`)
- Added `TriggerHypothesis` interface
- Extended `RiskVariable.category` to include `'user-hypothesis'`

### 3. Onboarding UI (`src/components/OnboardingPersonalDetailsStep.tsx`)
- Added trigger hypothesis selection section below BMI field
- Multi-select chip grid (max 5 triggers)
- Expandable cards with:
  - Confidence level (required)
  - Frequency per month
  - Threshold description
  - Onset window (hours)
  - What helps
  - Notes
- Save on blur functionality
- Remove option for each hypothesis

### 4. Utility Functions
- `src/utils/triggerStrings.ts` - Centralized strings for i18n
- `src/utils/mapTriggerHypothesesToRiskVariables.ts` - Convert hypotheses to RiskVariable format

## Integrating into Risk Variables

### Example: Update HomeScreenContainer.tsx

```typescript
import { mapTriggerHypothesesToRiskVariables } from '../utils/mapTriggerHypothesesToRiskVariables';
import { sqliteService } from '../services/sqliteService';

// Inside your component:
const [triggerHypotheses, setTriggerHypotheses] = useState<TriggerHypothesis[]>([]);

useEffect(() => {
  const loadTriggerHypotheses = async () => {
    const hypotheses = await sqliteService.getTriggerHypotheses();
    setTriggerHypotheses(hypotheses);
  };
  loadTriggerHypotheses();
}, []);

// Merge with existing risk variables:
const riskVariables: RiskVariable[] = [
  // Environmental factors (hardcoded)
  { name: 'Barometric Pressure Change', percentage: 28, category: 'environmental', value: '-6', unit: 'hPa' },
  // ... other environmental factors

  // Biometric factors (hardcoded)
  { name: 'Sleep Quality', percentage: 22, category: 'biometric', value: '4.5', unit: '/10' },
  // ... other biometric factors

  // Lifestyle factors (hardcoded)
  { name: 'Prodrome Symptoms', percentage: 20, category: 'lifestyle', value: 'Present', unit: '' },
  // ... other lifestyle factors

  // Personal factors from database
  ...profileToRiskVariables(profile),

  // User-suspected trigger hypotheses
  ...mapTriggerHypothesesToRiskVariables(triggerHypotheses),
];
```

## Predefined Triggers

The following 15 triggers are available for selection:

1. `sleep_loss` - Sleep Loss
2. `pressure_drop` - Pressure Drop
3. `dehydration` - Dehydration
4. `screen_time` - Screen Time
5. `stress_overload` - Stress Overload
6. `skipped_meal` - Skipped Meal
7. `humidity_spike` - Humidity Spike
8. `temperature_swing` - Temperature Swing
9. `poor_air_quality` - Poor Air Quality
10. `bright_light` - Bright Light
11. `loud_noise` - Loud Noise
12. `strong_odor` - Strong Odor
13. `travel_jetlag` - Travel/Jetlag
14. `alcohol` - Alcohol
15. `caffeine_change` - Caffeine Change

## Data Structure

### TriggerHypothesis Interface
```typescript
interface TriggerHypothesis {
  id: string;
  key: string; // e.g., 'sleep_loss', 'pressure_drop'
  label: string; // User-facing label
  confidence: number; // 0.25 (Not sure), 0.5 (Possible), 0.75 (Likely), 0.9 (Very likely)
  freqPerMonth?: number;
  threshold?: string; // e.g., "<6h sleep", ">8h screen"
  onsetWindowHours?: number; // Time to symptom onset
  helps?: string; // What helps mitigate
  notes?: string; // Freeform notes
  createdAt: string;
  updatedAt: string;
}
```

### Conversion to RiskVariable
- `percentage` = `round(confidence * 10)` (converts 0-1 scale to 0-10 scale)
- `category` = `'user-hypothesis'`
- `value` = `threshold` or 'user suspected'
- `unit` = `${freqPerMonth}/mo` or empty string

## Usage in Components

### Filtering by Category
```typescript
const userHypotheses = riskVariables.filter(v => v.category === 'user-hypothesis');
const biometric = riskVariables.filter(v => v.category === 'biometric');
const environmental = riskVariables.filter(v => v.category === 'environmental');
const lifestyle = riskVariables.filter(v => v.category === 'lifestyle');
const personal = riskVariables.filter(v => v.category === 'personal');
```

### Displaying User Hypotheses
```typescript
{userHypotheses.length > 0 && (
  <div className="space-y-2">
    <h3 className="font-semibold">Your Suspected Triggers</h3>
    {userHypotheses.map(v => (
      <div key={v.name} className="flex justify-between">
        <span>{TRIGGER_STRINGS.triggers[v.name as TriggerKey]}</span>
        <span>{v.percentage}%</span>
      </div>
    ))}
  </div>
)}
```

## Database Operations

### Save a Trigger Hypothesis
```typescript
await sqliteService.saveTriggerHypothesis({
  id: `trigger_sleep_loss_${Date.now()}`,
  key: 'sleep_loss',
  label: 'Sleep Loss',
  confidence: 0.75,
  freqPerMonth: 4,
  threshold: '<6 hours',
  onsetWindowHours: 2,
  helps: 'Rest, dark room',
  notes: 'Usually happens after late nights',
});
```

### Load All Hypotheses
```typescript
const hypotheses = await sqliteService.getTriggerHypotheses();
```

### Update a Hypothesis
```typescript
await sqliteService.updateTriggerHypothesis(id, {
  confidence: 0.9,
  freqPerMonth: 5,
});
```

### Delete a Hypothesis
```typescript
await sqliteService.deleteTriggerHypothesis(id);
```

## Best Practices

1. **Keep it optional** - Trigger hypotheses are optional during onboarding
2. **Max 5 triggers** - Prevents overwhelming the user
3. **Save on blur** - Auto-save as user fills in details
4. **Validation** - Confidence is required, frequencies/onset must be >= 0
5. **Centralized strings** - All UI text in `triggerStrings.ts` for future i18n
6. **Category separation** - User hypotheses kept separate with `'user-hypothesis'` category
7. **Don't modify existing categories** - Keep biometric, environmental, lifestyle, personal unchanged

## Implementation Status

✅ Database table and CRUD methods
✅ Type definitions
✅ Onboarding UI component
✅ Utility functions
✅ Centralized strings
⏳ Integration into HomeScreenContainer (example provided above)
⏳ Display in risk factor breakdowns
⏳ Use in SootheMode personalization

## Next Steps

1. Add trigger hypotheses to HomeScreenContainer (use example above)
2. Display user-hypothesis category in risk factor UI
3. Use trigger hypotheses to personalize SootheMode interventions
4. Add analytics to track hypothesis accuracy over time
5. Implement i18n for all TRIGGER_STRINGS
