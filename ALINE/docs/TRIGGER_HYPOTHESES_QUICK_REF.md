# Trigger Hypotheses - Quick Reference

## 🚀 Quick Start

### Load Hypotheses
```typescript
import { sqliteService } from '../services/sqliteService';

const hypotheses = await sqliteService.getTriggerHypotheses();
```

### Convert to Risk Variables
```typescript
import { mapTriggerHypothesesToRiskVariables } from '../utils/mapTriggerHypothesesToRiskVariables';

const riskVars = mapTriggerHypothesesToRiskVariables(hypotheses);
```

### Save New Hypothesis
```typescript
await sqliteService.saveTriggerHypothesis({
  id: `trigger_${key}_${Date.now()}`,
  key: 'sleep_loss',
  label: 'Sleep Loss',
  confidence: 0.75, // Required: 0.25, 0.5, 0.75, or 0.9
  freqPerMonth: 4, // Optional
  threshold: '<6 hours', // Optional
  onsetWindowHours: 2, // Optional
  helps: 'Rest, dark room', // Optional
  notes: 'Usually after late nights', // Optional
});
```

### Update Hypothesis
```typescript
await sqliteService.updateTriggerHypothesis(id, {
  confidence: 0.9,
  freqPerMonth: 5,
});
```

### Delete Hypothesis
```typescript
await sqliteService.deleteTriggerHypothesis(id);
```

## 📊 Data Structure

```typescript
interface TriggerHypothesis {
  id: string;
  key: string; // 'sleep_loss', 'pressure_drop', etc.
  label: string; // 'Sleep Loss', 'Pressure Drop', etc.
  confidence: number; // 0.25 | 0.5 | 0.75 | 0.9
  freqPerMonth?: number;
  threshold?: string;
  onsetWindowHours?: number;
  helps?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 🎯 Available Triggers

```typescript
import { TRIGGER_STRINGS, PREDEFINED_TRIGGERS } from '../utils/triggerStrings';

// Get all trigger keys
PREDEFINED_TRIGGERS // ['sleep_loss', 'pressure_drop', ...]

// Get trigger label
TRIGGER_STRINGS.triggers.sleep_loss // 'Sleep Loss'

// Get confidence options
TRIGGER_STRINGS.confidenceOptions
// [
//   { value: 0.25, label: 'Not sure' },
//   { value: 0.5, label: 'Possible' },
//   { value: 0.75, label: 'Likely' },
//   { value: 0.9, label: 'Very likely' }
// ]
```

## 🔄 Integration Pattern

```typescript
// In your component
const [hypotheses, setHypotheses] = useState<TriggerHypothesis[]>([]);

useEffect(() => {
  sqliteService.getTriggerHypotheses().then(setHypotheses);
}, []);

// Merge with risk variables
const riskVariables = [
  ...environmentalVars,
  ...biometricVars,
  ...lifestyleVars,
  ...personalVars,
  ...mapTriggerHypothesesToRiskVariables(hypotheses),
];
```

## 🎨 UI Components

```typescript
// Filter by category
const userHypotheses = riskVariables.filter(v => v.category === 'user-hypothesis');

// Display
{userHypotheses.map(v => (
  <div key={v.name}>
    <span>{TRIGGER_STRINGS.triggers[v.name as TriggerKey]}</span>
    <span>{v.percentage}%</span>
  </div>
))}
```

## ✅ Validation Rules

- **confidence**: Required (must be 0.25, 0.5, 0.75, or 0.9)
- **freqPerMonth**: Optional (must be >= 0 if provided)
- **onsetWindowHours**: Optional (must be >= 0 if provided)
- **threshold, helps, notes**: Optional (no validation)
- **Max triggers**: 5 per user

## 🔍 Type Safety

```typescript
import { TriggerKey } from '../utils/triggerStrings';

// Type-safe trigger keys
const key: TriggerKey = 'sleep_loss'; // ✅
const invalid: TriggerKey = 'invalid'; // ❌ Type error
```

## 📍 Where It Lives

- **Database**: `user_trigger_hypotheses` table
- **Types**: `src/types/index.ts`
- **Service**: `src/services/sqliteService.ts`
- **Strings**: `src/utils/triggerStrings.ts`
- **Utility**: `src/utils/mapTriggerHypothesesToRiskVariables.ts`
- **UI**: `src/components/OnboardingPersonalDetailsStep.tsx`

## 🎯 Common Use Cases

### Check if user has hypotheses
```typescript
const hypotheses = await sqliteService.getTriggerHypotheses();
const hasHypotheses = hypotheses.length > 0;
```

### Get high-confidence triggers
```typescript
const highConfidence = hypotheses.filter(h => h.confidence >= 0.75);
```

### Find specific trigger
```typescript
const sleepTrigger = hypotheses.find(h => h.key === 'sleep_loss');
```

### Group by confidence
```typescript
const byConfidence = hypotheses.reduce((acc, h) => {
  const level = h.confidence >= 0.75 ? 'high' : 
                h.confidence >= 0.5 ? 'medium' : 'low';
  acc[level] = acc[level] || [];
  acc[level].push(h);
  return acc;
}, {} as Record<string, TriggerHypothesis[]>);
```

## 🔐 Best Practices

1. ✅ Always await database operations
2. ✅ Use type-safe TriggerKey for trigger keys
3. ✅ Validate confidence values (0.25, 0.5, 0.75, 0.9)
4. ✅ Check for undefined optional fields
5. ✅ Use TRIGGER_STRINGS for all UI text
6. ✅ Keep category as 'user-hypothesis'
7. ✅ Don't modify existing risk variable categories

## 📚 Documentation

- Full guide: `TRIGGER_HYPOTHESES_INTEGRATION.md`
- Implementation summary: `TRIGGER_HYPOTHESES_IMPLEMENTATION_COMPLETE.md`
- This quick reference: `TRIGGER_HYPOTHESES_QUICK_REF.md`
