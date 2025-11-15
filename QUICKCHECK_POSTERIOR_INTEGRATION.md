# Quick Check to Hourly Posterior Integration

## Overview
This document describes the integration between the Quick Check quiz feature and the ALINE backend `/posterior/hourly` endpoint, enabling hourly risk pattern predictions based on user responses.

## Architecture

### Data Flow

```
User completes Quick Check Quiz
    ↓
QuickCheckFlow component collects data
    ↓
quickCheckToFeatures() converts to 24-hour feature matrix
    ↓
posteriorService.getHourlyPosterior() calls backend API
    ↓
Backend returns hourly posterior distributions
    ↓
posteriorService.calculateHourlyRisks() computes risk scores
    ↓
Display in HourlyRiskChart or store in timeline
```

### Backend Endpoint

- **Endpoint**: `POST /posterior/hourly`
- **Location**: `ALINE/service/main.py`
- **Request Schema**: `PosteriorRequest` in `ALINE/service/schemas.py`
- **Response Schema**: `PosteriorResponse` in `ALINE/service/schemas.py`

#### Request Format
```json
{
  "user_id": "string",
  "features": [
    [/* 24 arrays of features */]
  ]
}
```

#### Response Format
```json
{
  "user_id": "string",
  "hourly_posteriors": [
    {
      "hour": 0,
      "mean": [/* z_dim values */],
      "std": [/* z_dim values */]
    },
    // ... 24 hours total
  ],
  "timestamp": "ISO8601 string"
}
```

## Frontend Components

### New Files Created

#### 1. **`src/services/posteriorService.ts`**
Service layer for posterior endpoint communication.

**Methods:**
- `getHourlyPosterior(userId, features)` - Fetch hourly posteriors from backend
- `calculateHourlyRisks(posteriors)` - Convert posterior distributions to risk scores (0-1)
- `getHighRiskHours(posteriors, topK)` - Identify hours with highest risk

**Risk Calculation Algorithm:**
```typescript
// Combines uncertainty (std) and latent magnitude
uncertaintyScore = avgStd / 2  // Higher uncertainty = higher risk
magnitudeScore = magnitude / 10  // Certain latent patterns indicate risk
risk = 0.7 * uncertaintyScore + 0.3 * magnitudeScore
```

#### 2. **`src/hooks/useHourlyPosterior.ts`**
React hooks for managing hourly posterior data.

**Hooks:**
- `useHourlyPosterior(checkData, userId)` - Fetch and manage posterior data
  - Returns: `{ loading, hourlyData, highRiskHours, error, refetch }`
  - Automatically loads from timeline if no checkData provided
  
- `useHourlyRiskTimeline(checkData)` - Format data for visualization
  - Returns: `{ loading, timelineData, highRiskHours }`
  - Formats hours as "12PM", "3AM", etc.

#### 3. **`src/components/HourlyRiskChart.tsx`**
Visualization component for hourly risk patterns.

**Features:**
- Bar chart showing 24-hour risk timeline
- Color coding: green (low), yellow (moderate), red (high)
- Highlights high-risk hours with icons
- Responsive design with loading states

#### 4. **`src/utils/testPosteriorService.ts`**
Test script for validation.

**Tests:**
- Feature conversion from Quick Check data
- Backend API communication
- Risk calculation from posteriors
- High-risk hour identification

### Modified Files

#### 1. **`src/services/featureConverter.ts`**
Enhanced with feature generation capabilities.

**New Function:**
```typescript
quickCheckToFeatures(checkData, numFeatures = 10): number[][]
```

Converts Quick Check responses to a 24-hour feature matrix:
- Feature 0: Time of day (0-1)
- Feature 1: Caffeine score (0-1)
- Feature 2: Hydration score (0-1)
- Feature 3: Food regularity (0-1)
- Feature 4: Sleep duration (normalized)
- Feature 5: Sleep quality (normalized)
- Features 6-9: Time period flags (night/morning/afternoon/evening)

#### 2. **`src/hooks/useDemoData.ts`**
Enhanced `useRiskPrediction()` hook.

**Changes:**
- `updateRiskWithQuickCheck` is now async
- Automatically fetches hourly posterior when backend connected
- Stores posterior data in timeline for later retrieval
- Logs high-risk hours to console

#### 3. **`src/App.tsx`**
Updated Quick Check completion handler.

**Changes:**
- Made `onComplete` callback async
- Awaits `updateRiskWithQuickCheck()` to ensure posterior fetch completes

## Usage Examples

### Basic Integration (Automatic)

When user completes Quick Check, the system automatically:

1. Converts responses to features
2. Sends to `/posterior/hourly`
3. Calculates risk scores
4. Stores in timeline
5. Updates risk prediction

No additional code needed - it's integrated into the existing flow!

### Using the Hourly Risk Chart Component

```tsx
import { HourlyRiskChart } from './components/HourlyRiskChart';

function MyComponent() {
  return (
    <div>
      <h2>Your Risk Timeline</h2>
      <HourlyRiskChart />
    </div>
  );
}
```

The chart will automatically load the most recent posterior data from the timeline.

### Manual Posterior Fetch

```tsx
import { useHourlyPosterior } from '../hooks/useHourlyPosterior';

function MyComponent() {
  const checkData = {
    caffeine: { level: 'some' },
    water: { amount: 'medium' },
    food: { level: 7 },
  };
  
  const { loading, hourlyData, highRiskHours } = useHourlyPosterior(checkData);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>High risk hours: {highRiskHours.join(', ')}</p>
      {hourlyData.map(hour => (
        <div key={hour.hour}>
          Hour {hour.hour}: {Math.round(hour.risk * 100)}% risk
        </div>
      ))}
    </div>
  );
}
```

## Feature Engineering

### Quick Check Data Structure

```typescript
interface QuickCheckData {
  caffeine: {
    level: 'none' | 'some' | 'lot';
    types?: string[];
    lastIntake?: string;
  };
  water: {
    amount: 'none' | 'low' | 'medium' | 'high';
  };
  food: {
    level: number; // 0-10 scale
    note?: string;
  };
  sleep?: {
    hours: number;
    quality: number; // 0-10 scale
  };
}
```

### Feature Vector Composition

Each hour gets a 10-dimensional feature vector:

| Index | Feature | Description | Range |
|-------|---------|-------------|-------|
| 0 | Time of day | Hour / 24 | 0-1 |
| 1 | Caffeine | Intake level | 0-1 |
| 2 | Hydration | Water consumption | 0-1 |
| 3 | Food regularity | Meal quality | 0-1 |
| 4 | Sleep duration | Hours normalized | 0-1 |
| 5 | Sleep quality | Quality score | 0-1 |
| 6 | Is night | Binary flag | 0 or 1 |
| 7 | Is morning | Binary flag | 0 or 1 |
| 8 | Is afternoon | Binary flag | 0 or 1 |
| 9 | Is evening | Binary flag | 0 or 1 |

### Production Considerations

The current implementation uses **simplified features** based on Quick Check responses. For production deployment, replace with:

1. **Wearable Data**: HRV, heart rate, activity from Apple Health/Fitbit/Garmin
2. **Sleep Tracking**: Actual sleep stages from sleep trackers
3. **Calendar Events**: Meetings, deadlines, travel from Google/Outlook Calendar
4. **Weather Data**: Temperature, pressure, humidity from weather APIs
5. **Environmental**: Screen time, location patterns, noise levels

## Testing

### Manual Testing

```bash
# Terminal 1: Start backend
cd ALINE
uvicorn service.main:app --reload

# Terminal 2: Start frontend
npm run dev

# Use the app:
1. Click "Quick Check" from home screen
2. Complete the quiz
3. Check console for log messages
4. View hourly risk data in timeline
```

### Automated Testing

```typescript
// In browser console or test script
import { runTests } from './utils/testPosteriorService';
await runTests();
```

Expected output:
```
✅ Generated feature matrix: [24, 10]
✅ Backend is healthy
✅ Received hourly posterior data: 24 hours
✅ Calculated hourly risks
  Top 3 high-risk hours: 3PM (67.2%), 8PM (61.5%), 11AM (58.3%)
```

## Console Logging

When Quick Check is completed with backend connected, you'll see:

```
✅ Fetched hourly posterior from Quick Check data
   Found 24 hourly predictions
   High risk hours: 15, 20, 11
```

## Timeline Storage

Posterior data is stored in the user timeline with type `'hourly_posterior'`:

```typescript
{
  timestamp: "2025-11-15T14:30:00Z",
  type: "hourly_posterior",
  data: {
    posteriors: [ /* 24 HourlyPosterior objects */ ],
    highRiskHours: [15, 20, 11]
  }
}
```

This allows the app to display historical posterior data without re-fetching.

## Performance Considerations

- **Backend Call**: Only triggered when backend is available
- **Caching**: Stores in timeline to avoid redundant API calls
- **Fallback**: Gracefully degrades if backend unavailable
- **Async**: Non-blocking - won't freeze UI during fetch

## Error Handling

The integration includes comprehensive error handling:

1. Backend health check before API calls
2. Try-catch around all async operations
3. Console logging for debugging
4. Fallback to demo data if needed
5. Error states in hooks and components

## Future Enhancements

1. **Real-time Updates**: WebSocket for live posterior updates
2. **Personalized Features**: ML model to learn optimal features per user
3. **Confidence Intervals**: Display uncertainty in hourly predictions
4. **Intervention Suggestions**: Recommend actions for high-risk hours
5. **Historical Comparison**: Compare today's pattern to past days
6. **Smart Notifications**: Alert before high-risk hours

## Related Documentation

- `BACKEND_RISK_INTEGRATION.md` - Daily risk prediction integration
- `ALINE/docs/01_implementing_ALINE.md` - ALINE model documentation
- `src/services/featureConverter.ts` - Feature engineering details
