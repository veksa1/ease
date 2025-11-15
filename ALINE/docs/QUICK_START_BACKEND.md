# Quick Start Guide - Backend Integration

## Current Status

✅ **Frontend Integration Complete**
- Daily risk prediction connected to `/risk/daily`
- Quick Check connected to `/posterior/hourly`
- Automatic fallback to demo data when backend unavailable

⚠️ **Backend Not Running**
- Console shows: "Using demo data (backend unavailable or disabled)"
- Need to start ALINE backend service

## Starting the Backend

### Option 1: Quick Start (Recommended)

```powershell
# Terminal 1: Start ALINE Backend
cd ALINE
uvicorn service.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Frontend (keep existing terminal)
# Already running on localhost:3000
```

### Option 2: With Virtual Environment

```powershell
# Terminal 1: Create and activate venv (first time only)
cd ALINE
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies (first time only)
pip install -r requirements.txt

# Start backend
uvicorn service.main:app --reload --host 0.0.0.0 --port 8000
```

## Verifying the Connection

Once the backend is running, you should see in the browser console:

✅ **Success:**
```
✅ Fetched hourly posterior from Quick Check data
   Found 24 hourly predictions
   High risk hours: 15, 20, 11
```

❌ **Before (no backend):**
```
Using demo data (backend unavailable or disabled)
```

## Testing the Integration

### 1. Daily Risk Prediction (Home Screen)

- Navigate to home screen
- The risk percentage should come from backend
- Console will show backend connection status

### 2. Quick Check → Hourly Posterior

1. Click "Quick Check" button
2. Complete the quiz:
   - Caffeine: "Some"
   - Water: "Medium"
   - Food: 7/10
3. Click "Complete"
4. Check console for:
   ```
   ✅ Fetched hourly posterior from Quick Check data
      Found 24 hourly predictions
      High risk hours: [array of hours]
   ```

### 3. API Health Check

Open in browser or curl:
```
http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "model_loaded": true
}
```

## Troubleshooting

### Backend Won't Start

**Error: "ModuleNotFoundError: No module named 'fastapi'"**
```powershell
cd ALINE
pip install -r requirements.txt
```

**Error: "No module named 'uvicorn'"**
```powershell
pip install uvicorn
```

**Error: "Port 8000 already in use"**
```powershell
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
uvicorn service.main:app --reload --port 8001

# Update .env file:
REACT_APP_API_URL=http://localhost:8001
```

### Backend Running but Frontend Can't Connect

**Check CORS settings:**
Backend should allow `http://localhost:3000`. Check `ALINE/service/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Check API URL:**
Verify `.env` file has:
```
REACT_APP_API_URL=http://localhost:8000
```

### Database Table Error

**Error: "no such table: soothemode_sessions"**

This is now fixed. The database will auto-create the schema on next page refresh.

Clear IndexedDB if issues persist:
1. Open DevTools (F12)
2. Application tab
3. IndexedDB → ease_app_db → Delete
4. Refresh page

## Files Modified

### Backend Integration Files
- `src/services/riskPredictionService.ts` - Daily risk API client
- `src/services/posteriorService.ts` - Hourly posterior API client
- `src/services/featureConverter.ts` - Quick Check to features
- `src/hooks/useDemoData.ts` - Enhanced with backend calls
- `src/hooks/useHourlyPosterior.ts` - Hourly risk data hook
- `src/components/HomeScreenContainer.tsx` - Uses real backend data
- `src/components/HourlyRiskChart.tsx` - Visualize hourly risks
- `src/App.tsx` - Async Quick Check handler

### Database Fix
- `src/services/sqliteService.ts` - Always create schema on init

## Next Steps

1. **Start Backend** (see Option 1 above)
2. **Test Daily Risk** - Check home screen risk percentage
3. **Test Quick Check** - Complete quiz and check console
4. **View Hourly Data** - Add `<HourlyRiskChart />` to any screen

## Documentation

- `BACKEND_RISK_INTEGRATION.md` - Daily risk endpoint details
- `QUICKCHECK_POSTERIOR_INTEGRATION.md` - Quick Check to posterior details
- `ALINE/docs/01_implementing_ALINE.md` - ALINE model documentation
