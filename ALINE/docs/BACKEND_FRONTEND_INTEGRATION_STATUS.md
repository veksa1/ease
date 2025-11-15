# 🔌 Backend-Frontend Integration Status

**Cloud Run Service**: `https://aline-service-hhteadf5zq-uc.a.run.app`  
**Current Frontend API URL**: `http://localhost:8000` (needs update)

---

## 📊 Integration Status Summary

| Backend Endpoint | Connected to UI | UI Component | Status |
|------------------|-----------------|--------------|--------|
| **GET /health** | ❌ No | - | Not used in UI |
| **POST /risk/daily** | ❌ No | - | **NOT CONNECTED** |
| **POST /posterior/hourly** | ❌ No | - | **NOT CONNECTED** |
| **POST /policy/topk** | ❌ No | - | **NOT CONNECTED** |
| **POST /user/calendar** | ✅ Yes | CalendarIntegration.tsx | **CONNECTED** ✓ |
| **GET /user/calendar/{id}** | ✅ Yes | CalendarIntegration.tsx | **CONNECTED** ✓ |
| **DELETE /user/calendar/{id}** | ✅ Yes | CalendarIntegration.tsx | **CONNECTED** ✓ |
| **POST /aline/generate-context** | ✅ Yes | calendarService.ts | **CONNECTED** ✓ |

---

## ✅ CONNECTED Endpoints (4/8)

### Calendar Integration Endpoints
**All working and connected to UI!**

1. **POST /user/calendar** - Save calendar connection
   - **UI Component**: `src/components/CalendarIntegration.tsx` (line 69)
   - **Service**: `src/services/calendarService.ts` (line 207-231)
   - **Used in**: Profile Screen calendar integration modal
   - **Function**: `calendarService.saveCalendarConnection()`

2. **GET /user/calendar/{user_id}** - Get calendar status
   - **UI Component**: `src/components/CalendarIntegration.tsx` (line 35)
   - **Service**: `src/services/calendarService.ts` (line 237-258)
   - **Used in**: Profile Screen to check if calendar is connected
   - **Function**: `calendarService.getCalendarStatus()`

3. **DELETE /user/calendar/{user_id}** - Delete calendar
   - **UI Component**: `src/components/CalendarIntegration.tsx` (line 79)
   - **Service**: `src/services/calendarService.ts` (line 263-270)
   - **Used in**: Profile Screen disconnect calendar button
   - **Function**: `calendarService.deleteCalendarConnection()`

4. **POST /aline/generate-context** - Generate context from calendar
   - **Service**: `src/services/calendarService.ts` (line 275-289)
   - **Function**: `calendarService.generateContext()`
   - **Ready to use**: Available but not actively called in current UI flow

---

## ❌ NOT CONNECTED Endpoints (4/8)

### Core ALINE ML Endpoints
**Backend is working, but UI is NOT using them yet!**

1. **GET /health**
   - **Status**: Backend working ✅
   - **UI Integration**: ❌ Not used
   - **Impact**: Low - health checks are optional
   - **Recommendation**: Add to app initialization for service status check

2. **POST /risk/daily** - Daily migraine risk prediction
   - **Status**: Backend working ✅ (tested, passing)
   - **UI Integration**: ❌ **NOT CONNECTED**
   - **Impact**: **HIGH** - This is a core feature!
   - **Current UI**: Uses local/mock data instead
   - **Files that SHOULD use it**:
     - `src/components/HomeScreen.tsx` (risk predictions)
     - `src/components/DiaryScreen.tsx` (daily risk display)
   - **Recommendation**: **URGENT** - Connect this endpoint

3. **POST /posterior/hourly** - Hourly posterior distributions
   - **Status**: Backend working ✅ (tested, passing)
   - **UI Integration**: ❌ **NOT CONNECTED**
   - **Impact**: **HIGH** - Core ML feature
   - **Current UI**: Not displayed
   - **Potential uses**:
     - Hourly risk breakdown visualization
     - ML confidence intervals display
   - **Recommendation**: **HIGH PRIORITY** - Add visualization

4. **POST /policy/topk** - Policy recommendations (top-k hours)
   - **Status**: Backend working ✅ (tested, passing)
   - **UI Integration**: ❌ **NOT CONNECTED**
   - **Impact**: **HIGH** - Key intelligent feature
   - **Current UI**: Not used
   - **Potential uses**:
     - Recommend best times to check in
     - Smart notification timing
     - Data collection optimization
   - **Recommendation**: **HIGH PRIORITY** - Add smart recommendations

---

## 🔧 Current API Configuration

### Frontend API URL Setting
```typescript
// src/utils/env.ts
REACT_APP_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

**Current value**: `http://localhost:8000` (local development)  
**Should be**: `https://aline-service-hhteadf5zq-uc.a.run.app` (production)

### How API Calls Work
```typescript
// src/utils/api.ts
class ApiClient {
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint); // Prepends REACT_APP_API_URL
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }
}
```

---

## 📝 What Each Service Does

### calendarService.ts
**Status**: ✅ Connected to backend
- Saves calendar ICS/WebCal URLs
- Checks calendar connection status
- Deletes calendar connections
- Generates context from calendar events
- Fetches and parses ICS calendar data

### migraineService.ts
**Status**: ❌ Local only (SQLite)
- Creates migraine reports (local storage)
- Retrieves migraine reports (local)
- NOT connected to backend ML endpoints
- **Should eventually send data to backend for predictions**

### demoDataService.ts
**Status**: ❌ Mock/demo data only
- Generates fake calendar events
- Provides sample risk scores
- **Should be replaced with real backend calls**

---

## 🚀 Action Items to Connect UI to Backend

### 1. Update Environment Variable (CRITICAL)
```bash
# Create/update .env file
VITE_API_URL=https://aline-service-hhteadf5zq-uc.a.run.app
```

### 2. Create ALINE ML Service (HIGH PRIORITY)
Create `src/services/alineService.ts`:

```typescript
import { apiClient } from '../utils/api';

interface DailyRiskRequest {
  user_id: string;
  features: number[][]; // 24 hours x 20 features
}

interface DailyRiskResponse {
  user_id: string;
  mean_probability: number;
  lower_bound: number;
  upper_bound: number;
  timestamp: string;
}

interface PolicyRequest {
  user_id: string;
  features: number[][];
  k: number;
}

interface PolicyResponse {
  user_id: string;
  selected_hours: Array<{
    hour: number;
    priority_score: number;
  }>;
  k: number;
  timestamp: string;
}

class AlineService {
  async getDailyRisk(userId: string, features: number[][]): Promise<DailyRiskResponse> {
    const response = await apiClient.post<DailyRiskResponse>(
      '/risk/daily',
      { user_id: userId, features }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }
  
  async getPolicyRecommendations(
    userId: string,
    features: number[][],
    k: number = 3
  ): Promise<PolicyResponse> {
    const response = await apiClient.post<PolicyResponse>(
      '/policy/topk',
      { user_id: userId, features, k }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data!;
  }
}

export const alineService = new AlineService();
```

### 3. Update HomeScreen to Use Real Risk Predictions
Modify `src/components/HomeScreen.tsx`:

```typescript
import { alineService } from '../services/alineService';
import { featureConverter } from '../services/featureConverter';

// In component:
useEffect(() => {
  async function fetchRiskPrediction() {
    try {
      // Convert user data to 24-hour feature matrix
      const features = await featureConverter.convertToFeatures(userData);
      
      // Get real prediction from backend
      const risk = await alineService.getDailyRisk(userId, features);
      
      setRiskLevel(risk.mean_probability);
      setConfidenceInterval({
        lower: risk.lower_bound,
        upper: risk.upper_bound
      });
    } catch (error) {
      console.error('Failed to get risk prediction:', error);
      // Fallback to demo data
    }
  }
  
  fetchRiskPrediction();
}, [userId, userData]);
```

### 4. Add Smart Recommendations Feature
Create new component for policy recommendations:

```typescript
import { alineService } from '../services/alineService';

export function SmartRecommendations({ userId, features }) {
  const [recommendations, setRecommendations] = useState([]);
  
  useEffect(() => {
    async function fetchRecommendations() {
      const policy = await alineService.getPolicyRecommendations(userId, features, 3);
      setRecommendations(policy.selected_hours);
    }
    fetchRecommendations();
  }, [userId, features]);
  
  return (
    <div>
      <h3>Best times to check in today:</h3>
      {recommendations.map(rec => (
        <div key={rec.hour}>
          Hour {rec.hour}: Priority {rec.priority_score.toFixed(2)}
        </div>
      ))}
    </div>
  );
}
```

---

## 📈 Priority Roadmap

### Phase 1: Environment Setup (IMMEDIATE)
- [ ] Update `VITE_API_URL` to Cloud Run URL
- [ ] Test calendar integration with production backend
- [ ] Verify CORS settings on backend

### Phase 2: Core ML Integration (HIGH PRIORITY)
- [ ] Create `alineService.ts` for ML endpoints
- [ ] Create `featureConverter.ts` to convert user data to feature format
- [ ] Update HomeScreen to use real risk predictions
- [ ] Add error handling and fallback to demo data

### Phase 3: Enhanced Features (MEDIUM PRIORITY)
- [ ] Add hourly posterior visualization
- [ ] Implement smart recommendations (policy/topk)
- [ ] Add ML confidence indicators in UI
- [ ] Show "Powered by ALINE ML" badges

### Phase 4: Production Polish (LOWER PRIORITY)
- [ ] Add health check on app startup
- [ ] Implement retry logic for failed requests
- [ ] Add loading states for ML predictions
- [ ] Cache predictions to reduce API calls

---

## 💡 Key Insights

### What's Working
✅ Calendar integration is fully connected and working  
✅ Backend API client infrastructure exists  
✅ All backend ML endpoints are tested and working  

### What's Missing
❌ Frontend doesn't call the ML prediction endpoints  
❌ UI uses demo/mock data instead of real predictions  
❌ No feature conversion from user data to ML format  
❌ Environment variable points to localhost instead of Cloud Run  

### The Gap
Your backend is **fully functional and deployed**, but your frontend is **not using it yet** for the core ML features. The calendar integration works because it was explicitly built, but the risk prediction features are still using mock data.

---

## 🎯 Immediate Next Step

**Update the environment variable to point to your Cloud Run service:**

```bash
# In your project root, create/update .env
VITE_API_URL=https://aline-service-hhteadf5zq-uc.a.run.app
```

Then restart your dev server:
```bash
npm run dev
```

This will make all existing `apiClient` calls use the production backend instead of localhost!

---

**Summary**: Only **4 out of 8** backend endpoints are connected to the UI. The calendar integration works perfectly, but the **core ML prediction features** (risk/daily, posterior/hourly, policy/topk) are **ready on the backend but not being called by the frontend**. You need to create the integration layer to connect them.
