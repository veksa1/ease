# Migraine Report Feature Implementation

## Overview

Complete "Report migraine" feature that allows users to log migraine episodes with comprehensive details. Data is stored locally using SQLite (sql.js) and designed to be ML-friendly for future prediction model improvements.

## Files Created/Modified

### New Files:

1. **`src/types/migraine.ts`**
   - TypeScript types for migraine reports
   - ML-friendly categorical values (enums)
   - Form data types

2. **`src/services/migraineService.ts`**
   - CRUD operations for migraine reports
   - SQLite database integration
   - ML export functionality
   - Stub for future backend ML pipeline integration

3. **`src/components/ReportMigraineForm.tsx`**
   - Comprehensive form component
   - Follows existing design system
   - Full-screen modal with scrollable content
   - Success state handling

### Modified Files:

1. **`src/services/sqliteService.ts`**
   - Added `migraine_reports` table to schema
   - Added indices for common queries

2. **`src/components/ReportMigraineMigral.tsx`**
   - Now a simple wrapper around `ReportMigraineForm`
   - Maintains backward compatibility

## Database Schema

```sql
CREATE TABLE migraine_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  onset_at TEXT NOT NULL,
  duration_hours REAL,
  severity INTEGER NOT NULL,  -- 0-10
  aura_present INTEGER,
  aura_types TEXT,  -- JSON array
  pain_character TEXT,
  symptoms TEXT NOT NULL,  -- JSON array
  triggers TEXT NOT NULL,  -- JSON array
  other_trigger_notes TEXT,
  notes TEXT,
  medication_taken TEXT,
  medication_timing TEXT,
  relief_level TEXT,
  impact_missed_work INTEGER,
  impact_had_to_rest INTEGER,
  impact_score INTEGER,  -- 0-10
  created_at TEXT NOT NULL
);
```

## Features

### Episode Details
- Date/time of onset (default: now)
- Duration in hours (optional)
- Pain severity (0-10 slider)

### Aura Information
- Checkbox for aura presence
- Multi-select aura types: visual, sensory, speech, motor

### Pain Characteristics
- Pain type: throbbing, stabbing, pressure, other

### Symptoms (Multi-select)
- Nausea
- Vomiting
- Light sensitivity (photophobia)
- Sound sensitivity (phonophobia)
- Smell sensitivity (osmophobia)
- Dizziness
- Vertigo
- Neck pain/stiffness
- Brain fog
- Difficulty concentrating

### Triggers (Multi-select by category)

**Lifestyle:**
- Stress
- Lack of sleep / Oversleeping
- Skipped meal / Irregular eating
- Dehydration

**Hormonal:**
- Menstruation
- Ovulation

**Environmental:**
- Weather (pressure/temperature changes)
- Bright lights
- Extended screen time
- Loud noise

**Dietary:**
- Cheese
- Chocolate
- Processed meats
- Alcohol
- Caffeine changes (increase/decrease)

**Physical:**
- Intense exercise
- Travel / Jet lag
- Other (free text)

### Medication & Relief
- Medication taken (free text)
- Timing relative to onset (0-1h, 1-3h, 3-6h, >6h)
- Perceived relief (good, partial, none)

### Impact Assessment
- Missed work/school (checkbox)
- Had to lie down/stop activities (checkbox)
- Disruption score (0-10 slider)

### Additional Notes
- Free text field for any other observations

## Usage

### From existing code:

```tsx
import { ReportMigraineModal } from './components/ReportMigraineMigral';

// Used in HomeScreen.tsx
<ReportMigraineModal
  trigger={
    <Button variant="outline">
      <AlertCircle className="w-4 h-4" />
      Report migraine
    </Button>
  }
/>
```

### Programmatically:

```tsx
import { getMigraineService } from './services/migraineService';
import type { MigraineReportFormData } from './types/migraine';

const migraineService = getMigraineService();

// Create a report
const formData: MigraineReportFormData = {
  onsetDate: new Date(),
  severity: 7,
  auraPresent: true,
  auraTypes: ['visual'],
  symptoms: ['nausea', 'photophobia'],
  triggers: ['stress', 'lack_of_sleep'],
  // ... other fields
};

const report = await migraineService.createReport(formData);

// Get all reports
const reports = await migraineService.getAllReports();

// Get reports in date range
const reportsThisWeek = await migraineService.getReportsByDateRange(
  new Date('2025-01-01'),
  new Date('2025-01-07')
);

// Export for ML
const mlData = await migraineService.exportForML();
```

## ML Integration (Future)

The service includes a stub `queueForMLProcessing()` function that logs when a report is saved. When the backend is implemented:

1. **Immediate use:** Send report to backend API
   ```typescript
   private async queueForMLProcessing(report: MigraineReport): Promise<void> {
     await fetch(`${API_URL}/api/ml/process-migraine-report`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(report)
     });
   }
   ```

2. **Backend ML pipeline:** 
   - Join migraine reports with user's historical data (sleep, HRV, calendar, etc.)
   - Use as labels/targets for prediction model training
   - Update risk predictions based on new patterns

3. **Export format:**
   The `exportForML()` method returns data in this format:
   ```json
   {
     "timestamp": "2025-01-15T10:30:00Z",
     "features": {
       "severity": 7,
       "aura_present": 1,
       "duration_hours": 4.5,
       "triggers": { "stress": 1, "lack_of_sleep": 1, "dehydration": 0, ... },
       "symptoms": { "nausea": 1, "photophobia": 1, ... },
       "pain_character": "throbbing",
       "medication_effectiveness": 2,
       "impact_score": 8
     },
     "labels": {
       "had_migraine": 1,
       "severity_class": "severe"
     }
   }
   ```

## Data Persistence

- **Storage:** Browser IndexedDB (via sql.js)
- **Backup:** Can be exported/imported via SQLiteService
- **Future sync:** Ready for backend sync when implemented (userId field included)

## Testing

1. **Manual testing:**
   ```bash
   npm run dev
   # Navigate to Home screen
   # Click "Report migraine" button
   # Fill out form
   # Submit and verify success message
   ```

2. **Check data:**
   Open browser DevTools console:
   ```javascript
   const { getMigraineService } = await import('./services/migraineService');
   const service = getMigraineService();
   const reports = await service.getAllReports();
   console.log(reports);
   ```

## Design System Compliance

- ✅ Uses existing UI components (Button, Slider, Input, Select, etc.)
- ✅ Follows typography system (text-h2, text-h3, text-body, text-label)
- ✅ Consistent border radius (8px, 12px)
- ✅ Uses design tokens (colors, spacing)
- ✅ Accessible (proper labels, keyboard navigation)
- ✅ Responsive layout

## Next Steps

1. **Backend Integration:**
   - Create POST /api/migraine-reports endpoint
   - Implement JWT authentication
   - Sync local reports to backend

2. **ML Pipeline:**
   - Process reports in ML service
   - Generate training data
   - Update risk prediction models

3. **Analytics:**
   - Visualize migraine patterns over time
   - Show trigger correlations
   - Track medication effectiveness

4. **Enhancements:**
   - Photo upload for visual aura documentation
   - Voice notes integration (already has UI placeholder)
   - Export to PDF for sharing with doctors
   - Reminders to log when migraine ends

## Architecture Benefits

- **Offline-first:** Works without backend
- **Type-safe:** Full TypeScript coverage
- **ML-ready:** Structured, normalized data
- **Extensible:** Easy to add new fields
- **Privacy-focused:** Data stays local until user syncs
- **Performance:** Indexed queries, efficient storage

## Notes

- All timestamps stored in UTC ISO format
- Categorical values use snake_case for ML compatibility
- Arrays stored as JSON strings in SQLite
- Future-proof schema allows backend migration
- Backward compatible with existing ReportMigraineMigral usage
