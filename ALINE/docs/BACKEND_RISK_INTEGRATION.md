# Backend Risk Prediction Integration

## Overview
This document describes the integration of the ALINE backend `/risk/daily` endpoint with the frontend home screen to display real-time daily predicted migraine probability.

## Architecture

### Backend Endpoint
- **Endpoint**: `POST /risk/daily`
- **Location**: `ALINE/service/main.py`
- **Request Schema**: `DailyRiskRequest` in `ALINE/service/schemas.py`
- **Response Schema**: `DailyRiskResponse` in `ALINE/service/schemas.py`

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
  "mean_probability": 0.0-1.0,
  "lower_bound": 0.0-1.0,
  "upper_bound": 0.0-1.0,
  "timestamp": "ISO8601 string"
}
```

### Frontend Integration

#### New Files Created
1. **`src/services/riskPredictionService.ts`**
   - Service layer for communicating with backend `/risk/daily` endpoint
   - Handles API calls, error handling, and fallback logic
   - Methods:
     - `getDailyRisk(userId, features)` - Fetch prediction from backend
     - `generateMockFeatures(numFeatures)` - Generate mock data for testing
     - `checkHealth()` - Verify backend availability

#### Modified Files
1. **`src/hooks/useDemoData.ts`**
   - Updated `useRiskPrediction()` hook to fetch from backend
   - Added backend health check
   - Graceful fallback to demo data if backend unavailable
   - Returns: `{ loading, risk, bounds, updateRiskWithQuickCheck }`

2. **`src/components/HomeScreenContainer.tsx`**
   - Uses actual `risk` value from backend (0.0-1.0)
   - Converts to percentage: `riskPercentage = Math.round(risk * 100)`
   - Calculates confidence from prediction bounds width
   - Passes confidence to HomeScreen component

3. **`src/components/HomeScreen.tsx`**
   - Added optional `confidence` prop to interface
   - Displays backend-predicted risk on home screen
   - Shows confidence in RiskHeroCard component

## Data Flow

```
Backend API (ALINE/service/main.py)
    ↓
riskPredictionService.getDailyRisk()
    ↓
useRiskPrediction() hook
    ↓
HomeScreenContainer (calculates confidence & percentage)
    ↓
HomeScreen (displays risk ring & hero card)
```

## Configuration

### Environment Variables
The API URL is configured via environment variables:
- Development: `VITE_API_URL=http://localhost:8000`
- Production: Set in deployment config

Configuration file: `src/utils/env.ts`

### Backend Health Check
The integration includes automatic health checking:
- Checks `/health` endpoint before fetching predictions
- Falls back to demo data if backend unavailable
- Logs status to console for debugging

## Usage Example

The integration is automatic. When the home screen loads:

1. `HomeScreenContainer` mounts
2. `useRiskPrediction()` hook executes
3. Service checks backend health
4. If healthy: fetches real prediction from `/risk/daily`
5. If unavailable: uses demo data
6. Risk percentage and confidence displayed on home screen

## Testing

### With Backend Running
1. Start ALINE backend: `cd ALINE && uvicorn service.main:app --reload`
2. Start frontend: `npm run dev`
3. Navigate to home screen - should see real backend predictions

### Without Backend
1. Start only frontend: `npm run dev`
2. Navigate to home screen - should see demo data
3. Check console for "Using demo data" message

## Future Enhancements

1. **Real Feature Data**: Replace mock features with actual user data from:
   - Wearable devices (HRV, sleep, activity)
   - Calendar events (stress indicators)
   - Weather data
   - Self-reported metrics

2. **Caching**: Cache predictions to reduce API calls

3. **Real-time Updates**: Implement WebSocket for live risk updates

4. **Error UI**: Show user-friendly messages when backend unavailable

5. **User Authentication**: Add user ID from auth context instead of hardcoded value

## API Client Architecture

All backend communication uses the centralized API client:
- **File**: `src/utils/api.ts`
- **Usage**: `import { apiClient } from '../utils/api'`
- **Methods**: `get()`, `post()`, `put()`, `delete()`
- **Features**: Type-safe, error handling, JSON serialization

## Notes

- Current implementation uses mock features (`generateMockFeatures()`)
- Production deployment requires real user feature pipeline
- Backend must be running on configured API URL
- CORS must be enabled on backend for local development
