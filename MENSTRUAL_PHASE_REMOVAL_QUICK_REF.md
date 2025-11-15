# Menstrual Phase Removal - Quick Reference

## What Changed

### Onboarding Form (Step 4/4)

**BEFORE:**
```
Tell us about your migraine history
───────────────────────────────────

How many years have you had migraines?
[___0___]

Menstrual phase (optional)            ← REMOVED!
[Not applicable ▼]

Age
[___0___]

Weight (kg, optional)    BMI (optional)
[Optional]               [Optional]

[Back]  [Get started]
```

**AFTER:**
```
Tell us about your migraine history
───────────────────────────────────

How many years have you had migraines?
[___0___]

Age
[___0___]

Weight (kg, optional)    BMI (optional)
[Optional]               [Optional]

[Back]  [Get started]
```

### Personal Risk Factors Display

**BEFORE:**
```
👤 Personal
├─ Migraine History      8 yrs     16%
├─ Menstrual Phase   Premenstrual  15%  ← REMOVED!
├─ Age               34 years       2%
├─ Body Weight       68 kg          1%
└─ BMI               22.5           1%
```

**AFTER:**
```
👤 Personal
├─ Migraine History   8 yrs     16%
├─ Age               34 years    2%
├─ Body Weight       68 kg       1%
└─ BMI               22.5        1%
```

### Database Schema

**BEFORE:**
```sql
CREATE TABLE personal_migraine_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  migraine_history_years REAL NOT NULL,
  menstrual_phase TEXT NOT NULL,           ← REMOVED!
  age REAL NOT NULL,
  weight_kg REAL,
  bmi REAL,
  updated_at TEXT NOT NULL
)
```

**AFTER:**
```sql
CREATE TABLE personal_migraine_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  migraine_history_years REAL NOT NULL,
  age REAL NOT NULL,
  weight_kg REAL,
  bmi REAL,
  updated_at TEXT NOT NULL
)
```

## Files Modified (4 files)

1. ✅ `src/types/index.ts` - Removed menstrualPhase from interface
2. ✅ `src/components/OnboardingPersonalDetailsStep.tsx` - Removed dropdown UI
3. ✅ `src/services/sqliteService.ts` - Updated schema & queries
4. ✅ `src/utils/profileToRiskVariables.ts` - Removed risk calculation

## Impact

- **Lines removed**: ~73 lines
- **Build time**: 1.85s ✅
- **TypeScript errors**: None ✅
- **Breaking changes**: None ✅
- **User data**: Backward compatible ✅

## Testing

Visit http://localhost:3002/ and:
1. Go through onboarding to step 4/4
2. Verify menstrual phase dropdown is gone
3. Complete form with just: Years, Age, Weight, BMI
4. Check risk factors page shows 4 personal factors (not 5)

## Result

✅ Menstrual phase completely removed
✅ Form is cleaner and simpler
✅ No overlap issues (problem solved as side effect!)
✅ Faster form completion for users
