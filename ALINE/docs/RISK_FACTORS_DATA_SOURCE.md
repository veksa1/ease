# Risk Factors Data Source Reference

## Summary
This document clarifies which risk factors are hardcoded vs. fetched from the database.

## Data Sources

### 🌤️ Environmental (7 factors) - **HARDCODED**
| Factor | Value | Percentage | Source |
|--------|-------|------------|--------|
| Barometric Pressure Change | -6 hPa | 28% | Hardcoded |
| Weather Changes | Unstable | 14% | Hardcoded |
| Humidity | 75% | 11% | Hardcoded |
| Temperature | 22°C | 9% | Hardcoded |
| Air Quality Index | 85 AQI | 6% | Hardcoded |
| Base Pressure | 1013 hPa | 5% | Hardcoded |
| Altitude | 850 m | 3% | Hardcoded |

### 🫀 Biometric (6 factors) - **HARDCODED**
| Factor | Value | Percentage | Source |
|--------|-------|------------|--------|
| Sleep Quality | 4.5/10 | 22% | Hardcoded |
| Sleep Duration | 6.5 hrs | 15% | Hardcoded |
| HRV | 47 ms | 12% | Hardcoded |
| Resting Heart Rate | 72 bpm | 10% | Hardcoded |
| Body Temperature Change | +0.4°C | 8% | Hardcoded |
| Activity Level | 3200 steps | 7% | Hardcoded |

### 🌱 Lifestyle (7 factors) - **HARDCODED**
| Factor | Value | Percentage | Source |
|--------|-------|------------|--------|
| Prodrome Symptoms | Present | 20% | Hardcoded |
| Stress Level | 8.5/10 | 18% | Hardcoded |
| Screen Time | 9 hrs | 8% | Hardcoded |
| Meal Regularity | Irregular | 7% | Hardcoded |
| Caffeine Intake Change | +150 mg | 6% | Hardcoded |
| Alcohol Intake | 1 drink | 5% | Hardcoded |
| Water Intake | 1.8 L | 4% | Hardcoded |

### 👤 Personal (5 factors) - **DATABASE** ✅
| Factor | Example Value | Percentage | Source |
|--------|---------------|------------|--------|
| Migraine History | 8 yrs | 16% | SQLite DB |
| Menstrual Phase | Premenstrual | 15% | SQLite DB |
| Age | 34 years | 2% | SQLite DB |
| Body Weight | 68 kg | 1% | SQLite DB |
| BMI | 22.5 | 1% | SQLite DB |

## Implementation Details

### Where They're Defined

**Hardcoded Factors** (`HomeScreenContainer.tsx` lines 93-113):
```typescript
const riskVariables: RiskVariable[] = [
  // Environmental factors (hardcoded)
  { name: 'Barometric Pressure Change', percentage: 28, category: 'environmental', value: '-6', unit: 'hPa' },
  // ... 6 more environmental factors
  
  // Biometric factors (hardcoded)
  { name: 'Sleep Quality', percentage: 22, category: 'biometric', value: '4.5', unit: '/10' },
  // ... 5 more biometric factors
  
  // Lifestyle factors (hardcoded)
  { name: 'Prodrome Symptoms', percentage: 20, category: 'lifestyle', value: 'Present', unit: '' },
  // ... 6 more lifestyle factors
  
  // Personal factors from database
  ...profileToRiskVariables(profile),
];
```

**Database Factors** (`profileToRiskVariables.ts`):
```typescript
export function profileToRiskVariables(profile: PersonalMigraineProfile | null): RiskVariable[] {
  if (!profile) return [];
  
  // Converts database fields to RiskVariable format:
  // - migraineHistoryYears → Migraine History (5-20% scaled)
  // - menstrualPhase → Menstrual Phase (0-15% based on phase)
  // - age → Age (1-2%)
  // - weightKg → Body Weight (1%)
  // - bmi → BMI (1%)
  
  return variables;
}
```

### Database Schema

```sql
CREATE TABLE personal_migraine_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  migraine_history_years REAL NOT NULL,
  menstrual_phase TEXT NOT NULL,
  age REAL NOT NULL,
  weight_kg REAL,
  bmi REAL,
  updated_at TEXT NOT NULL
)
```

## Why This Approach?

1. **Environmental/Biometric/Lifestyle**: Demo data showing what the app would look like with real sensor/API data
2. **Personal**: User-specific data collected during onboarding and stored persistently

## Future Enhancements

To make Environmental/Biometric/Lifestyle factors dynamic:
- Connect to weather APIs (OpenWeatherMap, etc.)
- Integrate with Apple Health/Google Fit
- Implement manual logging forms
- Add machine learning model predictions (ALINE model integration)
